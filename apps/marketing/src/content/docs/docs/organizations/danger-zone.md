---
title: Danger Zone
description: Transfer organization ownership or permanently delete an organization in Sayr
sidebar:
   order: 5
---

The **Danger Zone** section in **Settings > Organization** exposes actions that are irreversible or that significantly change who controls your organization. Only the organization owner (creator) can see and use these controls.

## Transfer Ownership

Transferring ownership hands full control of the organization to another member. Use this when the original creator is leaving the organization, handing off a project, or when administrative responsibility needs to move to someone else.

### How to Transfer Ownership

1. Navigate to **Settings > Organization**
2. Scroll to the **Danger Zone** section
3. Click **Transfer** next to "Transfer ownership"
4. Select the member you want to become the new owner from the list
5. Review the confirmation screen — it lists exactly what the new owner gains
6. Click **Transfer Ownership** to confirm

### What Changes

| | Before | After |
|---|---|---|
| **New owner** | Regular member | Organization owner with full control |
| **Previous owner** | Organization owner | Regular member (removed from Admin team) |

Specifically:
- The new owner is added to the **Admin** team, granting full permissions across the organization
- The previous owner is removed from the Admin team and becomes a standard member
- The `createdBy` field on the organization is updated to the new owner

:::caution
This transfer is immediate and takes effect without any confirmation from the new owner. Make sure you trust the member you select. The new owner can transfer ownership away from you, modify billing, and delete the organization.
:::

---

## Delete Organization

Permanently deletes the organization and all data associated with it.

### Requirements

- You must be the organization owner
- The organization must be on the **free plan**. If you are on a paid plan, you must downgrade to free before deletion is available. The delete button is disabled and a message is shown until the plan requirement is met.

### How to Delete an Organization

1. Navigate to **Settings > Organization**
2. Scroll to the **Danger Zone** section
3. Click **Delete** next to "Delete organization"
4. Review the confirmation dialog listing everything that will be deleted
5. Click **Delete Organization** to confirm

### What Gets Deleted

Everything in the organization is permanently removed:

- All tasks, comments, and task history
- All members and their team assignments
- All labels, categories, views, and releases
- All uploaded files — organization assets (logo, banner) and member file attachments
- GitHub integration data (repositories, installations — the GitHub App is uninstalled if no other Sayr organization is using it)

:::danger
This action is irreversible. There is no recovery option once an organization is deleted.
:::

### What Happens to Members

Members of the deleted organization are not notified automatically. They will lose access immediately. Their Sayr accounts are not affected — they remain active and can join or create other organizations.
