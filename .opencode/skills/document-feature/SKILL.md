---
name: document-feature
description: Create or update user-facing documentation for Sayr features in apps/marketing
metadata:
  audience: developers
  workflow: documentation
---

## What I do

When you implement or update a public-facing feature, I help create or update user documentation in `apps/marketing/src/content/docs/`.

I will:
- Determine if documentation already exists for the feature
- Create new documentation or update existing docs to reflect changes
- Follow the established Starlight/Astro markdown format with proper frontmatter
- Write clear, user-friendly content (not developer/API docs)
- Update `docs/index.md` Browse by Topic table when adding new pages

## Documentation structure

Docs live in `apps/marketing/src/content/docs/docs/` with this organization:
- `index.md` - Main documentation landing page (includes a "Browse by Topic" table)
- `quick-start.md` - Getting started guide
- `features/*.md` - Core product features (tasks, labels, categories, templates, subtasks, relations)
- `guides/*.md` - Feature guides and workflow how-tos (visibility, views, releases, public pages)
- `organizations/*.md` - Organization management (members, teams, integrations)
- `api/*.md` - API documentation
- `self-hosting/*.md` - Deployment and self-hosting guides
- `knowledge-base/*.md` - FAQ and troubleshooting

## Choosing the right section

| New content type | Where it goes |
|---|---|
| Product feature (what a thing is and how to use it) | `features/` |
| Organization settings or management page | `organizations/` |
| Third-party integration | `organizations/` |
| Self-hosting or deployment | `self-hosting/` |
| FAQ or troubleshooting | `knowledge-base/` |

## Sidebar configuration

The sidebar in `apps/marketing/astro.config.mjs` uses `autogenerate` for all sections — **Features**, **Organizations**, **Self Hosting**, and **Contributing**. Files added to the correct directory automatically appear in the right section.

| Section | Directory |
|---|---|
| Features | `docs/features/` |
| Organizations | `docs/organizations/` |
| Self Hosting | `docs/self-hosting/` |
| Contributing | `docs/contributing/` |

Control the order and label of each page using the `sidebar` frontmatter:

```md
---
title: Your Feature
description: Brief description
sidebar:
   order: 7
   label: Custom Label   # optional — defaults to title
---
```

## Frontmatter format

Every documentation file must include this frontmatter:

```md
---
title: Feature Name
description: Brief description of what this page covers (used in SEO)
sidebar:
   order: N
---
```

## Content guidelines

1. **Write for end users** - Explain what features do and how to use them, not implementation details
2. **Use clear headings** - Structure with H2 (`##`) for main sections, H3 (`###`) for subsections
3. **Include practical examples** - Show real use cases and workflows
4. **Add tables for comparisons** - Use markdown tables to compare options or settings
5. **Link related docs** - Cross-reference other relevant documentation pages
6. **Keep it concise** - Users want quick answers, not walls of text
7. **Update `index.md`** - When adding a new page, add it to the Browse by Topic table in `docs/index.md`

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
4. **Target section** - Where should this live? (features, guides, organizations, self-hosting, etc.)

## Example output

For a new core feature like "Notifications", I would create `apps/marketing/src/content/docs/docs/features/notifications.md`:

```md
---
title: Notifications
description: Stay informed when tasks you care about are updated
sidebar:
   order: 7
---

# Notifications

Sayr sends you notifications when things change on tasks you're involved with.

## When You're Notified

- You're assigned to a task
- A task you created or are assigned to changes status or priority
- Someone @mentions you in a comment
- A comment is posted on a task you're watching

## Managing Notifications

...
```

Then add it to the Browse by Topic table in `docs/index.md`.

The page will appear automatically in the **Features** sidebar section because `autogenerate` scans `docs/features/`. The `sidebar.order: 7` frontmatter controls its position.
