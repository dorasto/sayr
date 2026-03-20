---
title: Overview
description: What organizations are, how to create one, and how to configure its identity and settings
sidebar:
   order: 1
---

An **organization** is the top-level unit in Sayr. Your task board, members, labels, categories, releases, and public pages all belong to an organization. Each organization gets its own subdomain (`{slug}.sayr.io`) and its own permission system.

## Creating an Organization

1. Sign in and open the **organization switcher** at the top of the left sidebar
2. Click **Create organization**
3. Fill in the required fields:
   - **Name** — The display name shown everywhere inside Sayr
   - **Slug** — The URL-safe identifier used as the subdomain (e.g. `acme` → `acme.sayr.io`). Slugs must be lowercase and unique across Sayr
   - **Short ID** — A 1–3 uppercase letter prefix used in task identifiers (e.g. `ACM` → tasks are numbered `ACM-1`, `ACM-2`, …)
4. Optionally add a **description**
5. Click **Create**

The organization creator is automatically added to the **Admin** team with full permissions.

:::note[Edition Limits]
The Community Edition (self-hosted) supports a single organization per instance. Sayr Cloud supports unlimited organizations. See [Editions](/docs/self-hosting/editions) for more.
:::

## Switching Between Organizations

If you belong to more than one organization, use the **organization switcher** at the top of the left sidebar to move between them. Each organization is fully independent — its tasks, members, settings, and public page are separate.

## General Settings

Navigate to **Settings > Organization** to update the organization's identity.

### Name

The organization name is shown in the admin dashboard, on the public board, and in notifications. To update it, edit the **Name** field and click **Save**.

### Slug (Subdomain)

The slug determines the subdomain for both the admin panel and the public board:

| | URL |
|---|---|
| Public board | `{slug}.sayr.io` |
| Admin panel | `admin.sayr.io` (cloud) or `admin.{your-domain}` (self-hosted) |

You can change the slug at any time. When you do:
- The old subdomain stops working immediately
- Share the new URL with anyone who has bookmarked the old one
- Slugs must be lowercase, contain only letters, numbers, and hyphens, and be unique across Sayr

### Short ID (Task Prefix)

The short ID is the letter prefix prepended to task numbers. For example, an organization with short ID `ACM` will number tasks `ACM-1`, `ACM-2`, and so on.

- Must be 1–3 uppercase letters (e.g. `SA`, `BUG`, `X`)
- Only affects how task identifiers are displayed — existing task links are not broken when you change it
- Changing the short ID updates all task identifiers immediately

### Logo

The organization logo appears on the public board and in the admin sidebar.

1. Click your current logo (or the placeholder icon) under **Logo**
2. Select an image file (JPEG or PNG)
3. Crop and confirm

### Banner Image

The banner appears at the top of your organization's public board page.

1. Click the **banner area** or the upload icon under **Banner**
2. Select a wide image (a 16:5 ratio works well — e.g. 1600×500 px)
3. Crop and confirm

### Description

A short description that appears beneath your organization name on the public board. Useful for explaining what your organization builds or what kind of feedback you're looking for.

Edit the **Description** field and click **Save**.

## Danger Zone

Sensitive actions — transferring ownership and permanently deleting an organization — are available to the organization owner in **Settings > Organization > Danger Zone**.

See [Danger Zone](/docs/organizations/danger-zone) for full details on both actions.
