---
title: GitHub
description: Connect your Sayr organization to GitHub for two-way task and issue syncing
sidebar:
   order: 2
---

Sayr integrates directly with GitHub so your tasks and issues stay in sync across both platforms. You can connect one or more GitHub organizations (or personal accounts) to a Sayr organization, choose which repositories Sayr can access, and configure automatic two-way syncing between Sayr tasks and GitHub issues.

## Connecting a GitHub organization

Before you can sync tasks, you need to link a GitHub installation to your Sayr organization.

1. Navigate to **Settings > Connections > GitHub** inside your Sayr organization.
2. Click the **+** button next to "GitHub connections".
3. If your GitHub account is not yet connected to Sayr, you will be prompted to connect it first under your personal connection settings.
4. Once connected, you will see a list of GitHub organizations and accounts that have the Sayr GitHub App installed. Click **Connect** next to the one you want to link.
5. If the GitHub organization you need is not listed, click **Install to another GitHub account** to install the Sayr GitHub App on a new GitHub organization or personal account.

### Choosing repository access

When you install or configure the Sayr GitHub App on GitHub, you control which repositories Sayr has access to. You can grant access to:

- **All repositories** in the GitHub organization
- **Select repositories** - only specific repositories you choose

This is managed entirely on the GitHub side. To change which repositories are available, click the **three-dot menu** on a connected installation and select **Configure** to open the GitHub App settings.

### Using one GitHub organization across multiple Sayr organizations

A single GitHub organization can be connected to more than one Sayr organization. Each Sayr organization can then sync with different repositories from that same GitHub organization.

For example:
- **Sayr Org A** syncs with `my-github-org/frontend`
- **Sayr Org B** syncs with `my-github-org/backend`

This allows teams to share a GitHub organization while keeping their Sayr workspaces separate.

## Task syncing

Once a GitHub installation is connected, you can set up task syncing to automatically create GitHub issues from Sayr tasks and vice versa.

### Creating a sync connection

1. Under the **Task syncing** section on the GitHub connections page, click the **+** button.
2. Select a **GitHub repository** from the dropdown. This lists all repositories available from your connected GitHub installations.
3. Select a **Category** to filter which Sayr tasks are synced, or choose **No category** to sync all tasks.
4. Click **Create sync**.

### How syncing works

| Sync configuration | What happens |
|---|---|
| Repository linked to **No category** | Every task created in your Sayr organization creates a corresponding GitHub issue on that repository, and issues created on GitHub create tasks in Sayr. |
| Repository linked to a **specific category** (e.g. "Bug Reports") | Only Sayr tasks with that category create GitHub issues on the linked repository. Issues created on that GitHub repository create tasks in Sayr under that category. |

This gives you fine-grained control over which tasks flow to which repositories.

**Example setup:**

| GitHub repository | Sayr category | Result |
|---|---|---|
| `my-org/app` | No category | All tasks sync to this repo |
| `my-org/docs` | Documentation | Only "Documentation" tasks sync to this repo |
| `my-org/bugs` | Bug Reports | Only "Bug Reports" tasks sync to this repo |

### Managing sync connections

Each sync connection can be individually managed:

- **Enable / Disable** - Toggle syncing on or off without removing the connection. Click the status indicator or use the dropdown menu on a sync entry.
- **Edit** - Change the linked repository or category for an existing sync.
- **Remove** - Permanently delete a sync connection.

## Referencing tasks from GitHub

You can reference Sayr tasks directly from GitHub commit messages, pull request titles, pull request descriptions, and issue bodies. Sayr recognizes special keywords and automatically links activity back to the relevant task on its timeline.

### Task reference format

To reference a task, use a keyword followed by the task's short ID number. The short ID is the numeric identifier shown on each task in Sayr (e.g. if your task is displayed as `SA-42`, the short ID is `42`).

Supported formats:

```
Ref #42
Ref 42
Fixes #42
Sayr 42
```

The `#` prefix is optional. Keywords are case-insensitive.

### Supported keywords

| Keyword | Action | Example |
|---|---|---|
| `Ref` | Links the GitHub activity to the task timeline | `Ref #42` |
| `Sayr` | Links the GitHub activity to the task timeline | `Sayr 42` |
| `Fixes` / `Fixed` | Marks the task as **Done** | `Fixes #15` |
| `Closes` / `Closed` | Marks the task as **Done** | `Closes 15` |
| `Resolves` / `Resolved` | Marks the task as **Done** | `Resolved #8` |
| `Blocked by` | Marks a blocking relationship (coming soon) | `Blocked by #30` |

You can include multiple keywords in a single message to reference several tasks at once:

```
feat: add dark mode support

Fixes #42
Ref #18
```

### Commit references

When you push commits to a connected repository, Sayr scans each commit message for task references. If a match is found, the commit appears on the task's timeline with the commit SHA, message, and a link back to the commit on GitHub.

For example, this commit message:

```
fix: resolve login timeout — Fixes #12
```

will mark task 12 as **Done** and add a commit reference to its timeline.

### Pull request linking

When a pull request title or body contains a task reference, Sayr automatically links the PR to that task. The linked PR appears on the task's timeline showing the PR number, title, branch info, and current status.

Sayr tracks the full lifecycle of linked pull requests:

- **Opened** — The PR is linked to the task and appears on the timeline.
- **Synchronized** — New commits pushed to the PR are individually tracked on the task timeline.
- **Merged** — The task is automatically marked as **Done** and a merge event is recorded on the timeline.
- **Closed without merging** — A close event is recorded on the timeline, but the task status is not changed.

### Comment syncing

Comments made on linked GitHub issues or pull requests are automatically synced to the corresponding Sayr task as comments. If the GitHub commenter has their GitHub account connected to Sayr, the comment is attributed to their Sayr user. Otherwise, it appears with their GitHub username and a link to the original comment.

### Visibility

Timeline entries and synced comments respect the privacy of the source repository. Activity from **private** repositories is marked as internal and only visible to organization members, while activity from **public** repositories is visible on the public task view as well.

## Removing a GitHub connection

To disconnect a GitHub installation from your Sayr organization:

1. Click the **three-dot menu** on the installation under "GitHub connections".
2. Select **Remove**.

This removes all linked repository syncs for that installation within Sayr. It does not uninstall the GitHub App from your GitHub organization. To fully uninstall, use the **Configure** option to manage the app in GitHub's settings.
