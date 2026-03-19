---
title: Preferences & Moderation
description: Configure your organization's behavior — public page, task submission rules, and user moderation
sidebar:
   order: 2
---

The **Preferences** section of your organization settings controls how the public board behaves and what actions members and visitors can take. Navigate to **Settings > Organization > Preferences** to manage them.

## General Configuration

### Allow Actions on Closed Tasks

When **disabled**, users without administrator or moderator privileges cannot comment on or modify tasks that are in a **Done** or **Canceled** status. This is useful for keeping completed tasks clean and preventing out-of-context edits after work is finished.

When enabled (the default), anyone with the usual task permissions can still interact with closed tasks normally.

## Public Page Settings

### Enable Public Page

Toggles your organization's entire public-facing presence on or off.

| State | Effect |
|---|---|
| **Enabled** (default) | Your public board at `{slug}.sayr.io` is accessible to everyone |
| **Disabled** | The public board returns a not-found page. No external user can browse tasks, vote, or submit feedback |

Disabling the public page does not delete any data — it simply makes the page inaccessible until you re-enable it.

### Blocked Users

Block specific users from interacting with your organization or its tasks. Blocked users cannot comment, vote, or submit tasks on your public board, even if they are signed in.

1. Click **Manage** next to **Blocked users**
2. Search for users by name or username
3. Click **Block** next to a user to add them to the block list
4. To unblock, find the user and click **Unblock**

Blocked users can still view public content — they are only prevented from taking actions (commenting, voting, submitting).

## Public Task Creation

These settings control what external (non-member) users can do when submitting tasks from the public board.

### Public Actions

When **disabled**, external users cannot comment on tasks or create new tasks from the public board. Voting remains available regardless of this setting.

When enabled (the default), signed-in visitors can submit tasks and comment, turning your public board into a feedback hub.

### Allow Blank Tasks

Controls whether external users can create a task without choosing a template.

| Setting | Effect |
|---|---|
| **Enabled** (default) | Users can submit a blank task (no template required) |
| **Disabled** | Users must pick from one of your organization's templates before submitting |

Disabling blank tasks is effective when you want to enforce structured submissions. For example, if you have a `Bug Report` template that asks for steps to reproduce, disabling blank tasks ensures every submission follows that structure.

This setting only applies when **Public actions** is enabled.

### Allow Setting Labels

When enabled, external users can choose labels when creating a task. When disabled, labels must be assigned by organization members after submission.

Useful if your labels contain internal terminology that wouldn't be meaningful to the public, or if you want to control categorization yourself.

### Allow Setting Category

When enabled, external users can select a category when creating a task (e.g. `Bug Reports`, `Feature Requests`). When disabled, the category field is hidden and defaults to none.

### Allow Setting Priority

When enabled, external users can set the priority of the task they submit. When disabled, priority defaults to **None** and can only be changed by members.

---

## Interactions Between Settings

| Scenario | Recommended configuration |
|---|---|
| Fully open feedback board | Public actions **on**, allow blank tasks **on**, all fields **on** |
| Structured submissions only | Public actions **on**, allow blank tasks **off**, fields as desired |
| Read-only roadmap (voting only) | Public actions **off**, public page **on** |
| Completely private workspace | Public page **disabled** |
