---
title: Public Pages
description: Share your roadmap, collect feedback, and let the community vote on tasks
sidebar:
   order: 2
---

Every organization in Sayr gets its own public-facing pages. Share your roadmap, collect votes on what to build next, and give your community a place to leave feedback. Visitors can browse everything without signing in.

## Accessing Your Public Pages

Your organization's public pages live on a subdomain:

| Environment | URL Format | Example |
|-------------|------------|---------|
| Hosted (sayr.io) | `{your-org}.sayr.io` | `acme.sayr.io` |
| Self-hosted | `{your-org}.{your-domain}` | `acme.feedback.example.com` |

The subdomain uses the slug you chose when creating your organization.

## Task Board

The task board is the landing page. It shows all tasks marked as **public**, so visitors can see what you're working on and what's planned.

Your organization's branding is displayed at the top, including your banner image, logo, name, and description.

Each task on the board shows its title, a short preview of the description, status, category, labels, comment count, vote count, and when it was created. Click any task to open its detail page.

### Sorting and Searching

Tasks can be sorted by **Most popular** (default), **Newest**, or **Trending** using the dropdown above the list. There's also a search bar to filter tasks by keyword as you type.

### Filtering by Category

The sidebar lists your organization's categories with task counts next to each one. Click a category to filter the board. Click it again to clear the filter.

## Task Detail Page

Each task has its own page at `{your-org}.sayr.io/{task-number}` (e.g. `acme.sayr.io/42`).

The sidebar shows the vote button, status, priority, category, and labels. The main content area shows the full title, description with rich text formatting, and the comments section.

### Voting

Signed-in users can upvote tasks to signal what matters to them. One vote per user per task. Click again to remove your vote. Counts update in real-time for everyone viewing the page.

## Submitting Tasks

Signed-in users can submit new tasks directly from the public board. They can start from a blank form or pick from a template if the organization has set any up. Templates pre-fill fields like title, description, labels, or category, making it easier for users to submit structured feedback.

Submitted tasks follow the same visibility rules as everything else on the public pages.

## Comments

The comments section sits below the task description. Anyone can read comments, but posting requires signing in.

Comments show the author's name and avatar, a relative timestamp, and the full rich-text content. Organization members get a **Member** badge next to their name so visitors can tell official responses apart from community feedback. Edited comments show an **(edited)** indicator.

### Posting and Managing Comments

The editor supports formatted text, @mentions for organization members, and keyboard shortcuts. Click **Post** to submit.

You can edit or delete your own comments by hovering over them to reveal the actions menu. Editing replaces the comment inline, and deleting asks for confirmation first.

### Reactions

Comments support emoji reactions. Signed-in users can add or remove reactions by clicking existing reaction badges or using the reaction picker on hover. Anonymous visitors can see reaction counts but can't react. Your own reactions are highlighted.

## What Visitors Can Do

| Action | Anonymous | Signed In |
|--------|-----------|-----------|
| Browse the task board | Yes | Yes |
| Search, sort, and filter | Yes | Yes |
| View task details | Yes | Yes |
| Read comments and reactions | Yes | Yes |
| Vote on tasks | No | Yes |
| Submit new tasks | No | Yes |
| Post comments | No | Yes |
| React to comments | No | Yes |
| Edit/delete own comments | No | Yes |

## Real-Time Updates

Public pages stay in sync automatically. Changes show up for every visitor without refreshing:

- New tasks on the board
- Task updates (title, status, priority, description)
- Vote counts
- New comments
- Organization, label, and category changes

## Visibility

Only content marked as **public** shows up on these pages. Tasks are private by default and only visible in the admin dashboard until you change their visibility. You can flip a task back to private at any time and it disappears from the public board immediately.

Members can post both **internal** comments (team-only) and **public** comments. Non-member users can only post public comments.

See the [Visibility Controls](/docs/visibility/overview) guide for more detail.

## Why Use Public Pages

Public pages turn Sayr into a feedback hub for your product. Instead of managing a separate tool for feature requests or bug reports, your public board gives users a single place to see what's planned, vote on priorities, and leave comments. Your team gets direct signal on what users care about, and users get transparency into what you're building.
