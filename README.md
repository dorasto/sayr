# 🚀 Project Management Tool

A modern, transparent, and collaborative **project management platform** designed for teams who value openness and efficiency. Built with a cutting-edge tech stack, this tool bridges internal workflows with public collaboration through granular privacy controls.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.4+-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1+-blue?logo=react)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-4.8+-orange)](https://hono.dev/)
[![Bun](https://img.shields.io/badge/Bun-runtime-pink?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Features

### 🔐 Authentication & Authorization
- **OAuth Integration** with GitHub and custom providers (Doras)
- **Role-Based Access Control** with distinct permissions for external users vs. organization members
- **Session Management** powered by [Better Auth](https://www.better-auth.com/)

### 📋 Task Management
- **Organizations & Teams** — Multi-tenant architecture with organization-scoped projects
- **Rich Task Properties** — Title, status, priority, categories, labels, and assignees
- **Visibility Controls** — Per-field public/private toggles for granular privacy
- **Status Workflows** — Backlog → Todo → In Progress → Done → Canceled
- **Priority Levels** — None, Low, Medium, High, Urgent
- **Custom Labels** — Color-coded, organization-scoped labels with visibility options

### 💬 Collaboration
- **Threaded Comments** — Public and internal discussions on a unified timeline
- **Task Timeline** — Full activity history for tracking changes
- **Real-Time Updates** — WebSocket support for live notifications
- **File Uploads** — Secure object storage with MinIO/S3-compatible backends

### 🎨 Modern UI
- **Responsive Design** — Mobile-first approach with adaptive layouts
- **Dark Mode** — System-aware theme switching
- **Rich Components** — Built on Shadcn/ui with Radix primitives
- **Block Editor** — BlockNote-powered rich text editing

### 🔗 Integrations
- **GitHub Integration** — Link repositories, issues, and pull requests
- **Extensible API** — RESTful endpoints with WebSocket support

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| [Next.js 15](https://nextjs.org/) | React framework with App Router & Turbopack |
| [React 19](https://react.dev/) | UI library with Server Components |
| [TailwindCSS 4.1](https://tailwindcss.com/) | Utility-first CSS framework |
| [Shadcn/ui](https://ui.shadcn.com/) | Accessible component library |
| [TanStack Query](https://tanstack.com/query) | Server state management |
| [TanStack Table](https://tanstack.com/table) | Headless table utilities |
| [BlockNote](https://blocknotejs.org/) | Block-based rich text editor |
| [Lucide](https://lucide.dev/) | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| [Bun](https://bun.sh/) | Fast JavaScript runtime |
| [Hono](https://hono.dev/) | Lightweight web framework |
| [Drizzle ORM](https://orm.drizzle.team/) | TypeScript ORM for PostgreSQL |
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

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dorasto/project-management-tool.git
   cd project-management-tool
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/project_management"
   
   # Auth providers
   GITHUB_CLIENT_ID="your_github_client_id"
   GITHUB_CLIENT_SECRET="your_github_client_secret"
   
   # Storage
   STORAGE_URL="your_minio_endpoint"
   STORAGE_ACCESS_KEY="your_access_key"
   STORAGE_SECRET_KEY="your_secret_key"
   STORAGE_BUCKET="your_bucket_name"
   
   # URLs
   NEXT_PUBLIC_URL_ROOT="http://localhost:3000"
   NEXT_PUBLIC_API_SERVER="http://localhost:5468"
   ```

4. **Push database schema**
   ```bash
   cd packages/database
   pnpm db:push
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```
   This starts:
   - **Web app**: http://localhost:3000
   - **API server**: http://localhost:5468

---

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

4. **Lint and format**
   ```bash
   pnpm lint:fix
   pnpm format-write
   ```

5. **Check types**
   ```bash
   pnpm check-types
   ```

6. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

7. **Push and create a Pull Request**
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
