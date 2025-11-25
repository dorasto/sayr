# 🚀 Sayr.io

A modern, transparent, and collaborative **project management platform** designed for teams who value openness and efficiency. Bridge internal workflows with public collaboration.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.4+-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1+-blue?logo=react)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-4.8+-orange)](https://hono.dev/)
[![Bun](https://img.shields.io/badge/Bun-runtime-pink?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Features

### 🔐 Authentication & Authorization
- **OAuth Integration** with [GitHub](https://github.com) and [Doras.to](https://doras.to)
- **Role-Based Access Control** with distinct permissions for external users vs. organization members
- **Session Management** powered by [Better Auth](https://www.better-auth.com/)

### 📋 Task Management
- **Organizations & Teams**
- **Rich Task Properties**
- **Visibility Controls**
- **Status Workflows**
- **Priority Levels**
- **Custom Labels**

### 💬 Collaboration
- **Threaded Comments** - Public and internal discussions on a unified timeline
- **Task Timeline** - Full activity history for tracking changes
- **Real-Time Updates** - WebSocket support for live notifications
- **File Uploads** - Secure object storage with MinIO/S3-compatible backends

### 🎨 Modern UI
- **Responsive Design** - With adaptive layouts
- **Rich Components** - Built on [Shadcn/ui](https://ui.shadcn.com) with Radix primitives
- **Block Editor** - [BlockNote](https://www.blocknotejs.org/) rich text editing

### 🔗 Integrations
- **GitHub Integration** — Link repositories, issues, and more
---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| [Next.js](https://nextjs.org/) | React framework with App Router & Turbopack |
| [React](https://react.dev/) | UI library with Server Components |
| [TailwindCSS](https://tailwindcss.com/) | Utility-first CSS framework |
| [Shadcn/ui](https://ui.shadcn.com/) | Accessible component library |
| [TanStack Query](https://tanstack.com/query) | Server state management |
| [TanStack Store](https://tanstack.com/store) | Store management |
| [BlockNote](https://blocknotejs.org/) | Block-based rich text editor |

### Backend
| Technology | Purpose |
|------------|---------|
| [Bun](https://bun.sh/) | JavaScript runtime |
| [Hono](https://hono.dev/) | Lightweight web framework |
| [Drizzle ORM](https://orm.drizzle.team/) | TypeScript ORM |
| [PostgreSQL](https://www.postgresql.org/) | Primary database |
| [Redis](https://redis.io/) | Caching and queues (via ioredis) |
| [MinIO](https://min.io/) | S3-compatible object storage |

### Authentication
| Technology | Purpose |
|------------|---------|
| [Better Auth](https://www.better-auth.com/) | Authentication library |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| [Turborepo](https://turbo.build/repo) | Monorepo build system |
| [pnpm](https://pnpm.io/) | Fast, disk-efficient package manager |
| [Biome](https://biomejs.dev/) | Linting and formatting |
| [Docker](https://www.docker.com/) | Containerization |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |

---

## 📁 Project Structure

```
project-management-tool/
├── apps/
│   ├── backend/          # Hono API server (Bun runtime)
│   │   ├── routes/       # API, webhook, and WebSocket routes
│   │   └── public/       # Static files
│   └── web/              # Next.js frontend
│       └── src/
│           ├── app/      # App Router pages
│           ├── components/
│           ├── hooks/
│           └── lib/
├── packages/
│   ├── auth/             # Better Auth configuration
│   ├── database/         # Drizzle ORM schema & functions
│   │   ├── schema/       # Database table definitions
│   │   └── src/functions/# CRUD operations
│   ├── storage/          # MinIO client for file uploads
│   ├── ui/               # Shared UI components (Shadcn/ui)
│   │   └── src/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── lib/
│   ├── util/             # Shared utility functions
│   └── typescript-config/# Shared TypeScript configurations
├── biome.json            # Linting & formatting config
├── turbo.json            # Turborepo task definitions
├── docker-compose.yml    # Docker services
└── pnpm-workspace.yaml   # Workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 22+ (LTS recommended)
- **Bun** 1.0+ (for backend development)
- **pnpm** 10.6+ (`npm install -g pnpm`)
- **PostgreSQL** 15+
- **Docker** (optional, for containerized development)

## 📜 Available Commands

### Root Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm start` | Start production servers |
| `pnpm lint` | Run Biome linting |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format-write` | Format code with Biome |
| `pnpm check-types` | Run TypeScript type checking |
| `pnpm clean` | Clean build artifacts and node_modules |

### Docker Commands

| Command | Description |
|---------|-------------|
| `pnpm docker` | Stop, clean, and rebuild Docker containers |
| `pnpm docker:build` | Build Docker images |

### Database Commands (in `packages/database`)

| Command | Description |
|---------|-------------|
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:studio` | Open Drizzle Studio for database management |

---

## 🐳 Docker Deployment

1. **Build and start services**
   ```bash
   docker-compose up --build -d
   ```

2. **Access the application**
   - Web app: http://localhost:3000

3. **Stop services**
   ```bash
   docker-compose down
   ```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Workflow

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Use TypeScript for type safety
   - Write meaningful commit messages

4. **Check types**
   ```bash
   pnpm check-types
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/amazing-feature
   ```

### Code Style Guidelines

- **Formatting**: Biome with tabs, indent width 3, line width 120
- **Imports**: Absolute imports for workspace packages (`@repo/*`), relative for local files
- **TypeScript**: Strict mode enabled; avoid `any`, prefer explicit types
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Quotes**: Double quotes, semicolons always

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Turborepo](https://turbo.build/repo) for the amazing monorepo tooling
- [Shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible components
- [Better Auth](https://www.better-auth.com/) for simplified authentication
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations
- [Hono](https://hono.dev/) for the lightweight and fast web framework

---

<p align="center">
  Made with ❤️ by the Doras team
</p>
