# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Memory

Память проекта хранится в Obsidian vault (корень проекта), заметки — в `_notes/`.

- **При старте сессии контекст восстанавливается из `_notes/INDEX.md`** — он автоинжектится через `opencode.json` → `instructions`. По задаче открывай нужные заметки по ссылкам из хаба.
- Новые факты/решения сохраняй в `_notes/`: обнови `INDEX.md` и соответствующую заметку (решения — в `decisions.md`).
- Команда `/remember <факт>` сохраняет произвольный факт в память.
- `_notes/` и `.obsidian/` не коммитятся в git — это локальная память.

## Commands

```bash
pnpm dev          # Start dev server (Vite, HMR)
pnpm build        # Type-check (tsc -b) + production build
pnpm lint         # ESLint
pnpm preview      # Preview production build locally
```

Docker/K8s (k3s в WSL, без Docker Desktop):
```bash
docker build ...       # Docker Engine в WSL (docker-ce)
docker push xomrkob/...  # или npm run build в кластер

kubectl                # симлинк на k3s, KUBECONFIG=~/.kube/config
make all               # весь стек: infra → db-migrate → apps → prometheus → grafana
make import-images     # docker save ... | k3s ctr images import -
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
