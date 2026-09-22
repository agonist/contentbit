# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `agonist/contentbit`. Use the `gh` CLI
from this repository, or pass `--repo agonist/contentbit` when working elsewhere.

## Ticket operations

- Read: `gh issue view <number> --comments`. Include labels when inspecting state.
- List: `gh issue list --state open --json number,title,body,labels,assignees`.
- Create: `gh issue create --title "..." --body-file <file>`.
- Update the body: `gh issue edit <number> --body-file <file>`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Label: `gh issue edit <number> --add-label "..." --remove-label "..."`.
- Assign: `gh issue edit <number> --add-assignee @me`.
- Close: `gh issue close <number>` after recording the resolution.

Write multiline issue bodies and comments to a temporary file and use
`--body-file` to preserve formatting. Use `docs/agents/triage-labels.md` for label
names. Create missing labels only when the invoked workflow requires them.

When a skill says "publish to the issue tracker", create a GitHub issue. When it
says "fetch the relevant ticket", read the issue and its comments.

## Investigation maps and dependencies

Keep an investigation map in one parent issue, with each ticket linked as a
sub-issue. If sub-issues are unavailable, use a task list in the parent and a
`Part of #<parent>` line in each child.

Record blockers with GitHub issue dependencies when available; otherwise use a
`Blocked by: #<number>` line in the child. A ticket is ready only when its
blockers are closed. Record each resolved decision and link its ticket from the
parent map.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub shares issue and pull-request numbers. When a supplied reference is
ambiguous, resolve its type before choosing `gh issue` or `gh pr` operations.
