---
title: Task Views
description: Learn how to organize and visualize your tasks with customizable views in Sayr
sidebar:
   order: 2
---

Sayr provides flexible ways to view and organize your tasks. Whether you prefer a kanban board or a structured list, you can customize exactly how your tasks are displayed.

## View Modes

### Kanban View

The kanban view displays tasks as cards organized into columns. This is ideal for visualizing workflow and moving tasks through stages.

- Drag and drop tasks between columns
- See task counts per column at a glance
- Great for tracking progress through statuses

### List View

The list view shows tasks in a compact, scannable format with collapsible sections.

- See more tasks at once
- Quickly scan task details
- Collapse sections to focus on specific groups

## Grouping

Group your tasks by different properties to organize them in ways that make sense for your workflow.

| Group By | Description |
|----------|-------------|
| Status | Backlog, Todo, In Progress, Done, Canceled |
| Priority | Urgent, High, Medium, Low, None |
| Assignee | Tasks grouped by team member |
| Category | Custom categories you've created |

### How to Change Grouping

1. Click the **View** dropdown above your task list
2. Select **Group by**
3. Choose your preferred grouping option

## Sub-Grouping

Take organization further with two-level grouping. Sub-grouping creates nested sections within your primary groups.

**Example:** Group by Status, then sub-group by Priority to see:
- **Backlog** → Urgent, High, Medium, Low
- **Todo** → Urgent, High, Medium, Low
- **In Progress** → Urgent, High, Medium, Low

This creates a grid-like view in Kanban mode, similar to Linear's approach, where:
- Column headers show your primary grouping (e.g., Status)
- Row headers show your sub-grouping (e.g., Priority)
- Tasks appear in the intersection cell

### Setting Up Sub-Grouping

1. Click the **View** dropdown
2. Set your primary **Group by** option
3. Select **Sub-group by** and choose a secondary grouping

The sub-group options automatically exclude your primary grouping to avoid redundancy.

## Filtering

Narrow down which tasks are displayed using filters.

### Available Filters

- **Status**: Show only specific statuses
- **Priority**: Filter by priority level
- **Assignee**: Show tasks for specific team members
- **Labels**: Filter by one or more labels
- **Category**: Show tasks in specific categories

### Combining Filters

Filters work together. For example, show all "High priority" tasks that are "In Progress" and have the "Bug" label.

### Show Completed Tasks

Toggle whether to include completed (Done/Canceled) tasks in your view. Hide them to focus on active work.

## Saving Custom Views

Save your preferred view configurations for quick access later.

### Creating a Saved View

1. Set up your preferred view mode, grouping, sub-grouping, and filters
2. Click the **Save View** button
3. Give your view a name
4. Choose an icon (optional)
5. Click **Save**

### What Gets Saved

A saved view remembers:
- View mode (Kanban or List)
- Primary grouping
- Sub-grouping (if set)
- All active filters
- Show completed tasks setting

### Managing Saved Views

Access saved views from the view selector dropdown. Organization admins can:
- Edit view settings
- Rename views
- Delete views no longer needed

### Shared Views

Saved views are available to all organization members, making it easy to establish consistent ways of looking at tasks across your team.

## Responsive Column Sizing

In Kanban view with sub-grouping enabled, columns automatically adjust their width based on available space:

- **When space allows**: Columns expand equally to fill the container
- **When space is limited**: Columns maintain a minimum width and horizontal scrolling activates

This ensures tasks remain readable regardless of how many columns are displayed.

## Tips

### For Sprint Planning
Group by Status, sub-group by Priority. This shows what's queued up and helps prioritize the backlog.

### For Daily Standups
Group by Assignee, filter to "In Progress" only. Quickly see what everyone is working on.

### For Release Management
Group by Category, sub-group by Status. See feature progress across different areas of your product.

### For Bug Triage
Filter to "Bug" label, group by Priority. Focus on fixing the most critical issues first.
