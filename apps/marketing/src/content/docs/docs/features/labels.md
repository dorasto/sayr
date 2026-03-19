---
title: Labels
description: Create and manage color-coded labels to categorize and filter your tasks
sidebar:
   order: 2
---

Labels are color-coded tags that help you categorize, filter, and visually organize tasks. Unlike categories (which group tasks into sections), labels let you apply multiple tags to a single task for cross-cutting concerns like task type, affected area, or team.

## Creating Labels

1. Navigate to **Settings > Labels** in your organization
2. Click **New Label**
3. Enter a name for the label
4. Pick a color to visually identify it
5. Set visibility (public or private)
6. Click **Save**

:::note[Permissions]
Only members with the **Manage labels** permission can create, edit, or delete labels. By default, this permission is only available to administrators.
:::

## Label Properties

| Property | Description |
|----------|-------------|
| **Name** | The label's display text (e.g., `bug`, `feature`, `design`) |
| **Color** | A hex color used for the badge. Choose colors that are meaningful to your team |
| **Visibility** | Controls whether the label appears on the public board |

### Visibility

Setting a label's visibility to **private** means:
- The label badge will not appear on public task pages
- Filters using the label will only work for authenticated members
- Tasks with only private labels appear as "unlabeled" to the public

This is useful for internal tracking labels (e.g., `needs-review`, `blocked`, `customer-reported`) that you don't want to expose publicly.

## Adding Labels to Tasks

Labels can be added to tasks from:

- **Task detail panel** — Click the **Labels** field in the task sidebar
- **Quick create modal** — Select labels when creating a new task
- **Inline on list view** — Click the labels area directly on the task row

You can assign multiple labels to a single task. Labels appear as colored badges on the task card and detail view.

## Filtering by Label

Use labels to narrow your task list:

1. Open the filter panel above the task list
2. Click **Labels**
3. Select one or more labels to filter by

When filtering with multiple labels, you can choose:

- **Any** — Show tasks that have at least one of the selected labels
- **All** — Show tasks that have every selected label

## Removing Labels

### From a Task

Click the label badge on the task to open the label picker and deselect it.

### Deleting a Label

To permanently delete a label from your organization:

1. Go to **Settings > Labels**
2. Click the menu icon next to the label
3. Select **Delete**

Deleting a label removes it from all tasks it was assigned to. This cannot be undone.

## Best Practices

### Use Labels for "What" and Categories for "Where"

- **Labels** answer "what kind of task is this?" — `bug`, `feature`, `docs`, `security`
- **Categories** answer "where does this task belong?" — `Frontend`, `Backend`, `Mobile`

A task might be categorized as `Frontend` (its area) and labeled `bug` + `high-impact` (its type and weight).

### Keep the Label List Short

Too many labels become hard to manage and apply inconsistently. Aim for fewer, well-defined labels that are used regularly. Consider auditing labels periodically and removing ones that are never used.

### Use Color Consistently

Assign meaning to colors so teams can scan tasks visually:

- Red for bugs and blocking issues
- Green for features or improvements
- Blue for documentation
- Yellow for questions or needs-clarification

### Use Private Labels for Internal Workflows

Tracking internal states like `ready-for-review`, `awaiting-response`, or `escalated` without cluttering public task views is a great use case for private labels.
