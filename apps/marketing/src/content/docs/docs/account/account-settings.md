---
title: Account Settings
description: Manage your profile, display name, avatar, and personal preferences in Sayr
sidebar:
   order: 3
---

Account settings are personal to you — they apply across all organizations you belong to. Navigate to **Settings** in the left sidebar to access them.

## Profile

### Display Name

Your display name is shown to other organization members and on public task pages. It is separate from your login name.

1. Navigate to **Settings**
2. Under **General**, find the **Display Name** field
3. Edit the name and click **Save**

Your login name (from GitHub or email) is shown next to the display name field for reference.

### Avatar

Your avatar appears next to comments, task assignees, and member lists. By default it uses the picture from your linked GitHub account.

To upload a custom avatar:

1. Navigate to **Settings > General**
2. Click your current avatar
3. Select an image file (JPEG or PNG recommended)
4. Use the crop tool to frame it
5. Click **Apply** to save

## Preferences

### Dark Mode

Toggle between light and dark themes using the **Dark mode** switch in **Settings > Preferences**. The preference is saved locally and persists across sessions.

## Connected Accounts

**Settings > Connections** shows which external accounts are linked to your Sayr profile. These connections are used for authentication and integration.

### GitHub

Linking your GitHub account lets you sign in with GitHub and is required for the GitHub integration (repository syncing, pull request references, etc.) to attribute activity to your Sayr account.

- **Connect**: Click **Connect GitHub** and complete the OAuth flow
- **Disconnect**: Click the disconnect button next to your connected GitHub account — only available if you have at least one other way to sign in (email/password or another provider)

### Doras

Doras is the OAuth provider used by Sayr Cloud. If Doras OAuth is enabled on your instance, you can connect your Doras account here in the same way as GitHub.

### Email & Password

If your account was created with an email address, the email connection is shown here. You can request a password reset link from this panel.

If you signed up via OAuth (GitHub or Doras) and don't yet have a password set, you cannot enable two-factor authentication until you set one. See [Security](/docs/account/security) for details.

## Account Across Organizations

Your profile settings — display name, avatar, preferences — are shared across all organizations. There is no per-organization profile.

If you are a member of multiple organizations, you will see all of them in the organization switcher but your personal settings remain the same everywhere.
