---
'@contentbit/core': patch
'contentbit': patch
'@contentbit/studio': patch
---

Fix v1 edge cases in validation and first-run workflows:

- Reject invalid props in wrapped strict schemas instead of marking the document valid.
- Resolve encoded Markdown links and avoid false broken-link warnings for relative assets.
- Generate working Next.js example imports with either app directory layout.
- Allow briefs before the first content file exists and honor explicit SEO config overrides.
- Load separately installed Studio from the consuming project when using a global or npx CLI.
- Resolve project path aliases when previewing copied styled components in Studio.
- Keep snapshot paths and path-derived identities portable for content outside the project root.
