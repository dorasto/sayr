---
title: Subtasks
description: Break down large tasks into smaller, trackable pieces with parent-child task hierarchies
sidebar:
   order: 5
---

Subtasks let you break large tasks into smaller, independently trackable units. A parent task can have multiple subtasks, and each subtask is a fully functional task in its own right — with its own status, priority, assignees, labels, and timeline.

## Creating Subtasks

### From the Task Detail Panel

1. Open any task
2. Find the **Subtasks** section in the task detail
3. Click **Add Subtask**
4. Enter the subtask title and optionally set other fields
5. Press Enter or click **Create**

The subtask is immediately associated with the parent and appears in the subtasks list.

### From the Quick Create Modal

When creating a new task, you can assign it as a subtask of an existing task by setting the **Parent Task** field.

## The Parent Task View

When you open a task that has subtasks, a **Subtasks** section shows:

- All subtasks with their status, priority, and assignees
- A progress indicator showing how many subtasks are completed
- A button to add more subtasks

Clicking any subtask opens it as a full task, where you can edit all of its properties.

## Subtask Properties

Subtasks inherit no properties from the parent. Each subtask has its own:

- Title and description
- Status, priority, and assignees
- Labels and category
- Visibility setting
- Timeline and comments

This means a subtask can have a different assignee, status, and priority from its parent task.

## Navigating Between Parent and Subtasks

- **From a subtask** — A breadcrumb or "Parent" link at the top of the subtask detail takes you back to the parent task
- **From the parent** — The subtasks list shows a quick overview and links into each subtask

## Promoting a Subtask to a Top-Level Task

To remove a subtask from its parent (making it an independent task):

1. Open the subtask
2. Find the **Parent** field in the task sidebar
3. Click the parent link and select **Remove parent**

The task becomes a standalone task and no longer appears in the parent's subtask list.

## Subtasks and Visibility

Each subtask has its own visibility setting (public or private). A subtask's visibility is independent of the parent task's visibility. You can have a public parent task with private subtasks (for internal implementation details) or private parent tasks with public subtasks.

## Subtasks and Progress Tracking

The parent task's subtask section shows a count of completed subtasks versus total subtasks. This gives a quick at-a-glance progress view, similar to a checklist:

- `3 / 5 subtasks complete`

The parent task's own status is set manually — completing all subtasks does not automatically close the parent task.

## Limitations

- Subtasks can only be one level deep — a subtask cannot itself have subtasks
- Subtasks are not shown in the main task list by default; they appear within the parent task's detail view

## When to Use Subtasks vs. Task Relations

Use **subtasks** when:
- A piece of work is clearly a component of a larger task
- You want to track granular progress within a single deliverable
- The sub-items would clutter the main task list

Use **task relations** ([Relations](/docs/features/task-relations)) when:
- Two tasks are independent but related or dependent
- You want to express that one task blocks another
- Tasks may be worked on by different teams

## Tips

**Keep subtasks small** — A subtask should represent a few hours to a day of work at most. If it's larger, consider making it a separate task with a relation instead.

**Use subtasks for checklists** — For simple multi-step tasks, subtasks work well as a trackable checklist with their own assignees and statuses.

**Group related work** — If you're implementing a feature that has a backend task, a frontend task, and a docs task, create these as three subtasks under a parent "Implement X feature" task.
