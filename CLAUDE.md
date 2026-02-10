# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Vite, HMR)
pnpm build        # Type-check (tsc -b) + production build
pnpm lint         # ESLint
pnpm preview      # Preview production build locally
```

Docker/K8s:
```bash
pnpm docker:build   # Build Docker image (stream-web)
pnpm docker:run     # Run container on port 3000
pnpm k8s:deploy     # Build, push, restart K8s deployment
```

## Architecture

React 19 SPA with TypeScript, Vite, Tailwind CSS 4, and Redux Toolkit.

**Routing:** React Router v7 with browser router. Routes defined in `src/App.tsx` using nested route layout pattern (`MainLayout` wraps page outlets).

**State management:** Redux Toolkit store (`src/store/store.ts`) with `combineReducers`. Auth state lives in `src/feature/auth/authSlice.ts` (token + authUser).

**API layer:** RTK Query with two API slices:
- `authApi` (`src/services/auth.ts`) — login, logout, refresh, whoami
- `userApi` (`src/services/users.ts`) — user queries with automatic 401 token refresh via `baseQueryWithReauth`

Base URL is hardcoded to `https://api.example.com/`. Auth uses Bearer tokens with credential cookies for refresh.

**UI:** shadcn/ui (New York style) components in `src/components/ui/`. Custom 8-bit pixel art themed components in `src/components/ui/8bit/`. Theme (light/dark) managed via `ThemeProvider` context with localStorage persistence.

**Path alias:** `@/*` maps to `src/*` (configured in both tsconfig and vite).

## Key Patterns

- Custom hooks in `src/hooks/` — `useAuth` for auth state, `useAppDispatch`/`useAppSelector` for typed Redux hooks
- Types in `src/types/` — separate files for auth and user types
- `cn()` utility from `src/lib/utils.ts` for Tailwind class merging (clsx + tailwind-merge)
- ESLint uses flat config format (ESLint 9+)
- Strict TypeScript with no unused locals/parameters
