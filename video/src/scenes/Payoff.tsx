import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { ContentBlocks } from '@contentbit/react'
import { AbsoluteFill } from 'remotion'
import { GlyphField } from '../lib/glyphs'
import { renderMd, videoComponents } from '../lib/blocks'
import { C } from '../lib/theme'
import { Eyebrow, Punch, Rise } from '../lib/ui'

/*
 * Scene 4: the payoff. This is not a mockup — the document below is parsed
 * and validated by @contentbit/core and rendered by @contentbit/react,
 * frame by frame, inside the video.
 */

const SOURCE = `:::key-metrics
- 65% | Hydration
- 24h | Cold ferment
- 2min | Bake time
:::

:::callout{type="tip" title="Same source, every target"}
React, Astro, or plain Markdown. **The content is a protocol.**
:::

:::steps
1. Generate with the guide from your registry
2. Validate, repair, repeat until clean
3. Ship content that **cannot break**
:::`

const registry = createBlockRegistry().use(genericBlocks())
const result = validateDocument(parseDocument(SOURCE), registry)

export function Payoff() {
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <GlyphField opacity={0.5} from={545} />
      <div style={{ width: 1000 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Punch at={0} size={72}>
            <div>Markdown in.</div>
            <div style={{ color: C.emerald }}>Components out.</div>
          </Punch>
        </div>
        <div style={{ marginBottom: 34, display: 'flex', justifyContent: 'center' }}>
          <Rise at={8}>
            <Eyebrow index="03">rendered by @contentbit/react, in this video</Eyebrow>
          </Rise>
        </div>
        <ContentBlocks
          document={result.document}
          components={videoComponents}
          renderMarkdown={(md) => <>{renderMd(md)}</>}
        />
      </div>
    </AbsoluteFill>
  )
}
