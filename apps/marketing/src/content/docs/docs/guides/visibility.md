---
title: Visibility Controls
description: Learn how to manage public and private content in Sayr
sidebar:
   order: 3
---

One of Sayr's core features is granular visibility control. Every piece of content — tasks, comments, labels, and timeline entries — can be independently set to public or private, giving you precise control over what your community sees.

## Public vs. Private

| Visibility | Who Can See |
|------------|-------------|
| **Public** | Anyone visiting your organization's public page (`{your-org}.sayr.io`), including unauthenticated visitors |
| **Private** | Only authenticated organization members |

## What Can Be Made Public or Private

### Tasks

A task's visibility controls whether it appears on the public board.

- **Public** — The task is visible on `{your-org}.sayr.io`, including its title, description, status, priority, and public labels
- **Private** — The task is only visible inside the admin dashboard to organization members

Tasks are **private by default**. You choose when to surface them publicly.

Even for public tasks, the visibility of individual comments and timeline entries is controlled separately (see below).

### Comments

Each comment on a task has its own visibility setting, independent of the task itself.

- **Public comments** — Visible to anyone on the task's public page
- **Internal comments** — Only visible to organization members in the admin dashboard

Organization members can post either type. Public (non-member) users can only post public comments.

This lets you have a public task where some comments are visible to your community (official updates, responses to feedback) while others remain internal (team discussions, implementation notes).

### Labels

Labels have a visibility setting that controls whether they appear on public-facing task cards and detail pages.

- **Public labels** — Visible as colored badges on the public board
- **Private labels** — Hidden from public view; only visible to members

Use private labels for internal tracking tags (e.g., `needs-review`, `customer-escalation`) that aren't relevant to the public.

### Timeline Entries

The task activity timeline is shown in the admin dashboard only. Timeline entries from **private GitHub repositories** are always internal. Timeline entries from **public GitHub repositories** may be visible on the public task page.

## Setting Visibility

### On Task Creation

When creating a task, use the **Visibility** toggle in the creation form to set it public or private before saving.

### From the Task Detail Panel

Open any task and click the **Visibility** field to toggle between public and private. Changes take effect immediately.

- A task switched to **private** disappears from the public board instantly
- A task switched to **public** appears on the public board immediately

### On Comment Creation

When writing a comment, use the visibility toggle below the editor to choose public or internal before posting.

### Bulk Updates

Organization admins can bulk-update task visibility from the task list view by selecting multiple tasks and using the bulk action menu.

## Defaults

| Content Type | Default Visibility |
|---|---|
| New tasks | **Private** |
| New comments (by members) | **Public** |
| New comments (by public users) | **Public** (only option) |
| New labels | **Public** |

You can adjust the default for tasks in organization settings.

## Use Cases

### Open Source Projects

Make your roadmap public so contributors can see what's planned, while keeping budget discussions, incident details, and internal notes private:

- **Public**: Feature tasks, bug reports, priorities, status updates, official team responses
- **Private**: Budget tasks, vendor discussions, internal comments on sensitive bugs

### SaaS Product Feedback Board

Collect public feature requests and bug reports while managing your internal backlog privately:

- **Public**: Community-submitted feature requests, known bugs, roadmap items
- **Private**: Internal implementation tasks, technical debt, tasks not ready to share

### Client Projects

Share delivery progress with clients while keeping team-only notes out of sight:

- **Public**: Deliverable tasks and milestone updates (visible to clients via the public URL)
- **Private**: Implementation details, team retrospective notes, internal estimates

## Frequently Asked Questions

**Can I make a comment public after posting it as internal?**

Yes. Open the task, find the comment, and use the comment's menu to change its visibility.

**What happens when I make a task private after it was public?**

It immediately disappears from the public board. Any votes it received are preserved, and they'll reappear if you make the task public again.

**Can a public task have only private labels?**

Yes. If all labels on a public task are private, the task will appear on the public board without any label badges.
