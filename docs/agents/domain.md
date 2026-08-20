# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase.

## Before exploring, read these

- **`AGENTS.md`** at the repo root — the primary guidance file for this repo. `CLAUDE.md` is a
  deliberate pointer at it and holds no separate content.
- **`CONTEXT.md`** at the repo root, if it exists — the domain glossary.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.
- **`.agents/skills/`** — repo-specific skills (`page-header`, `page-component`,
  `command-palette`, `edition`, `document-feature`, `update-pr`, `agent-docs-maintenance`).
  Check the relevant one before making changes in its area.

If any of these don't exist, **proceed silently**. Don't flag their absence; don't suggest
creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and
`/improve-codebase-architecture`) creates them lazily when terms or decisions actually get
resolved.

## Layout: single-context

This is a pnpm/Turborepo monorepo, but it is **one product with shared packages**, not several
bounded contexts with distinct vocabularies. So it uses the single-context layout: one
`CONTEXT.md` and one `docs/adr/` at the root.

```
/
├── AGENTS.md                          ← primary agent guidance
├── CONTEXT.md                         ← domain glossary (created lazily)
├── docs/
│   ├── adr/                           ← architecture decision records
│   └── agents/                        ← this directory
├── apps/       (backend, start, marketing, worker, nginx, traefik)
└── packages/   (database, ui, util, edition, ai, auth, …)
```

If subsystems later diverge enough to need their own glossaries, switch to multi-context: add a
root `CONTEXT-MAP.md` pointing at per-app/package `CONTEXT.md` files, with context-scoped ADRs
under e.g. `apps/backend/docs/adr/`.

## Use the glossary's vocabulary

When your output names a domain concept (in a ticket title, a refactor proposal, a hypothesis, a
test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary
explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

Terms this repo is already precise about, defined in `AGENTS.md`: **edition**
(`cloud`/`community`/`enterprise`), **visibility** (`public`/`private`, per item), **task key**
(`formatTaskKey` → `SAY-123`), and the `Page`/`IndentDrawer` panel system (note that
`PanelWrapper` is the *retired* system).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently
overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
