---
'contentbit': major
---

`contentbit check` replaces `contentbit doctor`. Running `contentbit doctor` exits 2 and says to run `contentbit check`, and `contentbit check --json` in place of `doctor --json`. Replace `doctor --strict-warnings` with `check --strict`.

`check` takes over the options that only `doctor` had. `--watch` reruns it when a file changes in a scanned content folder or in the build folder, `--strict-seo` exits 1 on SEO warnings, and `--min-section-words` sets the thin-section threshold. It warns with `CB_SKILL_DRIFT` when an installed Claude Code skill is older than the one the CLI ships.

`check` reads Markdown from `content` in the Contentbit config, not from positional globs or a `content:doctor` package script, and takes a build folder as its argument. Its `--json` report is `contentbit.site-check.v1`: the Markdown findings are in `content.findings`, and the report has no `linkGraph`, `seo` or `suggestions` summary. `contentbit init` now writes a `content:check` script that runs `contentbit check`, and no `content:doctor` script. The agent instructions and the `contentbit-audit` skill, now version 8, tell agents to run `check`. Run `contentbit agents` to refresh them.
