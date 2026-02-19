# Database Setup Guide (Drizzle + Postgres)

This project uses **Drizzle ORM** with SQL migrations for database
management.

The `drizzle/` folder is the source of truth for the database schema and
must be committed to the repository.

---

# 🚀 First-Time Setup

Follow these steps after cloning the repository.

## 1️⃣ Install dependencies

From the root of the repo:

```bash
bun install
```

---

## 2️⃣ Create a local database

If you have Postgres installed locally:

```bash
createdb sayr_dev
```

Or inside `psql`:

```sql
CREATE DATABASE sayr_dev;
```

---

## 3️⃣ Create your `.env` file

Inside `packages/database` (or wherever your config expects it):

```
DATABASE_URL=postgres://postgres:password@localhost:5432/sayr_dev
```

⚠️ Never commit `.env` files.  
Make sure `.gitignore` includes:

```
.env*
```

---

## 4️⃣ Run migrations

From the database package:

```bash
bun run migrate
```

Or directly:

```bash
bunx drizzle-kit migrate
```

---

# ✅ What `migrate` Does

When you run `migrate`, Drizzle will:

1. Read all SQL migration files inside `/drizzle`
2. Create the internal migration table:
   drizzle.__drizzle_migrations
3. Apply migrations in order
4. Record which migrations were applied

Your database will now match the project schema exactly.

---

# 🆕 When To Use `generate`

You run `generate` **only when you change your schema files**.

Examples of schema changes:

- ✅ Add a new table
- ✅ Add a new column
- ✅ Remove a column
- ✅ Change a column type
- ✅ Add/remove indexes
- ✅ Add enums or modify enums
- ✅ Change constraints

After modifying your schema TypeScript files:

```bash
bun run generate
```

This will:

- Compare your current schema to the previous snapshot
- Create a new SQL migration file inside `/drizzle`
- Prepare the database change (but NOT apply it yet)

Then you must run:

```bash
bun run migrate
```

to apply the new migration to the database.

---

# 🔁 Daily Development Workflow

Whenever the schema changes:

```bash
bun run generate
bun run migrate
```

Then commit the updated `drizzle/` folder.

✅ Always commit migrations  
❌ Never manually modify the database  
❌ Never use `drizzle-kit push` in production  

---

# ⚠️ About `drizzle-kit push`

`drizzle-kit push` directly syncs the schema to the database without
creating migration files.

This is useful only for:
- Quick prototypes
- Throwaway local databases

Do NOT use it in:
- Production
- CI/CD
- Team environments

Always use:

generate → migrate

---

# 🏗️ Production / CI Deployment

Deployments follow the same process:

```bash
bun run migrate
```

Drizzle will:
- Apply only new migrations
- Never re-run old ones
- Keep the database safely in sync

CI/production environments should NEVER run `generate`.
They should only run `migrate`.

---

# 📦 What Gets Committed

You must commit:

packages/database/drizzle/

This contains:
- SQL migration files
- Metadata
- Migration history

These files do NOT contain secrets.

---

# 🔐 What Must NOT Be Committed

Never commit:
- .env
- .env.local
- .env.production
- Any credentials

---

# 🧩 Mental Model

Think of migrations as:

> Git commits for your database

- `generate` = create a new commit  
- `migrate` = apply commits  

When someone clones the repo and runs `migrate`, their database is rebuilt
from the complete migration history.

---

✅ Clone  
✅ Install  
✅ Create DB  
✅ Run migrate  

Done.