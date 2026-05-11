# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

The workspace now includes **TCG Game**, a React/Vite web app backed by the shared Express API. It provides player registration, 20 starter cards, six-card deck setup, profile/stats, friends, rooms, tournaments, and turn-based card combat using PostgreSQL/Supabase-compatible tables.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## TCG Game

- **Artifact**: `artifacts/tcg-game`
- **Preview path**: `/`
- **API routes**: `/api/tcg/*`
- **Database SQL**: `tcg-game.sql`
- **Important runtime secret**: `DATABASE_URL` must point to the Supabase/PostgreSQL database.
- **Auth**: players register and log in with username + password; passwords are stored as scrypt hashes in `tcg_players.password_hash`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
