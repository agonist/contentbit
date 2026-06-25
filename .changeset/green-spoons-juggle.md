---
"@contentbit/studio": patch
---

Allow Studio to serve dependency assets hoisted to its workspace root, so monorepo sites can load packaged fonts and other Vite-served files while running the local dashboard. The served file scope is bounded to the Studio package, its workspace root, and the consuming project's working directory.
