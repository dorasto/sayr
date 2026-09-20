---
name: document-feature
description: Create or update user-facing documentation for Sayr features in apps/landing (the Fumadocs docs site) — new pages, sidebar order via meta.json, new folders/tabs, internal links
metadata:
  audience: developers
  workflow: documentation
---

## What I do

When you implement or update a public-facing feature, I help create or update user documentation in `apps/landing/content/docs/`.

I will:
- Determine if documentation already exists for the feature
- Create new documentation or update existing docs to reflect changes
- Follow the Fumadocs conventions: `title` + `description` frontmatter, sidebar order via the folder's `meta.json`
- Write clear, user-friendly content (not developer/API docs)
- Update the "Browse by Topic" table in `content/docs/index.mdx` when adding new pages

## Documentation structure

Docs live in `apps/landing/content/docs/` (all paths below are relative to it). The site was ported from Starlight (`apps/marketing`, being retired) to Fumadocs — anything Starlight-specific (`sidebar.order`, `:::note`, `astro.config.mjs`) no longer applies.

- `index.mdx` - Main documentation landing page (includes the "Browse by Topic" table)
- `quick-start.md` - Getting started guide
- `tasks/`, `organize/` - Core product features (tasks, subtasks, relations, templates; labels, categories, views, releases)
- `visibility/` - Visibility controls and public pages
- `account/` - My tasks, notifications, account settings, security
- `organizations/` - Organization management (overview, preferences, members & teams, billing, danger zone)
- `ai/`, `integrations/`, `cli.mdx` - AI features, third-party integrations, the `sayr` CLI
- `self-hosting/` - Deployment and self-hosting guides
- `api/` - **Separate "API" tab.** `overview.md` and `sdk.mdx` are hand-written; `reference/**` is generated (see Rules)
- `knowledge-base/` - **Separate "Knowledge Base" tab** (FAQ and troubleshooting)
- `contributing/` - **Separate "Contributing" tab** (developer docs; `guidelines/` is a subfolder)

## Choosing the right section

| New content type | Where it goes |
|---|---|
| Task feature (what a thing is and how to use it) | `tasks/` |
| Workflow/organization feature (labels, categories, views, releases) | `organize/` |
| Visibility or public-page behaviour | `visibility/` |
| Personal account feature or setting | `account/` |
| Organization settings or management page | `organizations/` |
| Third-party integration | `integrations/` |
| AI feature | `ai/` |
| Self-hosting or deployment | `self-hosting/` |
| FAQ or troubleshooting | `knowledge-base/` |
| Developer/contributor guide | `contributing/` |
| API guide (not endpoint reference) | `api/` |

## Sidebar order and structure (`meta.json`)

The sidebar is built from the folder tree plus each folder's `meta.json`. **There is no per-page order in frontmatter** — Starlight's `sidebar.order` / `label` / `badge` / `hidden` are silently ignored (Fumadocs' page schema strips unknown keys). Losing that frontmatter in the port is why the sidebar once fell back to alphabetical order.

A folder's `meta.json` looks like this:

```json
{
	"title": "Organize",
	"defaultOpen": false,
	"icon": "IconFolders",
	"pages": ["labels", "categories", "views", "releases", "..."]
}
```

- `title` - sidebar label for the folder
- `defaultOpen` - `false` keeps the folder collapsed until visited
- `icon` - a Tabler icon name; it only renders if it is registered in the `icons` map in `src/lib/source.ts`
- `pages` - display order. Entries are file names without the extension (or sub-folder names). **Always end the list with `"..."`** so a page you forgot to list still shows up (appended alphabetically after the listed ones) instead of vanishing from the sidebar
- The sidebar label of a page is its frontmatter `title`; there is no separate label override

### Adding a page

1. Create the file in the right folder (see below for frontmatter).
2. Insert its slug into that folder's `pages` array at the position it should appear (before `"..."`).
3. Add it to the "Browse by Topic" table in `content/docs/index.mdx`.

A slug in `pages` that doesn't match a file or sub-folder is silently ignored (the real page then just lands in the `"..."` bucket at the end), so double-check spelling and glance at the sidebar with `pnpm -F landing dev`.

### Adding a folder

1. Create `<folder>/meta.json` with `title`, `defaultOpen`, `icon`, and `pages` (ending in `"..."`).
2. Register the icon in the `icons` map in `src/lib/source.ts`.
3. Add the folder to the **root** `content/docs/meta.json` `pages`. The root list has no `"..."` (`api/` and `knowledge-base/` are deliberately not in it), so an unlisted top-level folder will not show up in the Documentation sidebar.
4. Update the "Browse by Topic" table in `index.mdx`.

### Separate sidebar tabs (`"root": true`)

`"root": true` in a folder's `meta.json` makes it its own sidebar tab (`api`, `knowledge-base`, `contributing`). Tabs are wired by hand in `getDocsTabs` in `src/lib/layout.shared.tsx`: a new tab needs an entry there, with `url` pointing at a real page (these folders have no index page, so the bare folder URL 404s) and `urls: urlsUnder(tree, "/docs/<folder>")` so sibling pages highlight the right tab.

## Frontmatter format

Every documentation file must include this frontmatter — nothing else is needed:

```md
---
title: Feature Name
description: Brief description of what this page covers (used in SEO)
---
```

## Content guidelines

1. **Write for end users** - Explain what features do and how to use them, not implementation details
2. **Use clear headings** - Structure with H2 (`##`) for main sections, H3 (`###`) for subsections
3. **Include practical examples** - Show real use cases and workflows
4. **Add tables for comparisons** - Use markdown tables to compare options or settings
5. **Link related docs** - Cross-reference other relevant documentation pages
6. **Keep it concise** - Users want quick answers, not walls of text
7. **Update `index.mdx`** - When adding a new page, add it to the Browse by Topic table in `content/docs/index.mdx`
8. **Callouts use `<Callout>`, not `:::note`** - e.g. `<Callout type="info" title="Cloud only">…</Callout>` (types: `info`, `warn`, `error`, `success`, `idea`). Components only work in `.mdx` files; `.md` is compiled as plain Markdown, so rename to `.mdx` when you need one

## Rules

- **Internal links** are absolute (`/docs/...`) and must point at a real page. Folders have no index page, so `/docs/self-hosting` 404s — link `/docs/self-hosting/get-started`. URLs mirror folder and file names exactly and are case-sensitive; keep both lowercase kebab-case (a capitalised `Guidelines/` folder once broke every lowercase link to it).
- **Never hand-edit `api/reference/**`** (or its `meta.json` files). It is generated from the OpenAPI snapshot; regenerate with `pnpm -F landing openapi:generate`.
- Preview locally with `pnpm -F landing dev` (port 3002).

## When to use me

Use this skill when:
- You've implemented a new user-facing feature that needs documentation
- You've updated an existing feature and docs need to reflect changes
- The user says "document how X works" or "update docs for X"
- A feature is public-facing and users would benefit from knowing about it

## What I need from you

Tell me:
1. **Feature name** - What is the feature called?
2. **What it does** - Brief description of functionality
3. **New or update** - Is this new documentation or updating existing?
4. **Target section** - Where should this live? (tasks, organize, account, organizations, integrations, self-hosting, etc.)

## Example output

For a new feature like a "Weekly Digest" email, I would create `apps/landing/content/docs/account/weekly-digest.md`:

```md
---
title: Weekly Digest
description: Get a weekly email summary of the tasks you care about
---

# Weekly Digest

Sayr can email you a summary of what changed on the tasks you're involved with.

## What's Included

- Tasks assigned to you that changed status or priority
- New comments on tasks you're watching
- Releases shipped this week

## Managing Your Digest

...
```

Then:
1. Add `"weekly-digest"` to `account/meta.json`, right after `"notifications"`: `"pages": ["my-tasks", "notifications", "weekly-digest", "account-settings", "security", "..."]`.
2. Add it to the Browse by Topic table in `content/docs/index.mdx`.

The page appears in the **Account** sidebar folder at the position given by `pages`.
