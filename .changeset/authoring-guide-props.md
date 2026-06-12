---
"@contentbit/core": minor
---

Authoring guides now document every prop from the block's schema: name, type
(with enum values spelled out), required/optional, default value, and the
`.describe()` text. Previously props were only visible through examples, so an
agent obeying "never guess props" could not discover optional props the example
didn't use.
