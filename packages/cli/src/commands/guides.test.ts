import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

test('instructions emits the LLM authoring guide', async () => {
  const io = fakeIo()
  expect(await run(['instructions'], io)).toBe(0)
  const out = io.out.join('\n')
  expect(out).toContain('never invent block names')
  expect(out).toContain('## callout')
  expect(out).toContain('## faq')
})

test('instructions --no-examples drops the example sections', async () => {
  const io = fakeIo()
  expect(await run(['instructions', '--no-examples'], io)).toBe(0)
  expect(io.out.join('\n')).not.toContain('```md')
})

test('docs emits the human reference without the LLM preamble', async () => {
  const io = fakeIo()
  expect(await run(['docs'], io)).toBe(0)
  const out = io.out.join('\n')
  expect(out).toContain('## comparison')
  expect(out).not.toContain('never invent block names')
})

test('--out writes to a file', async () => {
  const writes: Array<{ path: string }> = []
  const io = { ...fakeIo(), writeFile: async (path: string) => void writes.push({ path }) }
  expect(await run(['instructions', '--out', 'guide.md'], io)).toBe(0)
  expect(writes[0].path).toBe('guide.md')
})
