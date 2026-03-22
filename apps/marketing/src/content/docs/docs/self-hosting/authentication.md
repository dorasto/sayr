---
title: Authentication & OAuth Providers
description: Configure login providers for your self-hosted Sayr instance using environment variables
sidebar:
  order: 2
---

Sayr uses [Better Auth](https://www.better-auth.com/) for authentication. Out of the box it supports email/password login and several OAuth providers. Each provider is **opt-in** — it only appears in the login UI and settings when the relevant environment variables are set.

## How Provider Activation Works

Sayr checks for a provider's credentials at runtime on the server. If both the client ID and client secret environment variables are present, the provider is enabled and its login button is shown. If either variable is missing or empty, the provider is silently hidden — no configuration or restart beyond setting the variables is required.

This means you can enable or disable any provider at any time by adding or removing its environment variables and restarting your containers.

## Supported OAuth Providers

### Doras

Sayr is built by the team at [Doras](https://doras.to) — a platform for creators to centralise their links, content, and community. Doras OAuth is the login provider powering Sayr Cloud, and it's our preferred way to sign in because it ties your Sayr account directly into the broader Doras ecosystem.

Doras OAuth for self-hosted instances is currently in a limited access period while we roll it out carefully. If you're interested in enabling Doras login on your instance, reach out and we'll get you set up:

- Email us at [hi@doras.to](mailto:hi@doras.to)
- Join our Discord at [doras.to/discord](https://doras.to/discord)

Once you have credentials, the setup is the same ENV pattern as the other providers:

**Environment variables:**

```bash
DORAS_CLIENT_ID=your-client-id
DORAS_CLIENT_SECRET=your-client-secret
```

---

### GitHub

GitHub login is the most common choice for self-hosted instances. It also powers the GitHub integration (syncing issues and pull requests).

**Create an OAuth App:**

1. Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set the **Authorization callback URL** to:
   ```
   https://admin.yourdomain.com/api/auth/callback/github
   ```

**Environment variables:**

```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

---

### Discord

Discord login lets users sign in and link their Discord account from Settings → Connections.

**Create an OAuth App:**

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application, then open **OAuth2 → General**
3. Add a redirect URL:
   ```
   https://admin.yourdomain.com/api/auth/callback/discord
   ```

**Environment variables:**

```bash
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
```

---

### Slack

Slack login uses OpenID Connect. Users can sign in with Slack and link their Slack account from Settings → Connections.

**Create a Slack App:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **OAuth & Permissions**, add a redirect URL:
   ```
   https://admin.yourdomain.com/api/auth/callback/slack
   ```
3. Under **OAuth & Permissions → Scopes**, add the following **User Token Scopes**:
   - `openid`
   - `profile`
   - `email`
4. Copy the **Client ID** and **Client Secret** from the app's **Basic Information** page

**Environment variables:**

```bash
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

---

## Email / Password Login

Email and password login is always available and does not require any OAuth app. Users can set a password from **Settings → Security**, and existing accounts can request a password reset email.

To send password reset emails, configure an email provider:

```bash
# Supported values: usesend, sendgrid, resend
EMAIL_PROVIDER=resend
SAYR_EMAIL=your-api-key
SAYR_FROM_EMAIL=noreply@yourdomain.com
```

---

## Enabling Multiple Providers

All providers work independently — you can enable any combination. For example, to enable both GitHub and Discord login, set all four variables:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

Users will see a login button for each configured provider.

---

## User Connections (Account Linking)

Once signed in, users can connect and disconnect additional providers from **Settings → Connections**. A provider connection tile only appears if that provider is configured on the server. Sayr prevents users from disconnecting their last remaining login method to avoid account lockout.

---

## Callback URL Reference

Use this table when configuring your OAuth apps. Replace `admin.yourdomain.com` with the actual admin URL for your instance (the value of `VITE_URL_ROOT`).

| Provider | Callback URL |
|---|---|
| GitHub | `https://admin.yourdomain.com/api/auth/callback/github` |
| Discord | `https://admin.yourdomain.com/api/auth/callback/discord` |
| Slack | `https://admin.yourdomain.com/api/auth/callback/slack` |
| Doras | `https://admin.yourdomain.com/api/auth/callback/doras` |
