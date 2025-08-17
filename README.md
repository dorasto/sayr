# Open Project Management Platform White Paper

## Introduction

Project management tools are vital for software teams, but most are designed for private, siloed collaboration, leaving contributors, customers, and the general public out of the loop. This project envisions a new kind of platform: **transparent project management**, combining internal workflows with **public collaboration**, powered by granular privacy controls and a modern tech stack.

---

## Problem Statement

- Existing tools are opaque—external users can’t see issues, participate in discussions, or track progress unless granted full access.
- Other tools offer limited public visibility but struggle with internal/external separation and granular privacy.
- Organizations waste effort keeping stakeholders/customers and others informed (“there’s an internal bug report; watch the changelog”) instead of sharing clear status and discussion.

---

## Proposed Solution

- Build a **project management platform** with hybrid visibility for tasks/issues: each item can have public and private data, metadata, and discussion threads.
- **External users** (customers, contributors) can see public tasks/issues, login and submit bugs/feature requests, and participate in public discussions.
- **Internal members** triage, tag, and discuss items, with control to toggle visibility of metadata, comments, and other fields per item.
- All resolutions and relevant status updates are public, allowing external users to track progress and participate when appropriate.

---

## Key Features

- **Granular Visibility:** Set public/private status per field, comment, or metadata entry.
- **Role-Based Permissions:** Distinct controls for external submitters vs. org members.
- **Advanced Tagging:** Labels, tags, and metadata with visibility controls.
- **Dual Discussions:** Separate internal (private) and public (external) threads per issue.
- **Notifications:** Timely alerts for all stakeholders—internal and external.
- **Modern Auth:** Secure authentication with [better-auth] as default.
- **Extensible/Open API:** Integrate or build with external tools and automated workflows.

---

## Example Workflow

1. **External User**
   - Logs into the org (“Doras”) public portal.
   - Views all open public issues.
   - Submits a new bug report or feature request.
2. **Internal Member**
   - Reviews submission, tags (tags can be public or private), assigns to a team/user, etc.
   - Discusses solution internally via the thread, and shares appropriate updates on the public thread.
     - Threading is all on a single timeline and clearly outlined if public or not to keep a working list.
3. **Collaboration**
   - External user and organization users can both comment and share information on public thread.
   - Internal only details (like logs, sensitive data, schedules, connected braches/PRs/etc) remain private.
     - If the issue has been assigned to a GitHub repository to attach a GitHub issue/branch/pull, you can make it visible to the public **IF** the repository is public. Private repositories will never share this information.
4. **Resolution**
   - Item status is updated publicly.
   - External users are notified; discussion can be closed.
     - Issue can be re-opened with a "follow-up" if required (regression, etc)

---

## Tech Stack Candidates

| Layer       | Options                                                        |
|-------------|----------------------------------------------------------------|
| Frontend    | React (TanStack Start / React Router v7)        |
| State Mgmt  | TanStack Query                        |
| UI Library  | Tailwind                         |
| Backend     | Fastify/Nitro/Hono     |
| Database    | PostgreSQL, Drizzle                                         |
| Auth        | better-auth                                       |
| Deployment  | Docker to VPS                               |
---

## Decisive Tasks

List of actions to drive the project forward:

1. **Finalize Core Tech Choices**
   - Choose frontend framework and routing (e.g., TanStack Start vs React Router v7).
   - Select backend/server architecture and API strategy (e.g., tRPC, REST, GraphQL).
   - Nail down authentication library (better-auth).

2. **Model Public/Private Data**
   - Design data schemas for tasks/issues with per-field visibility controls.
   - Plan role and permissions system.

3. **POC Authentication & Permissions**
   - Integrate better-auth into starter repo.
   - Build basic org/user registration and login flows.
   - Mock basic roles (user, member, admin).

4. **Task & Issue Management UI Prototype**
   - Design/create skeleton pages for viewing, creating, and managing issues/tasks.
   - Implement public/private switch per field, comment, metadata.

5. **Discussion Threads Implementation**
   - Build thread system for public/internal comments.
     - We will likely utilize Blocknote (same as Doras), or potentially another provider)
   - Ensure intuitive UI separation.

6. **Notifications & Updates**
   - Create notification system for status updates, comments, and resolutions.
     - We can handle this with an email solution like unsend

7. **API Design**
   - Build open, type-safe API.
   - Document endpoints and payloads.

8. **Collect User/Org Feedback**
   - Solicit input from developers, open source maintainers, and external users for UI/feature priorities.

9. **DevOps & Deployment Pipeline**
   - Dockerize services.

10. **Documentation & Roadmap**
    - This will all be handled directly from the project to "dogfood"
---

## Next Steps

1. Organize team and responsibilities.
2. Implement authentication and core workflow.
3. Iterate MVP and collect feedback for next milestones.

---

## Project Vision (Condensed Summary)

A modern, transparent project management system:
- Always keep external users and customers informed
- Foster open collaboration while maintaining internal privacy/control
- Streamline communications and handoffs

--- 

# Features

- Orgs at the root
- Teams within orgs
- Projects
  - Hosts tasks for an org
- Tasks
  - Title
  - Assignee (user or team) (visibility optional)
  - ID
  - Category ( bug, feature, etc)
  - Status 
  - Labels
    - Can add multiple labels. 
    - When you create a label you also choose if it's public or internal
  - Votes
    - helpful for seeing how many users want a certain feature request, reporting the same bug, etc
  - Meta
    - Link to information like GitHub PR/issue
  - Comments (thread)
    - Main thread showing public and internal discussion in a single linear thread
    - Toggles for internal teams to show/hide public/internal comments to get a better overview