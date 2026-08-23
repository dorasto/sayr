---
name: agent-docs-maintenance
description: How to keep AGENTS.md and .agents/skills/ accurate over time — checking for stale app/package tables, writing a new skill, and updating an existing one. Use whenever an app or package is added/removed/renamed, whenever you're about to write a new skill or update an existing one, or when explicitly asked to audit the agent docs for staleness.
metadata:
  audience: developers
  workflow: meta
---

## Overview

`AGENTS.md` and `.agents/skills/` only help if they're accurate. This repo has already had multiple docs go stale at once — `CLAUDE.md` kept a full parallel copy of the architecture that drifted (it described a `Next.js` `apps/web` frontend years after that app was replaced by `apps/start`), and two skills (`page-header`, the old `right-panel`) kept describing task-identifier and panel-toggle code that had since changed. A skill going stale is worse than a table going stale: a missing table row is an obvious gap, but a skill confidently describing a convention that no longer matches the code is silently wrong. This skill is the process for keeping both current, so that doesn't happen quietly again.

## Checking for stale Apps/Packages tables

Run this whenever an app or package is added, removed, or renamed, or when asked to check `AGENTS.md` for staleness:

```bash
node scripts/check-agents-md.mjs
```

It diffs every real directory under `apps/*` and `packages/*` (real = has a `package.json`) against the raw text of `AGENTS.md`, and lists anything missing. It's a plain substring check, not a markdown-table parser, so it doesn't care how the tables are formatted — it just needs the path or package name to appear somewhere in the file. If it reports something missing, add a row to the relevant table in `AGENTS.md`'s "Repository Overview" section with a one-line description of what the app/package actually does (read its entry point, don't guess from the name alone).

This is a script you run on request, not a CI gate — nothing blocks a PR on it. Run it yourself before telling the user `AGENTS.md` is up to date.

## Writing a new skill

Follow this template — every skill in `.agents/skills/` already follows it:

1. **Research first, don't write from memory.** Read the actual source of the package/feature the skill covers: entry points, exports, real call sites in at least two different consumers, existing comments/gotchas. A skill's whole value is being *more* reliable than an agent re-deriving the same thing from scratch each time — that only holds if the content is actually correct.
2. **Frontmatter** — keep it to the fields every existing skill uses, nothing tool-specific:
   ```yaml
   ---
   name: <kebab-case-name>
   description: <what it's for and when to use it — this is what triggers auto-loading, be specific about the situation, not just the topic>
   metadata:
     audience: developers
     workflow: feature-development
   ---
   ```
   `workflow` values in use: `feature-development` (most skills), `meta` (this one), `github` (`update-pr`), `documentation` (`document-feature`).
3. **Body shape**: a short overview explaining *why* the skill exists (what mistake it prevents — see `page-component`'s opening paragraph for the model), then the actual conventions as a component-API/key-files reference or concrete numbered steps, then a "Rules" and/or "Gotchas" section for anything non-obvious a reader would otherwise learn the hard way. Skip generic advice — every line should be something specific to this codebase that isn't derivable by reading the code once.
4. **File location**: `.agents/skills/<name>/SKILL.md` — this directory is scanned natively by OpenCode and any other tool supporting the [Agent Skills](https://agentskills.io) open standard. Don't create a tool-specific skills directory instead (this repo used to have skills under `.opencode/skills/` — they were migrated to `.agents/skills/` for exactly this reason, so every tool sees the same set).
5. **Register it**: add a row to the Skills Directory table in `AGENTS.md` so it shows up in the index, not just on disk.
6. **Cross-reference, don't duplicate.** If another skill already covers part of what you're documenting (e.g. `page-header` defers panel-toggle detail to `page-component`), point to it instead of restating it.

## Updating an existing skill

Before editing a skill because the underlying code changed: **re-read the current code for the area it covers, the same way you would if writing it fresh.** Don't patch a skill based on what you remember it saying or what seems likely to have changed — a skill's central claims need to be re-verified against reality, not assumed still true. If a skill's core claim turns out to be wrong (e.g. it documents a component that was deleted and replaced), rewrite that section properly — including its code examples — rather than leaving a note contradicting the rest of the file.

If a package or feature a skill covers gets removed, delete the skill directory too and remove its row from `AGENTS.md`'s Skills Directory table — closing the loop in both directions is what keeps this from drifting again.

## Keeping CLAUDE.md from drifting back

`CLAUDE.md` should stay exactly the ZCP-managed block (do not edit that — it's regenerated by tooling) plus a one-line pointer to `AGENTS.md`. Do not add a second copy of architecture/commands/patterns content to `CLAUDE.md` "for Claude specifically" — that's exactly the duplication that went stale before. If Claude Code needs something AGENTS.md doesn't cover, add it to AGENTS.md (or a skill), not to CLAUDE.md.
