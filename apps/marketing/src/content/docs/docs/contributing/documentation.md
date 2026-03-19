---
title: Writing Documentation
description: How to contribute to Sayr's documentation
sidebar:
   order: 6
---

Contributing to Sayr's documentation is one of the easiest ways to help the project. You can edit docs directly on GitHub without cloning the repository or setting up a local environment.

## Quick Start: Edit on GitHub

Every documentation page has an "Edit page" link at the bottom. Click it to:

1. Fork the repository (if you haven't already)
2. Edit the file directly in GitHub's web editor
3. Submit a pull request with your changes

That's it! No local setup required.

## How the Docs Work

Sayr's documentation is built with [Starlight](https://starlight.astro.build/), a documentation theme for [Astro](https://astro.build/). It transforms Markdown files into a beautiful documentation site.

### Key Features

- **Markdown/MDX** — Write in standard Markdown with optional MDX for React components
- **Automatic navigation** — Sidebar generated from file structure
- **Code highlighting** — Syntax highlighting with [Expressive Code](https://expressive-code.com/)
- **Last updated dates** — Automatically tracked via Git history
- **Edit links** — Direct links to edit any page on GitHub

## File Structure

Documentation lives in the marketing app:

```
apps/marketing/
├── src/
│   ├── content/
│   │   └── docs/
│   │       └── docs/           # All documentation pages
│   │           ├── index.md    # Homepage (/docs)
│   │           ├── quick-start.md
│   │           ├── features/
│   │           │   ├── tasks.md
│   │           │   ├── labels.md
│   │           │   ├── categories.md
│   │           │   ├── templates.md
│   │           │   ├── subtasks.md
│   │           │   ├── task-relations.md
│   │           │   ├── views.md
│   │           │   ├── visibility.md
│   │           │   ├── releases.md
│   │           │   └── public-pages.md
│   │           ├── organizations/
│   │           │   ├── members-and-teams.md
│   │           │   └── github.md
│   │           ├── api/
│   │           │   ├── overview.md
│   │           │   └── reference-v1.mdx
│   │           ├── self-hosting/
│   │           │   ├── get-started.md
│   │           │   └── editions.md
│   │           └── contributing/
│   │               ├── local-development.mdx
│   │               ├── architecture.md
│   │               └── ...
│   └── assets/
│       └── logo.svg
└── astro.config.mjs            # Sidebar and site config
```

### URL Mapping

Files map to URLs as follows:

| File Path | URL |
|-----------|-----|
| `docs/index.md` | `/docs` |
| `docs/quick-start.md` | `/docs/quick-start` |
| `docs/api/overview.md` | `/docs/api/overview` |
| `docs/features/visibility.md` | `/docs/features/visibility` |

## Creating a New Page

### 1. Choose the Right Location

| Content Type | Location | Example |
|--------------|----------|---------|
| Product features | `docs/features/` | Task management, releases, visibility |
| Organization settings | `docs/organizations/` | Members & teams, GitHub integration |
| API documentation | `docs/api/` | Endpoints, WebSocket events |
| Self-hosting | `docs/self-hosting/` | Deployment guides |
| Contributing | `docs/contributing/` | Developer documentation |

:::tip[Creating a New Section]
If your content doesn't fit into an existing category, create a new folder under `docs/` (e.g., `docs/new-section/`). New sections aren't included in the sidebar by default — they need to be added to `astro.config.mjs`. Mention this in your PR and we'll handle the configuration if you're not sure how.
:::

### 2. Create the File

Create a new `.md` or `.mdx` file with frontmatter:

```markdown
---
title: Your Page Title
description: A brief description for SEO and previews
---

Your content here...
```


## Frontmatter Reference

Every documentation page starts with YAML frontmatter:

```yaml
---
title: Page Title              # Required - shown in sidebar and page header
description: Brief description # Required - used for SEO meta tags
sidebar:
   order: 1                    # Optional - controls sidebar position
   label: Custom Label         # Optional - override sidebar text
   badge: New                  # Optional - add a badge (New, Beta, etc.)
   hidden: false               # Optional - hide from sidebar
---
```

## Writing Style Guide

### Tone and Voice

- **Be direct** — Get to the point quickly
- **Be practical** — Focus on what users need to do
- **Be inclusive** — Avoid jargon; explain technical terms
- **Use "you"** — Address the reader directly

### Structure

1. **Start with the goal** — What will readers accomplish?
2. **Show, don't just tell** — Include code examples
3. **Use headings liberally** — Make content scannable
4. **Keep paragraphs short** — 2-4 sentences max

### Formatting Conventions

| Element | Convention |
|---------|------------|
| File paths | Backticks: \`apps/marketing/\` |
| Commands | Code blocks with `bash` language |
| UI elements | **Bold**: Click **Save** |
| Keyboard shortcuts | `Cmd/Ctrl + S` |
| Variables/placeholders | `{placeholder}` or `<placeholder>` |

### Code Blocks

Always specify the language for syntax highlighting:

````markdown
```typescript
const example = "highlighted code";
```
````

For terminal commands:

````markdown
```bash
pnpm dev
```
````

### Callouts

Starlight supports callout boxes for important information:

```markdown
:::note
Helpful additional information.
:::

:::tip
Suggestions for best practices.
:::

:::caution
Important warnings about potential issues.
:::

:::danger
Critical warnings about destructive actions.
:::
```

These render as styled boxes:

:::note
This is a note callout.
:::

:::tip
This is a tip callout.
:::

:::caution
This is a caution callout.
:::

### Tables

Use tables for structured information:

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |
```

These render as styled tables:
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |

### Links

- **Internal links**: Use relative paths starting with `/docs/`
  ```markdown
  See the [Architecture Overview](/docs/contributing/architecture)
  ```

- **External links**: Use full URLs
  ```markdown
  Learn more at [Starlight docs](https://starlight.astro.build/)
  ```

## Using MDX

For pages that need React components, use `.mdx` extension:

```mdx
---
title: Interactive Page
---

import { MyComponent } from '../../components/MyComponent';

Regular markdown content...

<MyComponent prop="value" />

More markdown...
```

:::caution
Only use MDX when you need React components. Plain Markdown (`.md`) is simpler and preferred for most documentation.
:::

## Configuration

The sidebar uses [`starlight-sidebar-topics`](https://github.com/HiDeoo/starlight-sidebar-topics) to create separate navigation topics. Configuration is in `apps/marketing/astro.config.mjs`:

```javascript
starlightSidebarTopics([
   {
      label: "Documentation",
      link: "/docs/",
      icon: "open-book",
      id: "docs",
      items: [
         {
            label: "Getting Started",
            items: [
               { label: "Introduction", slug: "docs" },
               { label: "Quick Start", slug: "docs/quick-start" },
            ],
         },
         {
            label: "Features",
            autogenerate: { directory: "/docs/features" },
            collapsed: true,
         },
         {
            label: "Organizations",
            autogenerate: { directory: "/docs/organizations" },
            collapsed: true,
         },
         // ...
      ],
   },
]),
```

### Configuration Options

- **Manual items**: Explicitly listed pages with `{ label, slug }`
- **Autogenerate**: Automatically includes all pages in a directory
- **Topics**: Separate top-level navigation tabs (Documentation, Contributing)

## Local Preview

To preview documentation changes locally:

```bash
# From repository root
pnpm -F marketing dev

# Opens at http://localhost:3002
```

## Checklist Before Submitting

- [ ] Frontmatter includes `title` and `description`
- [ ] Content follows the writing style guide
- [ ] Code blocks have language specified
- [ ] Links use correct paths (internal: `/docs/...`, external: full URL)
- [ ] Images have alt text (if any)
- [ ] Page renders correctly in local preview (if testing locally)

## Automatic Page Metadata

Every documentation page displays metadata that's automatically populated from Git history.

#### Author

The **author** is the person who created the file (made the first commit). Their GitHub avatar and linked username appear below the page title.

#### Contributors

**Contributors** are anyone who has committed changes to the file after the initial creation. They appear as a row of avatars, linking to their GitHub profiles.

#### Last Updated

The **last updated** date reflects when the file was last modified, based on the most recent Git commit that touched the file.

:::note
All metadata is extracted from Git history automatically — you don't need to add anything to your frontmatter. Just commit your changes and the system handles the rest.
:::

### How It Works

The metadata is populated through a build-time pre-computation system that extracts Git history during the build process.

**Build Time Process:**

1. An Astro integration (`apps/marketing/src/integrations/precompute-contributors.ts`) runs during `pnpm run build`
2. It scans all documentation files in `src/content/docs/`
3. For each file, it executes `git log --follow` to retrieve the complete commit history
4. Author data is extracted from the oldest commit (file creation)
5. Contributor data is aggregated from all subsequent commits
6. For each contributor with a GitHub username, profile data (avatar URL, profile link) is fetched from GitHub's API
7. All metadata (including GitHub avatars) is written to `src/data/contributors.json`
8. This JSON file is committed to the repository and copied to `dist/server/data/` and `dist/client/data/` during builds

**Runtime Process:**

1. Route middleware (`apps/marketing/src/routeData/contributors.ts`) loads the pre-computed JSON at server startup
2. For each page request, it looks up the file path in the cached contributor data
3. Metadata is attached to the route context with all GitHub data already included
4. The `PageTitle` component renders the author, contributors, and last updated information using pre-fetched avatars

**Email-to-GitHub Mapping:**

The system extracts GitHub usernames using two methods:
1. **GitHub noreply emails**: Automatically parsed from formats like `username@users.noreply.github.com` or `12345678+username@users.noreply.github.com`
2. **Manual mapping**: Custom emails (like `tommerty@doras.to`) are mapped to GitHub usernames in the integration's `EMAIL_TO_GITHUB` configuration

Once a GitHub username is identified, the build process fetches the user's avatar URL and profile link from GitHub's API. This data is stored in `contributors.json`, eliminating the need for any runtime API calls.

:::tip[Why Pre-compute and Commit?]
By pre-computing contributor data and committing it to the repository:
- **Zero runtime dependencies**: No Git repository or GitHub API calls needed in production
- **Maximum performance**: All data is pre-fetched and cached in a single JSON file
- **Docker-friendly**: The `.git` directory isn't required in production containers
- **Build anywhere**: Works in any CI/CD environment without Git access
- **Fast page loads**: No external API calls delay page rendering
:::

## Related Resources

- [Starlight Documentation](https://starlight.astro.build/) — Full Starlight reference
- [Markdown Guide](https://www.markdownguide.org/) — Markdown syntax reference
- [Pull Request Guidelines](/docs/contributing/guidelines/pull-requests) — How to submit your changes
