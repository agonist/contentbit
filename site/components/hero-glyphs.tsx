'use client'

import { useEffect, useRef } from 'react'

/*
 * "Structure out of chaos" — the hero backdrop is a field of mutating noise
 * glyphs (raw LLM output) that resolve into real Content Blocks source near
 * a focus point: ambient drift by default, the cursor when the reader moves.
 * Resolved syntax lines tint emerald — valid under your eyes.
 */

const ENTROPY = ':|{}-=".a~e*r+t%n?o/s<i>'

// The structure the noise resolves into — real block source, tiled.
const TARGET_LINES = [
  ':::comparison{left="Basic" right="Pro"}',
  '- Price | Free | $12/mo',
  '- Support | Community | Priority',
  ':::',
  '',
  ':::callout{type="tip" title="Worth knowing"}',
  'Validated before it ever renders.',
  ':::',
  '',
  ':::key-metrics',
  '- 42% | Conversion lift',
  '- 18ms | Median parse time',
  ':::',
  '',
]

const CELL_W = 11
const CELL_H = 20
const FONT_SIZE = 12
const RADIUS = 170

interface Palette {
  entropy: string
  body: string
  syntax: string
}

const LIGHT: Palette = {
  entropy: 'oklch(0.87 0 0)',
  body: 'oklch(0.45 0 0)',
  syntax: 'oklch(0.55 0.13 162)',
}

const DARK: Palette = {
  entropy: 'oklch(0.31 0 0)',
  body: 'oklch(0.78 0 0)',
  syntax: 'oklch(0.74 0.15 162)',
}

export function HeroGlyphs() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const section = canvas.parentElement
    const ctx = canvas.getContext('2d')
    if (!ctx || !section) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let running = true
    let cols = 0
    let rows = 0
    // Per-cell: entropy glyph index and resolve progress 0..1.
    let chars: number[] = []
    let resolve: Float32Array = new Float32Array(0)

    let palette = document.documentElement.classList.contains('dark') ? DARK : LIGHT
    const themeObserver = new MutationObserver(() => {
      palette = document.documentElement.classList.contains('dark') ? DARK : LIGHT
      if (reducedMotion) draw()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const pointer = { x: -1, y: -1, lastMove: 0 }

    function resize() {
      if (!canvas || !ctx || !section) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { width, height } = section.getBoundingClientRect()
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const font = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-mono')
      ctx.font = `${FONT_SIZE}px ${font.trim() || 'monospace'}`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      cols = Math.ceil(width / CELL_W)
      rows = Math.ceil(height / CELL_H)
      const n = cols * rows
      chars = Array.from({ length: n }, () => Math.floor(Math.random() * ENTROPY.length))
      const prev = resolve
      resolve = new Float32Array(n)
      resolve.set(prev.subarray(0, Math.min(prev.length, n)))
      if (reducedMotion) draw()
    }

    function targetChar(row: number, col: number): string {
      const line = TARGET_LINES[row % TARGET_LINES.length]
      if (line.length === 0) return ' '
      return line[col % (line.length + 4)] ?? ' ' // +4 cols of gap between tiles
    }

    // Deterministic sparsity — most cells stay empty so the field breathes.
    function isVisible(row: number, col: number): boolean {
      const h = Math.sin(row * 127.1 + col * 311.7) * 43758.5453
      return h - Math.floor(h) < 0.35
    }

    function focusPoint(now: number): { x: number; y: number } {
      // Cursor wins for 2.5s after movement, then ambient drift takes over.
      if (now - pointer.lastMove < 2500 && pointer.x >= 0) return pointer
      const w = (canvas?.clientWidth ?? 0) / 2
      const h = (canvas?.clientHeight ?? 0) / 2
      const t = now / 9000
      return {
        x: w + Math.sin(t) * w * 0.55,
        y: h * 0.9 + Math.sin(t * 1.7 + 1) * h * 0.5,
      }
    }

    function draw(now = 0) {
      if (!canvas || !ctx) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      ctx.clearRect(0, 0, width, height)
      const focus = reducedMotion ? { x: width / 2, y: height * 0.35 } : focusPoint(now)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col
          const x = col * CELL_W + CELL_W / 2
          const y = row * CELL_H + CELL_H / 2

          // Ease resolve toward 1 inside the focus radius, back to 0 outside.
          const dist = Math.hypot(x - focus.x, y - focus.y)
          const inside = dist < RADIUS ? 1 - (dist / RADIUS) ** 2 : 0
          if (reducedMotion) resolve[i] = inside
          else resolve[i] += (inside - resolve[i]) * 0.07

          const t = resolve[i]

          // Occasionally mutate the noise so the field feels alive.
          if (!reducedMotion && Math.random() < 0.004) {
            chars[i] = Math.floor(Math.random() * ENTROPY.length)
          }

          const sparse = isVisible(row, col)

          if (t < 0.04) {
            if (sparse) {
              ctx.fillStyle = palette.entropy
              ctx.fillText(ENTROPY[chars[i]], x, y)
            }
            continue
          }

          const target = targetChar(row, col)
          if (target === ' ') {
            // Structure includes whitespace — entropy fades out, nothing replaces it.
            if (sparse && t < 0.96) {
              ctx.globalAlpha = 1 - t
              ctx.fillStyle = palette.entropy
              ctx.fillText(ENTROPY[chars[i]], x, y)
              ctx.globalAlpha = 1
            }
            continue
          }

          const line = TARGET_LINES[row % TARGET_LINES.length]
          const isSyntax = line.startsWith(':::') || line.startsWith('::')
          // Sparse cells fade up from their resting state; hidden ones fade in from zero.
          ctx.globalAlpha = sparse ? 0.25 + t * 0.75 : t
          ctx.fillStyle = isSyntax ? palette.syntax : palette.body
          ctx.fillText(t > 0.5 ? target : ENTROPY[chars[i]], x, y)
          ctx.globalAlpha = 1
        }
      }
    }

    function loop(now: number) {
      if (!running) return
      draw(now)
      raf = requestAnimationFrame(loop)
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.lastMove = performance.now()
    }

    const io = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting
      if (visible && !running) {
        running = true
        if (!reducedMotion) raf = requestAnimationFrame(loop)
      } else if (!visible) {
        running = false
        cancelAnimationFrame(raf)
      }
    })

    resize()
    window.addEventListener('resize', resize)
    section.addEventListener('pointermove', onPointerMove)
    io.observe(canvas)
    if (!reducedMotion) raf = requestAnimationFrame(loop)
    else draw()

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('resize', resize)
      section.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="hero-glyphs absolute inset-0 -z-10"
    />
  )
}
