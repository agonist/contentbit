---
"contentbit": minor
---

Coding-agent integration. New `contentbit agents` command (also run by `init`,
skip with `--no-agents`) installs Claude Code skills — `contentbit-author`
(fetch the live authoring guide, write, validate until clean) and
`contentbit-audit` (rank findings from `stats` JSON) — and manages a fenced
instruction block in `AGENTS.md` for every other agent. Skills hold no schemas;
they read everything from the CLI at runtime, so custom blocks are picked up
automatically. `contentbit stats` now accepts multiple files and globs,
emitting a JSON array (single files keep the flat object shape).
