---
title: Issue Templates
description: Pre-fill task fields with templates to standardize how your team and community submits issues
sidebar:
   order: 4
---

Issue templates let you define pre-configured task forms that pre-fill fields like the title prefix, description, labels, category, priority, and assignees. Templates reduce friction for both internal members and public users submitting feedback.

## Creating Templates

1. Navigate to **Settings > Templates** in your organization
2. Click **New Template**
3. Fill in the template fields
4. Click **Save**

:::note[Permissions]
Only organization administrators can create, edit, or delete templates.
:::

:::note[Plan Limits]
On Sayr Cloud, the free plan allows up to **3 templates** per organization. The Pro plan supports unlimited templates. Self-hosted editions have no template limits.
:::

## Template Fields

| Field | Description |
|-------|-------------|
| **Name** | The template's display name shown in the template picker (e.g., `Bug Report`, `Feature Request`) |
| **Title Prefix** | Text automatically prepended to the task title (e.g., `[Bug]`, `[Feature]`) |
| **Description** | Pre-filled rich-text content that guides the submitter on what to include |
| **Default Status** | The status a task created from this template starts at |
| **Default Priority** | The priority automatically applied |
| **Default Category** | The category the task is filed under |
| **Default Release** | The release the task is assigned to |
| **Labels** | One or more labels automatically added to the task |
| **Assignees** | Team members automatically assigned to the task |
| **Visibility** | Default visibility for tasks created from this template |

None of these fields are locked — submitters can change any pre-filled value before creating the task.

## Using Templates

### For Organization Members

When creating a new task, click the dropdown arrow next to the **New Task** button to see available templates. Selecting a template pre-fills the task form with the template's defaults.

### For Public Submissions

On your organization's public board (`{your-org}.sayr.io`), signed-in visitors who submit tasks are presented with the list of templates. If the visitor clicks a template, the create form is pre-filled. They can also choose a blank form.

This is particularly useful for community-facing boards where you want submissions to follow a consistent format (e.g., all bug reports include steps to reproduce, or all feature requests explain the use case).

## Example Template: Bug Report

A `Bug Report` template might look like this:

| Field | Value |
|-------|-------|
| **Name** | Bug Report |
| **Title Prefix** | `[Bug]` |
| **Description** | *(pre-filled with a markdown prompt)* |
| **Default Priority** | High |
| **Default Category** | Bug Reports |
| **Labels** | `bug` |

The description might include a structured prompt:

```
**Steps to reproduce:**
1. 
2. 

**Expected behavior:**

**Actual behavior:**

**Environment:**
- Browser / OS:
- Version:
```

## Example Template: Feature Request

| Field | Value |
|-------|-------|
| **Name** | Feature Request |
| **Title Prefix** | `[Feature]` |
| **Default Priority** | Medium |
| **Default Category** | Feature Requests |
| **Labels** | `feature` |

## Managing Templates

### Editing a Template

1. Go to **Settings > Templates**
2. Click the menu icon next to the template
3. Select **Edit**, make changes, and save

Editing a template only affects new tasks created from it. Existing tasks are not updated.

### Deleting a Template

1. Go to **Settings > Templates**
2. Click the menu icon next to the template
3. Select **Delete** and confirm

Deleting a template does not affect tasks that were already created from it.

## Best Practices

### Use Templates to Guide Public Submissions

If your public board receives feature requests or bug reports, templates are one of the most effective ways to get useful, structured submissions. A good bug report template prompts for reproduction steps, expected behavior, and environment info. Without it, you'll receive vague reports that need follow-up.

### Keep the Template List Short

Too many templates can overwhelm submitters. Aim for 3–5 templates covering the most common task types. A clean set of options (e.g., Bug Report, Feature Request, Question) gets better engagement than a long list.

### Use Title Prefixes for Easy Scanning

A consistent prefix like `[Bug]` or `[Feature]` lets you scan the task list without opening every task. It also helps with filtering if you haven't set up labels yet.

### Pre-assign to the Right Team

If certain task types should always go to a specific team member (e.g., all design requests go to the design team), use the **Assignees** field in the template to route them automatically.
