# Sayr in Paseo

A native [Paseo](https://paseo.sh) plugin (`@repo/paseo-plugin`, id `sayr`) that brings Sayr tasks into
the Paseo sidebar: a multi-org status board, a full task detail view with write actions, comment
threads, and a "send to agent" hand-off — without leaving Paseo.

## How it works

The plugin doesn't call the Sayr API directly. Every RPC handler shells out to an installed `sayr`
CLI binary (`@sayrio/cli`, see [`packages/cli/README.md`](../cli/README.md)) on the daemon machine and
parses its `--json` output. That means:

- Auth is whatever `sayr login` already has stored in `~/.sayr/config.json` on the daemon — the
  plugin never sees or stores a token itself.
- Every write action (status, priority, assignees, comments) round-trips through the same CLI
  commands you could run by hand, so plugin and CLI can never drift in what they're capable of.

## Requirements

- Paseo `>=0.8.0`.
- The `sayr` CLI installed and logged in on the **daemon** machine (not just wherever the Paseo app
  itself is running):
  ```bash
  npm install -g @sayrio/cli
  sayr login --token api_xxxxxxxx
  ```

## Settings

**Settings → Plugins → Sayr** lets you point the plugin at a different installed binary — e.g.
`sayr-local` to work against a local dev backend instead of production (see the CLI README's
`SAYR_PROFILE` section). Stored server-side at `$PASEO_HOME/plugins/sayr/settings.json`, defaulting
to `sayr`.

## Features

- **Board** — every organization the CLI's logged-in user belongs to, fetched in parallel, with
  backlog/todo/in-progress columns (done/canceled tasks aren't fetched at all — the board isn't a
  full archive). Search, and per-org/per-priority filter chips.
- **Task detail** — opens as a resizable side sheet, not a modal, mirroring the real product's
  panel behavior rather than replacing the whole screen. Status, priority, and assignees are all
  editable inline; assignee/category names and colors resolve the same way the web app's own
  pickers do.
- **Rich comment/description rendering** — task descriptions and comment bodies are ProseKit
  documents, not markdown strings. `client/prosekit-view.tsx` renders the real node/mark tree
  (headings, bold/italic/strike/underline/code, lists, blockquotes, code blocks) as actual styled
  React Native elements, plus `@user`/`#task`/`!category` mention pills — not a flattened,
  unformatted dump of the text. See that file's header comment for exactly what is and isn't
  covered (no live task-title lookup in task mentions, no avatar image inside a mention pill, no
  table grids, no code block syntax highlighting).
- **Send to agent** — hands a task's title, status, priority, description, and recent comments off
  to a new Paseo agent as a seed prompt (`client/agent-prompt.ts`), via a real workspace + agent
  creation call, not just a copy-paste.

## Architecture

Standard Paseo plugin layout — `client/` (React Native, no Node/DOM APIs except the one
platform-gated `client/web.ts`), `server/` (the daemon subprocess, shells out to the CLI, can use
Node freely), `shared/` (Zod RPC contracts and plain types, importable from both). Every write and
every non-trivial read goes through a `defineRpc` contract in `shared/task.ts`/`shared/settings.ts`,
handled in `server/task-handlers.ts`/`server/settings-handlers.ts`, called from `client/` via
`useRpc()`. See `AGENTS.md`'s row for this package and the individual file header comments for the
reasoning behind specific choices (why the sheet isn't a host `Modal`, why colors are priority-based
rather than per-org, why `shared/` has small local copies of a couple of `@repo/util` helpers instead
of importing them, etc.).

## Development

```bash
cd packages/paseo-plugin
pnpm typecheck        # tsc --noEmit
pnpm lint             # biome check .
pnpm lint:fix         # biome check . --write
```

No build step — Paseo loads plugin source directly. The loop after editing anything under
`client/`, `server/`, or `shared/`:

```bash
paseo plugin reload sayr
paseo plugin logs sayr   # confirm "Plugin ready" with no error
```

Only run `pnpm install` at the repo root if you add a new dependency to `package.json`. Every RN
client file should stay free of DOM/Node APIs (`rg -n "document\.|window\.|className=|onClick=" client/`
should only ever match `client/web.ts`), and no async arrow functions in client code (a Hermes
bug) — worth a quick grep before reloading if you touched anything under `client/`.

## Known gaps

- **Labels can be created but not edited or deleted.** `GET/POST /me/labels` and the labels picker
  cover listing, selecting, and creating a label (with a public/private toggle), but there's no way
  to rename, recolor, or delete an existing one from the plugin — that still needs the web app.
- **Board doesn't show done/canceled tasks.** The status picker still covers the full status enum,
  so a task can be moved there — it just drops off the board once it is.
