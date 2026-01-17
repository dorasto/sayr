---
name: document-feature
description: Create or update user-facing documentation for Sayr features in apps/marketing
license: MIT
compatibility: opencode
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
- Update the sidebar configuration in `astro.config.mjs` if adding new pages

## Documentation structure

Docs live in `apps/marketing/src/content/docs/docs/` with this organization:
- `index.md` - Main documentation landing page
- `quick-start.md` - Getting started guide
- `guides/*.md` - Feature guides and how-tos
- `api/*.md` - API documentation (auto-generated from OpenAPI where possible)
- `self-hosting/*.md` - Deployment and self-hosting guides

## Frontmatter format

Every documentation file must include this frontmatter:

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
4. **Target section** - Where should this live? (guides, api, self-hosting, etc.)

## Sidebar configuration

If creating a new page, I'll update `apps/marketing/astro.config.mjs` to add it to the sidebar:

```js
sidebar: [
  {
    label: "Guides",
    items: [
      { label: "Your Feature", slug: "docs/guides/your-feature" },
    ],
  },
]
```

## Example output

For a feature like "Task Filtering", I would create `apps/marketing/src/content/docs/docs/guides/task-filtering.md`:

```md
---
title: Task Filtering
description: Learn how to filter and find tasks in Sayr
---

# Task Filtering

Quickly find the tasks you need with Sayr's powerful filtering system.

## Quick Filters

Use the filter bar above your task list to filter by:
- **Status**: Backlog, Todo, In Progress, Done, Canceled
- **Priority**: None, Low, Medium, High, Urgent
- **Assignee**: Filter to specific team members
- **Labels**: Filter by one or more labels

## Combining Filters

Filters can be combined. For example, show all "High priority" tasks that are "In Progress" and assigned to you.

## Saving Filter Presets

Save commonly used filter combinations for quick access...
```
