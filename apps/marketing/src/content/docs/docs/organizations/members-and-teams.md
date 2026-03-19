---
title: Members, Teams & Permissions
description: Invite members, organize them into teams, and control what they can do with granular permissions
sidebar:
   order: 3
---

Every Sayr organization has members and teams. Members are the people who work in your organization. Teams group members together and define what they are allowed to do through a granular permission system.

## Members

### Inviting Members

1. Navigate to **Settings > Members** in your organization
2. Click **Invite Member**
3. Enter the user's email address or username
4. The invited user receives a notification and can accept or decline

:::note[Plan Limits]
On Sayr Cloud, the free plan allows up to **5 members** per organization. Upgrade to the Pro plan for unlimited members. Self-hosted editions (Community and Enterprise) have no member limits.
:::

### Member Roles

Every member belongs to one or more teams. A member's effective permissions are determined by the teams they belong to. Members who haven't been added to any team receive a baseline set of default permissions (see [Default Permissions](#default-permissions)).

### Removing Members

Organization administrators or members with the **Manage members** permission can remove members from the organization. Removing a member revokes all access immediately. Tasks created by or assigned to the removed member are preserved.

---
## Teams

Teams are the building blocks of your permission system. Each team has a name, an optional description, and a set of permissions that apply to every member of that team.

### Creating a Team

1. Navigate to **Settings > Teams**
2. Click **New Team**
3. Give the team a name and description
4. Configure permissions on the **Permissions** tab
5. Click **Create**

:::note[Plan Limits]
On Sayr Cloud, the free plan allows **1 team** per organization which is the default Admin team. The Pro plan supports unlimited teams. Self-hosted editions have no team limits.
:::

### System Teams

When you create an organization, Sayr automatically creates a system **Admin** team. The organization creator is added to this team. System teams cannot be deleted.

### Adding Members to Teams

1. Open the team from **Settings > Teams**
2. Switch to the **Members** tab
3. Click **Add Member** and select from your organization's members

A member can belong to multiple teams. Their effective permissions are the **union** of all their teams' permissions — if any team grants a permission, the member has it.

## Permissions

Sayr uses a granular, toggle-based permission system. Permissions are organized into four categories: **Organization**, **Content Settings**, **Tasks**, and **Moderation**.

### How Permissions Are Resolved

Permissions follow a "most permissive wins" model, similar to Discord:

1. **Platform administrators** and **organization creators** always have full access
2. If any of a member's teams has **Administrator** enabled, they have full access
3. Otherwise, each permission is checked across all teams — if **any** team grants it, the member has it
4. Members not on any team receive the [default permissions](#default-permissions)

### Administrator

The **Administrator** toggle grants full access to everything in the organization. It overrides all other permission settings. When enabled, the remaining toggles are greyed out because they are unnecessary.

Use this for organization owners, co-founders, or trusted leads who need unrestricted access.

### Organization Permissions

| Permission | Description |
|---|---|
| **Manage members** | Invite and remove organization members |
| **Manage teams** | Create, edit, and delete teams |
| **Manage billing** | Access billing information and manage the subscription |

### Content Settings Permissions

| Permission | Description |
|---|---|
| **Manage categories** | Create, edit, and delete project categories |
| **Manage labels** | Create, edit, and delete task labels |
| **Manage views** | Create, edit, and delete saved views |
| **Manage releases** | Create, edit, and delete releases |

### Task Permissions

Task permissions are split into two groups: **actions** and **properties**.

#### Task Actions

| Permission | Description |
|---|---|
| **Create** | Create new tasks |
| **Edit any** | Edit any task's title, description, category, release, and visibility — not just tasks the member created or is assigned to |
| **Delete any** | Delete any task (not yet active — reserved for future use) |
| **Assign** | Assign tasks to other members |

#### Task Properties

| Permission | Description |
|---|---|
| **Change status** | Change the status of tasks (backlog, todo, in progress, done, canceled) |
| **Change priority** | Change the priority of tasks (none, low, medium, high, urgent) |

:::note[Creator and Assignee Bypass]
Members can always edit tasks they **created** or are **assigned to**, regardless of the Edit any, Change status, and Change priority settings. These permissions only restrict editing tasks owned by other members.
:::

### Moderation Permissions

| Permission | Description |
|---|---|
| **Manage comments** | Edit or delete any comment, including those on public pages |
| **Approve submissions** | Approve or reject public bug reports and feedback (reserved for future use) |
| **Manage votes** | Reset votes and handle vote fraud on public pages (reserved for future use) |

### Default Permissions

New teams and teamless members start with the following permissions:

| Permission | Default |
|---|---|
| Create tasks | Enabled |
| Change status | Enabled |
| Change priority | Enabled |
| All other permissions | Disabled |

This means that a newly invited member who hasn't been added to any team can create tasks and update status and priority, but cannot manage organization settings, edit other members' tasks, or modify content like categories and labels.

## Common Team Setups

Here are some example team configurations for common scenarios:

### Admin Team

- **Administrator**: Enabled
- All other permissions are overridden

### Contributor Team

- **Create** tasks: Enabled
- **Change status**: Enabled
- **Change priority**: Enabled
- **Assign**: Enabled
- Everything else: Disabled

Contributors can create and manage tasks but cannot change organization settings or manage content.

### Project Manager Team

- **Manage categories**: Enabled
- **Manage labels**: Enabled
- **Manage views**: Enabled
- **Manage releases**: Enabled
- **Edit any** task: Enabled
- **Change status**: Enabled
- **Change priority**: Enabled
- **Assign**: Enabled

Project managers can organize the workspace and edit any task, without full administrator access.

### Moderator Team

- **Manage comments**: Enabled
- **Change status**: Enabled
- **Change priority**: Enabled

Moderators can manage public-facing comments and triage tasks without access to organization settings.
