# Environment Setup Guide

This repository supports both **normal** and **internal** environments.

- **Normal environment (default):** Uses local `.env` files. No 1Password required.
- **Internal environment:** Uses secure secrets from 1Password via the CLI (`op`).

---

## Requirements (for internal env only)

| Tool | Version | Link |
|---|---:|---|
| 1Password CLI | v2.18+ | https://developer.1password.com/docs/cli/get-started/ |
| Bash (macOS / Linux / WSL) | — | preinstalled on macOS/Linux, use WSL on Windows |
| PowerShell (Windows) | v5+ or pwsh 7+ | Install via `winget install Microsoft.PowerShell` |

---

## How It Works

The environment system uses two types of `.env` files:

| File | Purpose | Contains |
|------|---------|----------|
| `.env` | Template file | `op://` secret references |
| `.env.local` | Resolved file (gitignored) | Actual secret values |

When you run `pnpm dev:op`, it:
1. Reads the `.env` template files with `op://` references
2. Resolves them via 1Password into `.env.local` files
3. Starts the dev servers (which load `.env.local` automatically)

---

## Generating .env Template Files

If you need to regenerate the `.env` template files (e.g., after secrets change in 1Password):

**Bash (macOS, Linux, WSL)**
```bash
pnpm env:all
```

**Windows PowerShell**
```powershell
pnpm env:ps:all
```

This creates/updates:
```
apps/backend/.env
apps/start/.env
apps/worker/.env
```

---

## Running the Apps

### Normal mode (no 1Password)

If you already have `.env.local` files with resolved values:

```bash
pnpm dev
```

### Internal mode (with 1Password)

This resolves secrets and starts all apps with a single auth prompt:

```bash
pnpm dev:op
```

Behind the scenes it runs:
```bash
op inject -i apps/backend/.env -o apps/backend/.env.local
op inject -i apps/start/.env -o apps/start/.env.local
op inject -i apps/worker/.env -o apps/worker/.env.local
turbo dev
```

---

## Quick Reference

| Purpose | Command |
|---------|---------|
| Generate `.env` templates (Bash) | `pnpm env:all` |
| Generate `.env` templates (PowerShell) | `pnpm env:ps:all` |
| Run with 1Password (resolves secrets) | `pnpm dev:op` |
| Run without 1Password | `pnpm dev` |

---

## Recap

1. Generate `.env` template files via `pnpm env:all` (or `env:ps:all` on Windows)
2. Run `pnpm dev:op` to resolve secrets and start dev servers
3. Subsequent runs can use `pnpm dev` if `.env.local` files are still valid

All secrets stay in 1Password - resolved values in `.env.local` are gitignored.
