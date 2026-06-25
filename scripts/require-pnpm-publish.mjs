const execPath = process.env.npm_execpath ?? ''
const userAgent = process.env.npm_config_user_agent ?? ''

const isPnpm = /\bpnpm\//.test(userAgent) || /[/\\]pnpm(?:\.cjs)?$/.test(execPath)

if (!isPnpm) {
  console.error(
    'Publish contentbit packages with pnpm, not npm, so workspace: dependencies are rewritten before publish.',
  )
  process.exit(1)
}
