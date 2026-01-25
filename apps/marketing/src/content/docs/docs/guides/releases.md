---
title: Releases
description: Organize tasks into milestones and track progress toward version goals
---

Releases help you group tasks into meaningful milestones, versions, or deliverables. Track what's shipping in v1.0, what's planned for Q2, or organize work by any time-based or goal-based grouping that makes sense for your team.

## What Are Releases?

A **release** is a container for tasks that represents a specific milestone or version. Think of it as a bucket that holds all the work needed to ship a particular goal.

Common use cases:
- **Software versions**: v1.0.0, v1.1.0, v2.0.0
- **Time periods**: Q1 2025, January Sprint, Spring Release
- **Milestones**: MVP Launch, Beta Release, Public Launch
- **Themes**: Performance Improvements, UI Refresh

Each release tracks:
- Which tasks belong to it
- Progress toward completion
- Target and actual release dates
- Current status (planned, in progress, released, archived)

## Creating a Release

### From the Releases Page

1. Navigate to **Releases** in your organization
2. Click **New Release**
3. Configure your release:
   - **Name**: The display name (e.g., "v1.0.0", "Q1 2025")
   - **Slug**: URL-friendly identifier (auto-generated, editable)
   - **Icon & Color**: Visual identifier for quick recognition
   - **Status**: Current state (planned, in progress, released, archived)
   - **Target Date**: When you plan to ship (optional)
   - **Description**: Rich text details about the release (optional)

### From Settings

Organization admins can also manage releases from **Settings → Releases**:
- Create releases with an inline form
- View all releases grouped by status
- See task counts at a glance

:::note[Permissions]
Only **organization admins** can create, edit, or delete releases. All members can view releases and assign tasks to them.
:::

## Release Properties

| Property | Description |
|----------|-------------|
| **Name** | Display name shown throughout the app |
| **Slug** | Unique URL identifier (must be unique within your organization) |
| **Icon** | Optional Tabler icon for visual recognition |
| **Color** | Custom color for the release badge |
| **Status** | Current state: Planned, In Progress, Released, or Archived |
| **Target Date** | Planned ship date |
| **Released At** | Actual release date (auto-set when marked as released) |
| **Description** | Rich text description with formatting support |

## Release Statuses

Releases move through four distinct statuses:

| Status | When to Use | What It Means |
|--------|-------------|---------------|
| **Planned** | Future work | Tasks are being identified and planned |
| **In Progress** | Active development | Team is actively working on tasks |
| **Released** | Shipped to users | Work is complete and shipped |
| **Archived** | Historical | Release is complete and no longer active |

### Marking a Release as Released

When you mark a release as **Released**:
1. The status changes to "Released"
2. The actual release date is recorded
3. All incomplete tasks (except canceled) are **automatically closed** to "Done"
4. Timeline entries are created for auto-closed tasks

:::caution[Auto-Close Warning]
Marking a release as released will close all open tasks. Review your task list first to ensure everything is ready to ship.
:::

## Assigning Tasks to Releases

### From Task Detail

1. Open any task
2. Find the **Release** dropdown in the task sidebar
3. Select a release from the list
4. The task is immediately assigned

You can search for releases by name and see a "No release" option to unassign.

### During Task Creation

When creating a new task, select a release from the release picker to assign it immediately.

### Release Badges

Tasks assigned to releases show a compact badge with:
- The release icon (if set) or colored dot
- The release name
- Click the badge to filter all tasks in that release

## Viewing Release Progress

### Release Detail Page

Navigate to a release to see:

**Header Section**:
- Name, slug, and status
- Target date with countdown/overdue indicator
- Description with rich formatting
- Quick actions (edit, mark as released, delete)

**Task List**:
- All tasks assigned to this release
- Standard list/kanban views
- Full filtering and sorting capabilities

**Analytics Sidebar** (collapsible):
- **Progress Chart**: Completion over time
- **Status Breakdown**: Tasks by status with progress bar
- **Priority Distribution**: Task counts by priority level
- **Assignee Workload**: Who's working on what (clickable to filter)

### Release Index

The main releases page shows:
- All releases grouped by status (Active, Released, Archived)
- Visual tiles with icon, name, and color
- Task counts per release
- Quick navigation to release details

## Filtering by Release

### Quick Filters

Click a release badge on any task to instantly filter the task list to that release.

### Advanced Filters

Use the filter dropdown to combine release filters with other criteria:

- **Any**: Show tasks in any of the selected releases
- **None**: Exclude tasks in selected releases
- **Empty**: Show tasks with no release assigned
- **Not Empty**: Show tasks with any release

Combine with status, priority, assignee, labels, and more for powerful queries.

## Managing Releases

### Editing

**Name & Slug**: Click to edit inline, changes save automatically on blur

**Icon & Color**: Click the icon to open the picker and choose new styling

**Status**: Use the status dropdown in the header or info panel

**Target Date**: Click the date to open a calendar picker

**Description**: Edit in the rich text editor and click save

### Deleting

:::danger[Permanent Deletion]
Deleting a release is permanent and cannot be undone.
:::

When you delete a release:
1. All tasks are **unassigned** from the release (releaseId set to null)
2. The release is permanently removed
3. Task history remains (timeline shows the release was removed)

Only organization admins can delete releases.

## Release Analytics

### Progress Tracking

The release detail page shows completion trends over time with an area chart. Track:
- Total task count (grows as tasks are added)
- Completed task count (increases toward total)
- Visual trajectory toward your target date

### Workload Distribution

See which team members are working on release tasks:
- Tile charts show assignee task counts
- Unassigned tasks are highlighted
- Click any tile to filter tasks by that assignee + release

### Priority Analysis

Understand the risk profile of your release:
- Bar chart shows task distribution by priority
- Identify if critical work is balanced
- Spot potential bottlenecks

## Best Practices

### Naming Conventions

**Be consistent** with your naming scheme:
- Semantic versioning: `v1.0.0`, `v1.1.0`, `v2.0.0`
- Time-based: `2025-Q1`, `January Sprint`, `Week 5`
- Milestones: `MVP`, `Beta`, `GA (General Availability)`

### Use Colors & Icons Strategically

- Color-code by **quarter** (Q1 = blue, Q2 = green, Q3 = yellow, Q4 = red)
- Color-code by **type** (features = purple, bugs = red, maintenance = gray)
- Use icons to indicate release **stage** (rocket for shipped, checklist for planned)

### Set Target Dates

Even rough target dates help:
- Teams can prioritize work
- Charts show time remaining
- Stakeholders know when to expect delivery

### Transition Statuses

Move releases through statuses to maintain clarity:
1. **Planned** → when scoping work
2. **In Progress** → when development starts
3. **Released** → when shipped to users
4. **Archived** → when historical and no longer referenced

### Archive Old Releases

Keep your active releases list clean:
- Archive releases after they're shipped and stable
- Archived releases remain viewable but don't clutter active work
- Historical data is preserved for reference

## Release Permissions

| Action | Who Can Do It |
|--------|---------------|
| View releases | All organization members |
| Create releases | Organization admins only |
| Edit releases | Organization admins only |
| Delete releases | Organization admins only |
| Mark as released | Organization admins only |
| Assign tasks to releases | All organization members |

## Real-Time Collaboration

Releases support real-time updates via WebSocket:
- Changes sync instantly across all connected clients
- Multiple team members can work on release planning simultaneously
- Task assignments to releases update live
- Status changes broadcast immediately

## Common Workflows

### Planning a Version Release

1. Create a new release with status "Planned"
2. Set a target date based on your roadmap
3. Add tasks to the release as they're identified
4. Monitor progress in the analytics sidebar
5. When development starts, change status to "In Progress"
6. Track completion with the progress chart
7. When shipped, mark the release as "Released" (auto-closes tasks)
8. After stabilization, archive the release

### Sprint Planning

1. Create a release for each sprint (e.g., "Sprint 23", "Week of Jan 15")
2. Assign sprint tasks during planning
3. Use the kanban view grouped by status to manage the sprint
4. Check assignee workload to balance capacity
5. Mark as released when the sprint ends
6. Archive the sprint release for historical reference

### Milestone Tracking

1. Create milestone releases (e.g., "MVP", "Beta Launch", "Public GA")
2. Assign all related tasks
3. Share the release page with stakeholders for visibility
4. Update status as you progress
5. Use the progress chart in presentations
6. Mark as released when the milestone is achieved

## Tips & Tricks

**Use releases with filters**: Combine release filters with assignee filters to see your tasks in the current release.

**Bookmark release pages**: The release detail page URL is stable — bookmark it for quick access.

**Clone releases**: When creating a new version, reference the previous version's task list to identify ongoing work.

**Release descriptions**: Use the rich text editor to add context, links, and formatting. Great for:
- Feature highlights
- Breaking changes
- Migration guides
- Known issues

**Group by release**: In your task list, group tasks by release to see what's shipping when.

**Empty release filter**: Use "Empty" release filter to find unassigned tasks that need planning.

---

Releases provide powerful organization for time-based or goal-based planning. Combined with Sayr's task management, filtering, and analytics, you can track progress and communicate clearly with your team and stakeholders.
