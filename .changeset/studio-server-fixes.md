---
'contentbit': patch
'@contentbit/studio': patch
---

Stop Studio from serving project files over `/@fs/`: it now serves only its own
UI and font files, so `--host 0.0.0.0` no longer exposes the project to the
network, and the CLI warns when `--host` is not a loopback address. Studio
refreshes and `doctor --watch` reruns now read edited registry, Contentbit
config, and SEO config modules instead of the first copy loaded.
`studio --port 0` now listens on a free port chosen by the operating system
instead of 5173.
