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
  doctor        inspect content health and repair suggestions
  studio        browse content locally
  stats         print document stats as JSON
  render        render one file to plain Markdown
  instructions  print LLM authoring instructions
  docs          print human authoring docs
  agents        install coding-agent guidance
  links         build or fix the internal link index

Setup:
  init [-t react|markdown|astro] [--md ...] [-y] [--no-install] [--no-page] [--no-agents]
  agents [--claude] [--no-agents-md]

Common:
  validate <globs...> [--registry <module.ts>] [--no-generic-blocks] [--strict-warnings] [--link-resolve <mode>]
  doctor <globs...> [--registry <module.ts>] [--no-generic-blocks] [--strict-warnings] [--json] [--min-section-words <n>] [--link-resolve <mode>]
  studio <globs...> [--registry <module.ts>] [--port <n>] [--host <host>] [--no-open] [--no-generic-blocks] [--link-resolve <mode>]
  stats <globs...> [--registry <module.ts>] [--no-generic-blocks] [--no-validate]
  render <file> [--target markdown] [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  instructions [--audience llm|human] [--no-examples] [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  docs [--registry <module.ts>] [--no-generic-blocks] [--out <file>]
  links <globs...> [--fix] [--out <file>] [--link-resolve <mode>]`

type Command = (args: string[], io: Io) => Promise<number>

const commands: Record<string, () => Promise<Command>> = {
  init: async () => (await import('./commands/init.js')).initCommand,
  validate: async () => (await import('./commands/validate.js')).validateCommand,
  doctor: async () => (await import('./commands/doctor.js')).doctorCommand,
  studio: async () => (await import('./commands/studio.js')).studioCommand,
  stats: async () => (await import('./commands/stats.js')).statsCommand,
  render: async () => (await import('./commands/render.js')).renderCommand,
  instructions: async () => (await import('./commands/instructions.js')).instructionsCommand,
  docs: async () => (await import('./commands/docs.js')).docsCommand,
  agents: async () => (await import('./commands/agents.js')).agentsCommand,
  links: async () => (await import('./commands/links.js')).linksCommand,
}

export async function run(argv: string[], io: Io): Promise<number> {
  const [name, ...rest] = argv
  const loader = name ? commands[name] : undefined
  if (!loader) {
    io.stderr(USAGE)
    return 2
  }
  try {
    const command = await loader()
    return await command(rest, io)
  } catch (err) {
    if (err instanceof CliError) {
      io.stderr(err.message)
      return err.exitCode
    }
    io.stderr(
      [
        section(`contentbit ${name}`),
        `  ${color('error', 'error')} ${err instanceof Error ? err.message : String(err)}`,
      ].join('\n'),
    )
    return 1
  }
}
