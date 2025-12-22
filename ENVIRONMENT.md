# 🔐 Environment Setup Guide

This repository supports both **normal** and **internal** environments.

- 🔧 **Normal environment (default):** Uses local config or public `.env` files only. No 1Password required.
- 🧱 **Internal environment:** Uses secure secrets from 1Password via the CLI (`op`). Generate `.env` files only if you’re working on internal builds.

---

## ⚙️ Requirements (for internal env only)

If you’re working in the internal environment, you’ll need:

| Tool | Version | Link |
|---|---:|---|
| 1Password CLI | v2 or newer | https://developer.1password.com/docs/cli/get-started/ |
| Bash (macOS / Linux / WSL) | — | preinstalled on macOS/Linux, use WSL on Windows |
| PowerShell (Windows) | v5+ or pwsh 7+ | Install via `winget install Microsoft.PowerShell` |

Sign in to your 1Password account once per terminal session:

```bash
op signin
```

---

## 🧩 Generating Internal .env Files

> Skip this entire section if you aren’t using internal secrets.

Each app (worker, backend, start) has its own `.env` file located here:

```
apps/worker/.env
apps/backend/.env
apps/start/.env
```

These `.env` files contain 1Password references, for example:

```env
DATABASE_URL="op://Sayr/sayr-internal/DATABASE_URL"
GITHUB_CLIENT_SECRET="op://Sayr/sayr-internal/GITHUB_CLIENT_SECRET"
```

They do **not** contain plaintext secrets; values are 1Password references.

Bash (macOS, Linux, or WSL)

```bash
# Generate all .env files for internal
bun run env:all
```

Windows PowerShell

```powershell
# Generate all .env files for internal
bun run env:ps:all
```

---

## 🚀 Running the Apps

### 🧩 Normal mode (no 1Password needed)

If you’re not using internal secrets, just run:

```bash
bun run dev
```

This uses your normal `.env` setup — no 1Password calls are made.

### 🔐 Internal mode (uses 1Password)

Once you’ve generated the `.env` files for internal:

```bash
bun run dev
```

Behind the scenes it runs something like:

```bash
op run --env-file ./apps/worker/.env \
  --env-file ./apps/backend/.env \
  --env-file ./apps/start/.env \
  -- turbo dev
```

Secrets are pulled live from 1Password with no plaintext access.

---

## 💡 Per‑App Internal Commands

Each app can be started independently using its own internal `.env`:

| App | Command |
|---|---|
| Worker | `bun run --prefix apps/worker internal:dev` |
| Backend | `bun run --prefix apps/backend internal:dev` |
| Start | `bun run --prefix apps/start internal:dev` |

When you use these, 1Password automatically provides environment secrets at runtime.

---

## 🧹 Optional: Re‑generate Everything at Once

If you change secret fields in 1Password, regenerate all `.env` files:

Bash

```bash
bun run env:all
```

PowerShell

```powershell
bun run env:ps:all
```

Then restart your dev environment:

```bash
bun run dev
```

---

## 🧠 Quick Reference

| Purpose | Bash / Unix | Windows PowerShell |
|---|---|---|
| Generate internal `.env` files | `bun run env:all` | `bun run env:ps:all` |
| Run internal apps | `bun run dev` | `bun run dev` |
| Run normal (no 1Password) | `bun run dev` | `bun run dev` |
| Run a single internal app | `bun run --prefix apps/backend internal:dev` | `bun run --prefix apps/backend internal:dev` |

---

## 🧱 Recap

1. Run `op signin` (only if working internal)
2. Generate `.env` files for internal via the script
3. `bun run dev` / `bun run build` / `bun run start` as usual

🔒 All secrets stay in 1Password – nothing stored in plain text.

---

**💡 Tip:** If you’re not touching anything internal, you can ignore all 1Password commands completely — they’re only required for internal builds or features.
