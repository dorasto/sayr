---
title: Notifications & Inbox
description: Stay on top of task activity with Sayr's notification system and cross-organization inbox
sidebar:
   order: 11
---

Sayr's inbox gives you a single place to see every notification that's relevant to you, regardless of which organization the activity happened in. Notifications persist until you archive or delete them.

## Accessing the Inbox

Click the **Inbox** item in the left sidebar. The icon shows a badge with the number of unread notifications when you have new activity.

The inbox is cross-organization — if you are a member of multiple organizations, all notifications from all of them appear in the same view.

## Notification Types

You receive a notification whenever someone performs one of these actions on a task you are involved with:

| Type | When you receive it |
|---|---|
| **Mention** | Someone @-mentions you in a task comment |
| **Comment** | Someone posts a comment on a task you are assigned to |
| **Assignee Added** | You are assigned to a task |
| **Assignee Removed** | You are unassigned from a task |
| **Status Change** | The status of a task you are assigned to changes |
| **Priority Change** | The priority of a task you are assigned to changes |

## Reading Notifications

Click any notification to open the associated task in the detail panel on the right side of the inbox. The task opens in context — you can read comments, update the status, reply, and take action without leaving the inbox.

### Unread vs. Read

Unread notifications appear with a highlighted background. Clicking a notification marks it as read. You can also manually manage read state:

- **Mark as read** — removes the unread highlight
- **Mark as unread** — re-highlights the notification so you can come back to it

To mark all notifications as read at once, click the **Mark all as read** button at the top of the inbox.

### Archiving Notifications

Archive a notification to remove it from your main inbox view without permanently deleting it. Use archiving for notifications you've dealt with and want to clean up.

Right-click any notification (or use the context menu) to access **Archive**.

### Deleting Notifications

To permanently remove a notification, right-click and select **Delete**. Deleted notifications cannot be recovered.

## Real-Time Delivery

Notifications arrive instantly via the WebSocket connection. You don't need to refresh the page — new notifications appear in the inbox and the badge count updates automatically.

If the WebSocket connection is unavailable (e.g., due to a network interruption), notifications are delivered the next time you load the app.

## Tips

- **Unassign yourself** from tasks you don't need updates on to reduce notification volume
- Use **Mark all as read** before starting a focused work session to start with a clean inbox
- **Archive** processed notifications regularly to keep your inbox actionable
