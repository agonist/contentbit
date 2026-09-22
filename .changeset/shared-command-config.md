---
'contentbit': patch
---

Centralize CLI configuration resolution across content commands so flag precedence,
project paths, package-script fallbacks, and SEO settings share one implementation.
Preserve command-specific validation, error ordering, and empty-library behavior.
