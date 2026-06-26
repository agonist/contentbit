#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'

import { run } from './run.js'

const code = await run(process.argv.slice(2), {
  stdout: (s: string) => console.log(s),
  stderr: (s: string) => console.error(s),
  writeFile: (path: string, content: string) => writeFile(path, content, 'utf8'),
})
process.exitCode = code
