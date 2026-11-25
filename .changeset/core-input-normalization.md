---
'@contentbit/core': patch
'contentbit': patch
---

Read files with CRLF line endings or a leading UTF-8 byte order mark the same
as plain LF files. List and rows blocks no longer fail with `CB_ITEM_SYNTAX` or
`CB_ROW_SYNTAX` in Windows checkouts, and a byte order mark no longer hides the
frontmatter. Diagnostics keep the line and column an editor shows. Offsets
count characters of the text after line endings become LF.

Frontmatter parsing now follows YAML in three more cases. A dash list may sit at
its key's own indentation, as PyYAML writes it. A list item such as
`https://example.com/x` stays a string. A `#` after whitespace starts a comment,
so `title: "Foo" # draft` reads as `Foo`. Quote a value that must keep a ` #`.
