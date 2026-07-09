import { Command, CommanderError, type OptionValues } from 'commander'

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
  agents [--claude] [--no-agents-md]

Common:
  validate <globs...> [--registry <module.ts>] [--no-generic-blocks] [--strict-warnings] [--link-resolve <mode>]
  brief <key-or-slug> [globs...] [--registry <module.ts>] [--no-generic-blocks] [--seo-config <module.ts>] [--json]
  doctor <globs...> [--registry <module.ts>] [--no-generic-blocks] [--strict-warnings] [--strict-seo] [--seo-config <module.ts>] [--no-seo] [--json] [--min-section-words <n>] [--link-resolve <mode>]
  studio <globs...> [--registry <module.ts>] [--port <n>] [--host <host>] [--no-open] [--no-generic-blocks] [--seo-config <module.ts>] [--no-seo] [--link-resolve <mode>]
  stats <globs...> [--registry <module.ts>] [--no-generic-blocks] [--no-validate]
  render <file> [--target markdown] [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  instructions [--audience llm|human] [--no-examples] [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  docs [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  links <globs...> [--fix] [--out <file>] [--link-resolve <mode>]`

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
      return err.code === 'commander.unknownCommand' ? 2 : 1
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
    .option('-t, --target <target>')
    .option('--md <library>')
    .option('-y, --yes')
    .option('--cwd <path>')
    .option('--no-install')
    .option('--no-page')
    .option('--no-styled')
    .option('--no-agents')
    .option('--seo')
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
    .argument('[globs...]')
    .option('--registry <module>')
    .option('--no-generic-blocks')
    .option('--strict-warnings')
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
    .argument('[globs...]')
    .option('--registry <module>')
    .option('--no-generic-blocks')
    .option('--strict-warnings')
    .option('--strict-seo')
    .option('--json')
    .option('--min-section-words <n>')
    .option('--seo-config <module>')
    .option('--no-seo')
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
          noSeo: options.seo === false,
          ...linkOptionsFrom(options),
        },
        io,
      ),
    )
  })

  const brief = program
    .command('brief')
    .description('print an agent-ready SEO brief')
    .argument('<key-or-slug>')
    .argument('[globs...]')
    .option('--registry <module>')
    .option('--no-generic-blocks')
    .option('--seo-config <module>')
    .option('--json')
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
    .argument('[globs...]')
    .option('--registry <module>')
    .option('--port <n>')
    .option('--host <host>')
    .option('--no-open')
    .option('--no-generic-blocks')
    .option('--min-section-words <n>')
    .option('--seo-config <module>')
    .option('--no-seo')
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
          noSeo: options.seo === false,
          ...linkOptionsFrom(options),
        },
        io,
      ),
    )
  })

  program
    .command('stats')
    .description('print document stats as JSON')
    .argument('[globs...]')
    .option('--registry <module>')
    .option('--no-generic-blocks')
    .option('--no-validate')
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
    .argument('[file]')
    .option('--target <target>', undefined, 'markdown')
    .option('--registry <module>')
    .option('--no-generic-blocks')
    .option('--out <file>')
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
    .option('--audience <audience>', undefined, 'llm')
    .option('--no-examples')
    .option('--registry <module>')
    .option('--no-generic-blocks')
    .option('--out <file>')
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
    .option('--registry <module>')
    .option('--no-generic-blocks')
    .option('--out <file>')
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
    .option('--no-agents-md', 'skip writing the AGENTS.md contentbit block')
    .option('--cwd <path>', 'install guidance in another directory')
    .action(async (rawOptions: Command | OptionValues) => {
      const options = optionsFrom(rawOptions)
      const { agentsCommand } = await import('./commands/agents.js')
      setExitCode(
        await agentsCommand(
          {
            claude: Boolean(options.claude),
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
    .argument('[globs...]')
    .option('--fix')
    .option('--out <file>')
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
    .option('--link-resolve <mode>')
    .option('--locale-field <name>')
    .option('--slug-field <name>')
    .option('--key-field <name>')
    .option('--default-locale <locale>')
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
