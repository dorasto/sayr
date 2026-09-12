# [Full documentation](https://sayr.io/docs/cli)

## Overview

The Sayr CLI (`@sayrio/cli`, binary `sayr`) wraps the same personal-access-token-authenticated API surface (`/v1/me/*`) that powers integrations and bots — list, create, and update tasks, manage labels and assignees, and post comments, all without opening a browser.

## Installation

```bash
npm install -g @sayrio/cli
sayr --help
```

Prefer a one-off run without a global install? `npx @sayrio/cli --help` works the same way.

## Authentication

The CLI authenticates with a personal access token, the same kind used by any other API client (see the [Public API & SDK](/docs/api/sdk) docs). Generate one from your Sayr account settings, then log in:

```bash
sayr login --token api_xxxxxxxx
```

Omit `--token` and you'll be prompted to paste it instead. Pass `--base-url` to point at a self-hosted instance or a local dev server — it defaults to `https://api.sayr.io`:

```bash
sayr login --token api_xxxxxxxx --base-url https://api.your-instance.com
```

Credentials are written to `~/.sayr/config.json` (owner-readable only). `sayr logout` clears them. `SAYR_TOKEN` and `SAYR_BASE_URL` environment variables override the stored values for a single command without touching the file — handy in CI.

## Configuration

Most commands need an organization. Set a default once instead of passing `--org <slug>` on every command:

```bash
sayr config set-org platform
sayr config get             # show the current config (token is truncated)
sayr config set-base-url http://localhost:5468
```

## Commands

| Command                                     | What it does                                                     |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `sayr login [--token] [--base-url]`         | Authenticate and store credentials                               |
| `sayr logout`                               | Clear stored credentials                                         |
| `sayr whoami`                               | Show the authenticated user                                      |
| `sayr orgs list`                            | List organizations you belong to                                 |
| `sayr task create <title>`                  | Create a task                                                    |
| `sayr task list`                            | List tasks — search, filter, sort, paginate                      |
| `sayr task view <taskId>`                   | Show a single task                                               |
| `sayr task update <taskId>`                 | Update title, status, priority, category, release, or visibility |
| `sayr task label <taskId> --set <ids>`      | Replace a task's full set of labels                              |
| `sayr task assign <taskId> --set <ids>`     | Replace a task's full set of assignees                           |
| `sayr comment create <taskId> <content>`    | Post a comment on a task                                         |
| `sayr comment update <commentId> <content>` | Edit a comment                                                   |
| `sayr comment delete <commentId>`           | Delete a comment                                                 |

Every command accepts `--json` for scriptable output, and `sayr <command> --help` prints its full flag list.

## Examples

Create a task and check the queue:

```bash
sayr task create "Fix the flaky deploy check" --priority high --status todo
sayr task list --sort newest --limit 5
```

Move a task through statuses and assign it:

```bash
sayr task update 123 --status in-progress
sayr task assign 123 --set <user-id>
```

Comment from a script, with machine-readable output:

```bash
sayr comment create 123 "Deploy finished successfully." --json
```

## Permissions

The CLI can only do what your personal access token's scopes — and your own role in the organization — allow. Reading tasks needs `tasks.read`, creating them needs `tasks.create`, commenting needs `tasks.comment`, and so on down to `content.manageLabels`, `tasks.assign`, `tasks.changeStatus`, `tasks.changePriority`, and `tasks.editAny`. A key is always a ceiling, never a grant — it can never do more than its owner can, and it can never touch member, team, or billing management no matter what scopes it's given.
