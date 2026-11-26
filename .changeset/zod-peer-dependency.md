---
'@contentbit/core': patch
'@contentbit/blocks': patch
---

Use the project's zod instead of installing a separate copy. `@contentbit/core`
and `@contentbit/blocks` now declare zod `^4.0.0` as a peer dependency. Before,
a project whose zod resolved to a different version than Contentbit's own copy
got a TypeScript error on every block schema in its registry, such as
"missing the following properties from type 'ZodType': validate,
validateAsync". Projects created with `contentbit init` already depend on zod.
Other projects that define blocks should add zod 4 to their own dependencies.
