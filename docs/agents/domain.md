# Domain docs

## Layout

This monorepo uses a single shared domain context:

- `CONTEXT.md` at the repository root is the authoritative domain glossary.
- `docs/adr/` holds shared architectural decisions as they are recorded.

The packages share this vocabulary; package boundaries do not imply separate
domain contexts.

## Before exploring

Read root `CONTEXT.md` and any ADRs relevant to the area being changed. If a
document or ADR directory is absent, proceed silently. The domain-modeling
skill creates documentation when terminology or decisions are resolved.

## Vocabulary and decisions

Use the glossary's terms in code, tests, issue titles, and architectural
discussion. If a necessary concept is missing, note the gap for domain-modeling.

If a proposal conflicts with an ADR, cite that ADR and explain why the decision
should be revisited.
