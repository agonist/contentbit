import { Command, CommanderError, Option, type OptionValues } from 'commander'

import { color, section } from './cli-format.js'

export interface Io {
  stdout(line: string): void
  stderr(line: string): void
  writeFile(path: string, content: string): Promise<void>
}

/**
 * A command-input failure with a chosen exit code and a ready-to-print message
 * (e.g. no positionals, no files matched). `run()` prints the plain message and
 * returns `exitCode`; any other throw is treated as an unexpected crash.
 */
export class CliError extends Error {
  constructor(
    readonly exitCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'CliError'
  }
}

export const USAGE = `contentbit

Usage:
  contentbit <command> [options]

Commands:
  init          scaffold Content Blocks into a project
  validate      check Markdown blocks and internal links
  brief         print an agent-ready SEO brief
  doctor        inspect content health and repair suggestions
  studio        browse content locally
  stats         print document stats as JSON
  render        render one file to plain Markdown
  instructions  print LLM authoring instructions
  docs          print human authoring docs
  agents        install coding-agent guidance
  links         build or fix the internal link index

Setup:
  init [-t react|markdown|astro] [--md ...] [-y] [--seo] [--no-install] [--no-page] [--no-agents]
  agents [--claude] [--check|--dry-run] [--no-agents-md]

Common:
  validate [globs...] [--registry <module.ts>] [--no-generic-blocks] [--strict-warnings] [--link-resolve <mode>]
  brief <key-or-slug> [globs...] [--registry <module.ts>] [--no-generic-blocks] [--seo-config <module.ts>] [--json]
  doctor [globs...] [--registry <module.ts>] [--no-generic-blocks] [--strict-warnings] [--strict-seo] [--seo-config <module.ts>] [--no-seo] [--json] [--min-section-words <n>] [--link-resolve <mode>]
  studio [globs...] [--registry <module.ts>] [--port <n>] [--host <host>] [--no-open] [--no-generic-blocks] [--seo-config <module.ts>] [--no-seo] [--link-resolve <mode>]
  stats <globs...> [--registry <module.ts>] [--no-generic-blocks] [--no-validate]
  render <file> [--target markdown] [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  instructions [--audience llm|human] [--no-examples] [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  docs [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  links [globs...] [--fix] [--out <file>] [--link-resolve <mode>]`

export async function run(argv: string[], io: Io): Promise<number> {
  const name = argv[0]
  if (!name) {
    io.stderr(USAGE)
    return 2
  }
  let exitCode = 0
  const program = createProgram(io, (code) => {
    exitCode = code
  })
  try {
    await program.parseAsync(argv, { from: 'user' })
    return exitCode
  } catch (err) {
    if (err instanceof CliError) {
      io.stderr(err.message)
      return err.exitCode
    }
    if (err instanceof CommanderError) {
      if (err.code === 'commander.helpDisplayed') return 0
      io.stderr(
        [
          section(`contentbit ${commandNameForError(argv)}`),
          `  ${color('error', 'error')} ${stripCommanderError(err.message)}`,
        ].join('\n'),
      )
      return err.code === 'commander.unknownCommand' || err.code === 'commander.invalidArgument'
        ? 2
        : 1
    }
    io.stderr(
      [
        section(`contentbit ${commandNameForError(argv)}`),
        `  ${color('error', 'error')} ${err instanceof Error ? err.message : String(err)}`,
      ].join('\n'),
    )
    return 1
  }
}

type SetExitCode = (code: number) => void

function createProgram(io: Io, setExitCode: SetExitCode): Command {
  const program = new Command()
    .name('contentbit')
    .description('Structured Markdown components for LLM-written content.')
    .exitOverride((err) => {
      throw err
    })
    .configureOutput({
      writeOut: (str) => io.stdout(str.trimEnd()),
      writeErr: () => {},
      outputError: () => {},
    })

  program
    .command('init')
    .description('scaffold Content Blocks into a project')
    .addOption(
      new Option('-t, --target <target>', 'Render adapter to scaffold').choices([
        'react',
        'markdown',
        'astro',
      ]),
    )
    .addOption(
      new Option('--md <library>', 'Markdown prose adapter to wire').choices([
        'react-markdown',
        'none',
      ]),
    )
    .option('-y, --yes', 'Accept detected defaults without prompting')
    .option('--cwd <path>', 'Project directory to initialize')
    .option('--no-install', 'Scaffold files without installing packages')
    .option('--no-page', 'Skip the example route or page')
    .option('--no-styled', 'Skip installing the editable styled block pack')
    .option('--no-agents', 'Skip AGENTS.md and Claude Code guidance')
    .option('--seo', 'Scaffold SEO contracts and connect them in project config')
    .action(async (rawOptions: Command | OptionValues) => {
      const options = optionsFrom(rawOptions)
      const { initCommand } = await import('./commands/init.js')
      setExitCode(
        await initCommand(
          {
            target: options.target,
            md: options.md,
            yes: Boolean(options.yes),
            cwd: options.cwd,
            noInstall: options.install === false,
            noPage: options.page === false,
            noStyled: options.styled === false,
            noAgents: options.agents === false,
            seo: Boolean(options.seo),
          },
          io,
        ),
      )
    })

  const validate = program
    .command('validate')
    .description('check Markdown blocks and internal links')
    .argument('[globs...]', 'Content files or quoted globs; defaults to project config')
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--no-generic-blocks', 'Do not include the built-in generic block pack')
    .option('--strict-warnings', 'Exit 1 when validation warnings are present')
  addLinkOptions(validate)
  validate.action(async (globs: string[], rawOptions: Command | OptionValues) => {
    const options = optionsFrom(rawOptions)
    const { validateCommand } = await import('./commands/validate.js')
    setExitCode(
      await validateCommand(
        {
          globs,
          registry: options.registry,
          noGenericBlocks: options.genericBlocks === false,
          strictWarnings: Boolean(options.strictWarnings),
          ...linkOptionsFrom(options),
        },
        io,
      ),
    )
  })

  const doctor = program
    .command('doctor')
    .description('inspect content health and repair suggestions')
    .argument('[globs...]', 'Content files or quoted globs; defaults to project config')
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--no-generic-blocks', 'Do not include the built-in generic block pack')
    .option('--strict-warnings', 'Exit 1 when validation warnings are present')
    .option('--strict-seo', 'Treat required SEO findings as errors')
    .option('--json', 'Print stable machine-readable JSON')
    .option('--min-section-words <n>', 'Set the thin-section suggestion threshold')
    .option('--seo-config <module>', 'Load SEO contracts from this module')
    .option('--no-seo', 'Disable SEO config discovery and findings')
  addLinkOptions(doctor)
  doctor.action(async (globs: string[], rawOptions: Command | OptionValues) => {
    const options = optionsFrom(rawOptions)
    const { doctorCommand } = await import('./commands/doctor.js')
    setExitCode(
      await doctorCommand(
        {
          globs,
          registry: options.registry,
          noGenericBlocks: options.genericBlocks === false,
          strictWarnings: Boolean(options.strictWarnings),
          strictSeo: Boolean(options.strictSeo),
          json: Boolean(options.json),
          minSectionWords: options.minSectionWords,
          seoConfig: options.seoConfig,
          noSeo: options.seo === false ? true : undefined,
          ...linkOptionsFrom(options),
        },
        io,
      ),
    )
  })

  const brief = program
    .command('brief')
    .description('print an agent-ready SEO brief')
    .argument('<key-or-slug>', 'Configured page key or existing content slug')
    .argument('[globs...]', 'Content files or quoted globs; defaults to project config')
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--no-generic-blocks', 'Do not include the built-in generic block pack')
    .option('--seo-config <module>', 'Load SEO contracts from this module')
    .option('--json', 'Print stable machine-readable JSON')
  addLinkOptions(brief)
  brief.action(async (target: string, globs: string[], rawOptions: Command | OptionValues) => {
    const options = optionsFrom(rawOptions)
    const { briefCommand } = await import('./commands/brief.js')
    setExitCode(
      await briefCommand(
        {
          target,
          globs,
          registry: options.registry,
          noGenericBlocks: options.genericBlocks === false,
          seoConfig: options.seoConfig,
          json: Boolean(options.json),
          ...linkOptionsFrom(options),
        },
        io,
      ),
    )
  })

  const studio = program
    .command('studio')
    .description('browse content locally')
    .argument('[globs...]', 'Content files or quoted globs; defaults to project config')
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--port <n>', 'First local port to try; defaults to 4377')
    .option('--host <host>', 'Host interface to bind; defaults to 127.0.0.1')
    .option('--no-open', 'Do not open Studio in the default browser')
    .option('--no-generic-blocks', 'Do not include generic blocks or previews')
    .option('--min-section-words <n>', 'Set the thin-section suggestion threshold')
    .option('--seo-config <module>', 'Load SEO contracts from this module')
    .option('--no-seo', 'Disable SEO config discovery and findings')
  addLinkOptions(studio)
  studio.action(async (globs: string[], rawOptions: Command | OptionValues) => {
    const options = optionsFrom(rawOptions)
    const { studioCommand } = await import('./commands/studio.js')
    setExitCode(
      await studioCommand(
        {
          globs,
          registry: options.registry,
          port: options.port,
          host: options.host,
          noOpen: options.open === false,
          noGenericBlocks: options.genericBlocks === false,
          minSectionWords: options.minSectionWords,
          seoConfig: options.seoConfig,
          noSeo: options.seo === false ? true : undefined,
          ...linkOptionsFrom(options),
        },
        io,
      ),
    )
  })

  program
    .command('stats')
    .description('print document stats as JSON')
    .argument('[globs...]', 'Content files or quoted globs; defaults to project config')
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--no-generic-blocks', 'Do not include the built-in generic block pack')
    .option('--no-validate', 'Analyze Markdown without loading or validating blocks')
    .action(async (globs: string[], rawOptions: Command | OptionValues) => {
      const options = optionsFrom(rawOptions)
      const { statsCommand } = await import('./commands/stats.js')
      setExitCode(
        await statsCommand(
          {
            globs,
            registry: options.registry,
            noGenericBlocks: options.genericBlocks === false,
            noValidate: options.validate === false,
          },
          io,
        ),
      )
    })

  program
    .command('render')
    .description('render one file to plain Markdown')
    .argument('[file]', 'One source Markdown file')
    .addOption(
      new Option('--target <target>', 'Output adapter').choices(['markdown']).default('markdown'),
    )
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--no-generic-blocks', 'Do not include the built-in generic block pack')
    .option('--out <file>', 'Write output to a file instead of stdout')
    .action(async (file: string | undefined, rawOptions: Command | OptionValues) => {
      const options = optionsFrom(rawOptions)
      const { renderCommand } = await import('./commands/render.js')
      setExitCode(
        await renderCommand(
          {
            file,
            target: options.target,
            registry: options.registry,
            noGenericBlocks: options.genericBlocks === false,
            out: options.out,
          },
          io,
        ),
      )
    })

  program
    .command('instructions')
    .description('print LLM authoring instructions')
    .addOption(
      new Option('--audience <audience>', 'Guide style').choices(['llm', 'human']).default('llm'),
    )
    .option('--no-examples', 'Omit block syntax examples')
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--no-generic-blocks', 'Do not include the built-in generic block pack')
    .option('--out <file>', 'Write the guide to a file instead of stdout')
    .action(async (rawOptions: Command | OptionValues) => {
      const options = optionsFrom(rawOptions)
      const { instructionsCommand } = await import('./commands/instructions.js')
      setExitCode(
        await instructionsCommand(
          {
            audience: options.audience,
            noExamples: options.examples === false,
            registry: options.registry,
            noGenericBlocks: options.genericBlocks === false,
            out: options.out,
          },
          io,
        ),
      )
    })

  program
    .command('docs')
    .description('print human authoring docs')
    .option('--registry <module>', 'Load custom block definitions from this module')
    .option('--no-generic-blocks', 'Do not include the built-in generic block pack')
    .option('--out <file>', 'Write the guide to a file instead of stdout')
    .action(async (rawOptions: Command | OptionValues) => {
      const options = optionsFrom(rawOptions)
      const { docsCommand } = await import('./commands/docs.js')
      setExitCode(
        await docsCommand(
          {
            registry: options.registry,
            noGenericBlocks: options.genericBlocks === false,
            out: options.out,
          },
          io,
        ),
      )
    })

  program
    .command('agents')
    .description('install coding-agent guidance')
    .option('--claude', 'create .claude/ if needed and install Claude Code skills')
    .option('--check', 'show agent integration status without writing files')
    .option('--dry-run', 'alias for --check')
    .option('--no-agents-md', 'skip writing the AGENTS.md contentbit block')
    .option('--cwd <path>', 'install guidance in another directory')
    .action(async (rawOptions: Command | OptionValues) => {
      const options = optionsFrom(rawOptions)
      const { agentsCommand } = await import('./commands/agents.js')
      setExitCode(
        await agentsCommand(
          {
            claude: Boolean(options.claude),
            check: Boolean(options.check || options.dryRun),
            noAgentsMd: options.agentsMd === false,
            cwd: options.cwd,
          },
          io,
        ),
      )
    })

  const links = program
    .command('links')
    .description('build or fix the internal link index')
    .argument('[globs...]', 'Content files or quoted globs; defaults to project config')
    .option('--fix', 'Rewrite references that still use known aliases')
    .option('--out <file>', 'Write the link index to a custom path')
  addLinkOptions(links)
  links.action(async (globs: string[], rawOptions: Command | OptionValues) => {
    const options = optionsFrom(rawOptions)
    const { linksCommand } = await import('./commands/links.js')
    setExitCode(
      await linksCommand(
        {
          globs,
          fix: Boolean(options.fix),
          out: options.out,
          ...linkOptionsFrom(options),
        },
        io,
      ),
    )
  })

  return program
}

function optionsFrom(raw: Command | OptionValues): OptionValues {
  return typeof (raw as Command).opts === 'function'
    ? (raw as Command).opts()
    : (raw as OptionValues)
}

function addLinkOptions(command: Command): void {
  command
    .addOption(
      new Option('--link-resolve <mode>', 'Internal-link identity strategy').choices([
        'global-slug',
        'same-locale-slug',
        'same-locale-key',
        'prefer-same-locale-key-fallback-slug',
      ]),
    )
    .option('--locale-field <name>', 'Frontmatter field containing the locale')
    .option('--slug-field <name>', 'Frontmatter field containing the page slug')
    .option('--key-field <name>', 'Frontmatter field containing the stable page key')
    .option('--default-locale <locale>', 'Locale assumed when frontmatter omits one')
}

function linkOptionsFrom(options: OptionValues): {
  linkResolve?: string
  localeField?: string
  slugField?: string
  keyField?: string
  defaultLocale?: string
} {
  return {
    linkResolve: options.linkResolve,
    localeField: options.localeField,
    slugField: options.slugField,
    keyField: options.keyField,
    defaultLocale: options.defaultLocale,
  }
}

function commandNameForError(argv: string[]): string {
  const name = argv[0]
  return name && !name.startsWith('-') ? name : ''
}

function stripCommanderError(message: string): string {
  const stripped = message.replace(/^error:\s*/i, '')
  return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : stripped
}
