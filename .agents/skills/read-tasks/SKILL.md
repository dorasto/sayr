---
name: read-tasks
description: Look up a Sayr task from this repo's own tracker via the `sayr` CLI instead of a web fetch — use whenever a task is referenced as SAY-<n>, a bare task number, or a platform.sayr.io/<n> URL (e.g. "let's work on SAY-71").
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

This repo dogfoods its own tracker: tasks live on Sayr itself, in the `platform` organization
(`https://platform.sayr.io`). `docs/agents/issue-tracker.md` documents the anonymous, unauthenticated
`curl` path for reading public tasks — that's the fallback when there's no logged-in CLI available.
On a machine where `@sayrio/cli` (`sayr`) is installed and logged in, prefer it: it's a single
command instead of two, and returns the task pre-flattened. Check first (`sayr whoami`) — if it's
not authenticated, fall back to the curl path in `docs/agents/issue-tracker.md` rather than trying
to log in yourself.

## Resolving an identifier

`SAY-<n>` (what `formatTaskKey` produces — see "Task identifiers" in `AGENTS.md`), a bare task
number, and a `platform.sayr.io/<n>` URL all mean the same thing: numeric `shortId` `<n>` in the
`platform` org. "Let's work on SAY-71" → `shortId` `71`.

## Reading a task

```bash
sayr task view <shortId> --org platform --json
```

Always pass both flags for this repo:

- `--org platform` — the CLI's persisted default org (`sayr config get`) can be anything depending
  on what else it's used for; don't rely on it being `platform` for this repo, pass it explicitly.
- `--json` — prints the raw `Task` object (already unwrapped, not the `{success,data,error}`
  envelope the curl endpoints return) in one shot: title, status, priority, category, labels,
  assignees, createdBy, description, `aiSummary` (a cached AI-generated summary, `null` if AI
  isn't enabled for the org or none has ever been generated), and a `comments`/`commentsTotal`
  preview (first 5, top-level only) are all included — no follow-up call needed for the common case.

Example: `sayr task view 71 --org platform --json`.

## Reading more comments

`task view`'s built-in preview caps at 5 top-level comments. For the rest, or to paginate:

```bash
sayr comment list <shortId> --org platform --json
```

This is a real (paginated) read, backed by an authenticated `/me/*` route — not the anonymous
endpoint `docs/agents/issue-tracker.md` documents for agents without a logged-in CLI. Each comment
carries `replyCount`/`latestReplyAuthor`/`replyAuthors`; if `replyCount > 0`, fetch the thread with:

```bash
sayr comment replies <commentId> --json
```

(No `--org` needed there — a comment id is already org-scoped server-side.)

## Descriptions are ProseKit JSON

`description` in the `--json` output is a ProseMirror/ProseKit document (`{ type: "doc", content:
[...] }`), not a markdown string — same caveat as the curl path. Either walk the node tree for
`text` nodes yourself, or drop `--json` and let the CLI's human-readable rendering
(`renderProsekitPlainText`, in `packages/cli/src/lib/prosekit.ts`) do it for you.

## Gotchas

- `--org platform` is specific to *this* repo's own tracker. Don't carry it over when looking up a
  task that belongs to a different project.
- The CLI holds a real personal access token and can create/update tasks and comments. Per
  `docs/agents/issue-tracker.md`, agents stay read-only here — `task view`, `task list`,
  `comment list`, and `comment replies` are reads and fine to run freely. Never run `task create`,
  `task update`, `task label`, `task assign`, `comment create`, `comment update`, or
  `comment delete` unless a human explicitly asks you to write to the tracker.
- Don't read or echo the contents of `~/.sayr/config.json` (holds the personal access token) as
  part of answering a task-lookup question — it's not needed for any read command.
