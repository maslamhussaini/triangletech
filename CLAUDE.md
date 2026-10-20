# CLAUDE.md

This repository's agent instructions live in `AGENTS.md` — read and follow it
before making any change. It is the single source of truth; this file adds
only Claude-specific workflow notes.

- For multi-step work, present a concise execution plan and follow the owner's
  existing authorization. Do not request redundant approvals for actions
  already explicitly authorized within the current slice. Stop at defined
  approval boundaries, unexpected scope changes, destructive operations, and
  external side effects that have not been authorized.
- Keep diffs task-scoped. Do not refactor unrelated code you notice along the way.
- After each slice, verify results (tests, build, diff inspection) and update
  `MEMORY.md` (repo root) with the verified state.
- If a request conflicts with `AGENTS.md` (e.g. claiming a US office, committing
  a secret, pushing to `main`), stop and ask — the file wins.
