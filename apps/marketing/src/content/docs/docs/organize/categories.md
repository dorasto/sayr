---
title: Categories
description: Organize tasks into categories for clearer structure and targeted GitHub sync routing
sidebar:
   order: 2
---

Categories are named groups that organize your tasks into distinct sections. Unlike labels (which can stack on a task), a task belongs to one category at a time. Categories are visible on the public board as a sidebar filter, and they also power GitHub sync routing.

## Creating Categories

1. Navigate to **Settings > Categories** in your organization
2. Click **New Category**
3. Enter a name
4. Pick a color and an icon
5. Click **Save**

:::note[Permissions]
Only members with the **Manage categories** permission can create, edit, or delete categories. By default, this is restricted to administrators.
:::

## Category Properties

| Property | Description |
|----------|-------------|
| **Name** | The display name shown in the sidebar and task detail (e.g., `Bug Reports`, `Feature Requests`) |
| **Color** | A color for the category badge — helps teams visually distinguish sections |
| **Icon** | A [Tabler icon](https://tabler.io/icons) that represents the category |

## Assigning a Category to a Task

From the task detail panel, find the **Category** field and click it to open the picker. Select a category from the list, or search by name. A task can only belong to one category at a time.

You can also assign a category when creating a task in the quick-create modal.

## How Categories Appear on the Public Board

On your organization's public page (`{your-org}.sayr.io`), categories appear in the left sidebar with a count of public tasks in each one. Visitors can click a category to filter the board to only tasks in that group.

This makes it easy for your community to find relevant feedback and feature requests — a visitor who cares only about mobile bugs can click the `Mobile` or `Bug Reports` category to focus their view.

## Filtering by Category

Inside the admin dashboard:

1. Open the filter panel above the task list
2. Click **Category**
3. Select one or more categories

You can use **Any**, **None**, **Empty** (no category), or **Not Empty** (has any category) filter modes.

## Using Categories with GitHub Sync

Categories double as routing rules for GitHub repository sync. When you create a sync connection, you can tie it to a specific category:

| Sync Configuration | What Happens |
|---|---|
| Linked to **a category** | Only tasks in that category sync with the connected repository. Issues created on GitHub in that repo also land in that category. |
| Linked to **No category** | All tasks in your organization sync to that repository, regardless of category. |

This lets you route tasks to the right repositories automatically. For example:

- `Bug Reports` category → syncs with `my-org/bugs`
- `Documentation` category → syncs with `my-org/docs`
- All tasks (no category filter) → syncs with `my-org/app`

See [GitHub Integration](/docs/organizations/github) for setup instructions.

## Editing and Deleting Categories

### Editing

1. Go to **Settings > Categories**
2. Click the menu icon next to the category
3. Select **Edit**
4. Update the name, color, or icon and save

### Deleting

Deleting a category removes it from all tasks assigned to it. Tasks will no longer belong to any category after deletion.

1. Go to **Settings > Categories**
2. Click the menu icon next to the category
3. Select **Delete** and confirm

:::caution
Deleting a category also removes any GitHub sync connections tied to that category. Those tasks will no longer sync to the previously linked repository.
:::

## Best Practices

### Align Categories with Your Product Areas

Categories work best when they mirror the sections of your product or your team's responsibilities. Examples:

- A SaaS product: `Dashboard`, `API`, `Billing`, `Mobile App`
- An open source library: `Bug Reports`, `Feature Requests`, `Documentation`, `Performance`
- An agency: `Client A`, `Client B`, `Internal`

### Use Categories + Labels Together

- **Categories** define the structural home of a task
- **Labels** add cross-cutting attributes like `urgent`, `blocked`, or `needs-design`

A task in the `API` category might also have the `bug` and `breaking-change` labels.

### One Category per Repo (for GitHub Sync)

If you use GitHub sync, keep a one-to-one relationship between categories and synced repositories. This makes it clear which repository a task will land in when created, and avoids sync conflicts.
