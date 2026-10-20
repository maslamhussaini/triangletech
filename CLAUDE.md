# CLAUDE.md

This repository's agent instructions live in `AGENTS.md` — read and follow it
before making any change. It is the single source of truth; this file adds
only Claude-specific workflow notes.

- Use plan mode for any slice with more than three steps: state the files you
  will inspect, the changes you will make, and the checks you will run, then
  wait for approval before editing.
- Keep diffs task-scoped. Do not refactor unrelated code you notice along the way.
- After each slice, report: files changed, tests run with results, build status,
  and remaining blockers. Update `MEMORY.md` (repo root) with the verified state.
- If a request conflicts with `AGENTS.md` (e.g. claiming a US office, committing
  a secret, pushing to `main`), stop and ask — the file wins.
