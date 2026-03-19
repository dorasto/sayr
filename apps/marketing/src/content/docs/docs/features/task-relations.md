---
title: Task Relations
description: Link tasks together to express dependencies, blockers, and related work
sidebar:
   order: 6
---

Task relations let you express how tasks are connected to each other. Rather than scattering notes about dependencies in descriptions or comments, you can create structured links between tasks that your whole team can see at a glance.

## Relation Types

| Relation | Meaning |
|----------|---------|
| **Blocks** | This task must be completed before another task can start |
| **Blocked by** | This task cannot start until another task is completed |
| **Relates to** | These tasks are connected but neither blocks the other |

When you create a "Blocks" relation from Task A to Task B, the reverse relation ("Blocked by") is automatically created on Task B. Relations are always shown on both sides.

## Creating a Relation

1. Open a task
2. Find the **Relations** section in the task detail panel
3. Click **Add Relation**
4. Choose the relation type (Blocks, Blocked by, Relates to)
5. Search for the task you want to link by title or task ID
6. Click **Add**

The relation is immediately visible on both tasks.

## Viewing Relations

The **Relations** section of each task shows all related tasks with:

- The relation type badge
- The related task's title, status, and priority
- A link to open the related task

## Removing a Relation

To remove a relation:

1. Open either task in the relation
2. Find the relation in the **Relations** section
3. Click the menu icon next to it and select **Remove**

Removing a relation from either side removes it from both tasks.

## When to Use Relations vs. Subtasks

Use **task relations** when:
- Two tasks are independent units of work that happen to be connected
- You want to model dependencies across different teams or projects
- The tasks have their own timelines, assignees, and releases

Use **subtasks** ([Subtasks](/docs/features/subtasks)) when:
- A task is clearly a component or step within a larger task
- You want a progress indicator (e.g., 3/5 subtasks complete)
- The sub-items shouldn't appear in the main task list independently

## Tips

**Use "Blocks" to surface bottlenecks** — Marking tasks as blockers makes it easy to identify what's holding up progress. If a backend task blocks a frontend task, everyone can see that the frontend work can't start yet.

**Use "Relates to" for context** — When a bug is discovered while working on a feature, linking the two with "Relates to" gives future contributors context without implying one blocks the other.

**Check relations during planning** — Before starting a task, check if it's blocked by anything. Before marking a task done, check if it blocks anything that's now unblocked.
