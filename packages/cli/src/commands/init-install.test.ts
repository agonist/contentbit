import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'

import { initCommand } from './init'

vi.mock('@contentbit/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@contentbit/core')>()),
  VERSION: '1.0.0-rc.0',
}))

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawn: vi.fn(() => {
    const child = new EventEmitter()
    queueMicrotask(() => child.emit('close', 0))
    return child
  }),
}))

afterEach(() => vi.clearAllMocks())

test.each(['react', 'astro', 'markdown'])(
  'init installs matching RC packages for the %s target',
  async (target) => {
    const cwd = await mkdtemp(join(tmpdir(), 'cb-init-install-'))
    try {
      await writeFile(join(cwd, 'package.json'), JSON.stringify({ name: 'rc-consumer' }))
      await writeFile(join(cwd, 'pnpm-lock.yaml'), '')
      const code = await initCommand(
        { cwd, target, yes: true, noAgents: true, noStyled: true },
        { stdout: () => {}, stderr: () => {}, writeFile },
      )
      expect(code).toBe(0)
      const renderer = target === 'markdown' ? [] : [`@contentbit/${target}@1.0.0-rc.0`]
      const prose = target === 'react' ? ['react-markdown'] : []
      expect(spawn).toHaveBeenNthCalledWith(
        1,
        'pnpm',
        [
          'add',
          '@contentbit/core@1.0.0-rc.0',
          '@contentbit/blocks@1.0.0-rc.0',
          'zod',
          ...renderer,
          ...prose,
        ],
        expect.objectContaining({ cwd }),
      )
      expect(spawn).toHaveBeenNthCalledWith(
        2,
        'pnpm',
        ['add', '-D', 'contentbit@1.0.0-rc.0', '@contentbit/studio@1.0.0-rc.0'],
        expect.objectContaining({ cwd }),
      )
      expect(spawn).toHaveBeenCalledTimes(2)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  },
)
