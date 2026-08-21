# Issue tracker: Sayr platform (read-only)

Issues and tasks for this repo live on **Sayr itself** — the `platform` organization at
<https://platform.sayr.io>. This repo is Sayr's own source, so we dogfood our own tracker.

The GitHub repo (`dorasto/sayr`) is a **downstream mirror**. Do not create, label, or close
GitHub issues on the assumption they will reach Sayr — they will not. The GitHub integration
(`apps/worker/github/`) links **pull requests, commits, and comments** back to Sayr tasks via
keywords (`fixes`, `closes`, `resolves`, `blocked by`, `ref`, `sayr`); it does **not** sync
issues in either direction.

## Agents read; they do not write

There is no agent-writable API for Sayr tasks today. `@sayrio/public` is read-only, and API
keys exist only as system keys in the admin console. Task 31 ("MCP Support") on the platform
org tracks adding a write surface; until it lands, the contract is:

- **A human gives you a task URL.** You read it and work from it.
- **You never create, edit, label, or close a task.** When a skill would normally publish to
  the tracker, produce the ticket body as markdown in your response and let the human paste it.

## Reading a task

A task URL looks like `https://platform.sayr.io/<shortId>` — e.g. `https://platform.sayr.io/31`.
The page is client-rendered, so fetching the URL directly gives you an empty shell. Use the
public REST API instead:

```bash
# The task itself
curl -s "https://api.sayr.io/v1/organization/platform/tasks/31"

# Its comments
curl -s "https://api.sayr.io/v1/organization/platform/tasks/31/comments"
```

Both return the standard `ApiResult<T>` envelope — `{ success, data, error }`. Always check
`success` before using `data`.

Other useful read endpoints on the same base (`https://api.sayr.io`):

| Endpoint | Returns |
| --- | --- |
| `/v1/organization/platform` | Org metadata |
| `/v1/organization/platform/tasks` | Task list (paginated) |
| `/v1/organization/platform/tasks/<shortId>` | One task |
| `/v1/organization/platform/tasks/<shortId>/comments` | Comments on a task |
| `/v1/organization/platform/labels` | Available labels |
| `/v1/organization/platform/categories` | Available categories |
| `/v1/organization/platform/releases` | Releases |

Only **public** tasks are visible through this API. If a task returns no data, it is likely
private — ask the human to paste the contents rather than trying to authenticate.

### Descriptions are ProseKit JSON, not markdown

`data.description` is a ProseMirror/ProseKit document (`{ type: "doc", content: [...] }`), not a
string. Walk the node tree and concatenate `text` nodes to read it as prose. See
`apps/worker/github/markdownToProsekit.ts` for the reverse conversion.

## Task identifiers

Displayed identifiers are `formatTaskKey(orgShortId, taskShortId)` from `@repo/util` — e.g.
`SAY-31`. The API and route params take the raw numeric `shortId` (`31`). See the "Task
identifiers" section of `AGENTS.md`.

## When a skill says "publish to the issue tracker"

Write the ticket as markdown in your response, addressed to the human. Say plainly that you
cannot create it yourself.

## When a skill says "fetch the relevant ticket"

Ask for the task URL if you do not have one, then `curl` the two endpoints above.
