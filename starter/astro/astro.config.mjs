// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { satteri } from "@astrojs/markdown-satteri"
import react from "@astrojs/react"

// https://astro.build/config
export default defineConfig({
  markdown: {
    processor: satteri({
      features: {
        directive: true,
        headingAttributes: true,
        math: true,
      },
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
})
