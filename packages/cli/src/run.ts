export interface Io {
  stdout(line: string): void
  stderr(line: string): void
  writeFile(path: string, content: string): Promise<void>
}

export const USAGE = `Usage: contentbit <validate|render|instructions|docs> [options]

  validate <globs...> [--registry <module.mjs>] [--strict-warnings]
  render <file> --target html|markdown [--registry <module.mjs>] [--out <file>]
  instructions [--audience llm|human] [--no-examples] [--registry <module.mjs>] [--out <file>]
  docs [--registry <module.mjs>] [--out <file>]`

type Command = (args: string[], io: Io) => Promise<number>

const commands: Record<string, () => Promise<Command>> = {
  validate: async () => (await import('./commands/validate.js')).validateCommand,
  render: async () => (await import('./commands/render.js')).renderCommand,
  instructions: async () => (await import('./commands/instructions.js')).instructionsCommand,
  docs: async () => (await import('./commands/docs.js')).docsCommand,
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
    io.stderr(`contentbit ${name}: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}
