import { createFileRoute } from "@tanstack/react-router"

import { Content } from "../components/content-blocks"
// Vite's ?raw import inlines the Markdown as a string at build time.
import source from "../../content/example.md?raw"

export const Route = createFileRoute("/example")({ component: ExamplePage })

function ExamplePage() {
  return (
    <>
      <div className="border-b border-border/60">
        <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="font-mono text-xs tracking-wider uppercase">
            Example article
          </span>
          <a
            href="https://contentbit.dev"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            built with contentbit
          </a>
        </header>
      </div>
      <main className="article mx-auto max-w-2xl px-6 py-12">
        <Content source={source} />
      </main>
    </>
  )
}
