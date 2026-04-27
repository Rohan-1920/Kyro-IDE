# Coder IDE Backend Structure

## Recommended Production Stack

- Runtime: `Next.js Route Handlers` (current) or `NestJS` (scale-up stage)
- Database: `PostgreSQL`
- ORM: `Prisma`
- Auth: `NextAuth` or `Auth.js` with JWT + refresh strategy
- Realtime: `WebSocket` (terminal stream, AI stream, collab events)
- Queue: `BullMQ` for long tasks (AI indexing, repo sync, extension jobs)
- Cache: `Redis` for sessions, rate limits, live command state
- Storage: object storage for artifacts + database for metadata

## Implemented Now (Dependency-light)

- `app/api/health` health check
- `app/api/projects` project list/create
- `app/api/projects/[projectId]/files` CRUD-ready file APIs
- `app/api/ai/chat` AI chat structure + message history
- `app/api/terminal/execute` terminal execution/history structure
- `lib/server/services/*` business logic layer
- `lib/server/db/memory.ts` repository abstraction (in-memory seed)

## Why This Structure

- UI can integrate immediately with stable API contracts.
- Service layer isolates business logic from route handlers.
- Memory DB can be swapped with Prisma repositories without touching UI APIs.

## Next Migration Step (when disk space issue resolved)

1. Install deps:
   - `prisma`
   - `@prisma/client`
2. Add `prisma/schema.prisma` models:
   - User, Project, ProjectFile, ChatMessage, TerminalExecution, GitIntegration, IDEExtension
3. Replace `lib/server/db/memory.ts` usage with Prisma client repositories.
4. Add auth middleware and user scoping for all project/file APIs.

## Extension + GitHub Plan (After Core Backend)

- `extensions` table for installed extensions and settings
- GitHub OAuth app integration (`/api/github/connect/start`, `/callback`)
- Repo clone/sync service with background jobs
- `project.integrations.github` state for branch, remote, token scope

