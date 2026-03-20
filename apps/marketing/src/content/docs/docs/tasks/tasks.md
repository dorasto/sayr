---
title: Tasks
description: Create, edit, and manage tasks in Sayr — the core unit of your project workflow
sidebar:
   order: 1
---

Tasks are the fundamental building block of every Sayr organization. Each task represents a piece of work, a bug report, a feature request, or any trackable item your team needs to manage.

## Creating a Task

### From the Task List

1. Open your organization's task list
2. Click **New Task** in the top right
3. Fill in the task title & description
4. Optionally set status, priority, labels, assignees, category, and release
5. Click **Create** (or press `Enter` in the title field for a quick create)

### From a Template

If your organization has [issue templates](/docs/tasks/templates) set up, click the dropdown arrow next to **New Task** to pick a template. The template pre-fills fields like title prefix, description, labels, and category.

### From the Public Board

If your organization has public submissions enabled, signed-in visitors can submit tasks directly from `{your-org}.sayr.io`. Submitted tasks appear in the admin dashboard for your team to review.

## Task Properties

Every task has a set of properties you can configure from the task detail panel.

### Title

The task's display name. Keep it concise and descriptive. Titles appear on the task board, in notifications, and in GitHub issue syncs.

### Description

A rich-text field for the full details. The editor supports:

- Paragraphs, headings, and bullet/numbered lists
- Bold, italic, underline, and strikethrough
- Code blocks with syntax highlighting
- Images and attachments
- @mentions to notify organization members

### Status

Where the task currently sits in your workflow.

| Status | Meaning |
|--------|---------|
| **Backlog** | Not yet started; needs to be prioritized |
| **Todo** | Planned and ready to be picked up |
| **In Progress** | Actively being worked on |
| **Done** | Completed |
| **Canceled** | Decided not to do |

### Priority

How urgent or important the task is.

| Priority | When to Use |
|----------|-------------|
| **Urgent** | Needs immediate attention, blocking work |
| **High** | Important, should be worked on soon |
| **Medium** | Normal priority |
| **Low** | Nice to have, can wait |
| **None** | Priority not yet assigned |

### Labels

Color-coded tags for categorizing tasks. A task can have multiple labels. Common uses:

- Task type: `bug`, `feature`, `improvement`
- Area: `frontend`, `backend`, `docs`
- Team: `design`, `engineering`

Labels are created and managed separately. See [Labels](/docs/organize/labels).

### Category

A single category that groups related tasks. Categories are used for:

- Organizing tasks into sections visible on the public board
- Routing tasks to the correct GitHub repository when syncing

See [Categories](/docs/organize/categories).

### Assignees

Team members responsible for the task. Tasks can have multiple assignees. Each assignee receives a notification when added.

### Release

Link the task to a specific release or milestone. This is how you track which tasks are shipping in each version. See [Releases](/docs/organize/releases).

### Visibility

Control whether the task is visible to the public or only to organization members.

| Setting | Who Can See |
|---------|-------------|
| **Public** | Anyone visiting `{your-org}.sayr.io` |
| **Private** | Only authenticated organization members |

See [Visibility Controls](/docs/visibility/overview) for full details.

## Editing a Task

Open a task by clicking its title anywhere in the app. The task detail panel opens on the right (or as a full-page view).

### Inline Editing

Most properties can be edited by clicking directly on them:

- Click the title to rename it
- Click any status, priority, or other property to open its dropdown
- Click in the description area to start editing

Changes save automatically as you type or when you leave a field.


## Task Activity & Timeline

Every task has a timeline that automatically records changes:

- Status changes with before/after values
- Priority changes
- Assignees added or removed
- Labels added or removed
- Category changes
- Release assignment changes
- Visibility changes
- Comments added or edited
- GitHub commits and pull requests referencing the task

The timeline is visible at the bottom of every task detail view, giving you a full audit trail.

## Subtasks

Tasks can be organized into parent-child hierarchies. A **subtask** is a task that belongs to a parent task.

See [Subtasks](/docs/tasks/subtasks) for full details.

## Task Relations

Tasks can be linked to each other to express dependencies:

- **Blocks** — This task is blocking another
- **Depends on** — This task cannot start until another is done
- **Related to** — These tasks are related but independent

See [Task Relations](/docs/tasks/task-relations) for full details.

## Comments

The comments section is below the task description. Use comments to:

- Ask questions or share updates
- Record decisions
- Leave review feedback

Comments support the same rich-text editor as descriptions, including @mentions and reactions.

Organization members can post **internal** comments (only visible to members) or **public** comments (visible on the public board too). Public users can only post public comments.

See [Public Pages](/docs/visibility/public-pages) for more on how comments appear to external visitors.

## Voting

Visitors and members can upvote tasks to signal what matters most. Voting is only available on public tasks when public pages are enabled.

## Deleting a Task

Open the task and use the task menu (three-dot icon) to find the **Delete** option. Deleting is permanent and cannot be undone. Only members with the appropriate permission can delete tasks.

## Permissions Summary

| Action | Who Can Do It |
|--------|---------------|
| View tasks | All members; public tasks visible to anyone |
| Create tasks | Members with Create permission (default: all members) |
| Edit own tasks | Members who created or are assigned to the task |
| Edit any task | Members with Edit Any permission |
| Change status | Members with Change Status permission (default: all members) |
| Change priority | Members with Change Priority permission (default: all members) |
| Delete tasks | Members with Delete Any permission |

See [Members, Teams & Permissions](/docs/organizations/members-and-teams) for full permission details.
