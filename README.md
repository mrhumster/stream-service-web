# GoCast — Web Frontend

SPA frontend for the GoCast video hosting/streaming service. Upload videos,
track transcoding, publish and watch streams via HLS player with access control
(public / private / unlisted) and token-based authentication.

UI is styled as a retro 8-bit pixel art interface with support for three themes:
**light**, **soft** (muted dark with lower contrast), and **dark**.

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript (strict) |
| Build | Vite 7, Tailwind CSS 4 (CSS-first config), pnpm |
| State | Redux Toolkit, RTK Query, Zustand |
| Routing | React Router v7 (browser router) |
| Video | HLS.js (playback), custom HLS player |
| Components | shadcn/ui (New York) + custom 8-bit pixel art components |
| Icons | pixelarticons, lucide-react |
| Fonts | Press Start 2P (self-hosted via @fontsource) |
| Toasts | Sonner (8-bit styled) |
| Upload | react-dropzone, multipart/chunked upload |

## Features

- **Authentication:** register, login, logout; access + refresh tokens
  (cookie-based refresh, automatic reauth on 401);
- **Video upload** — two modes:
  - Direct upload (`multipart/form-data`) for files up to 5 MB;
  - Multipart chunked upload (5 MB chunks, 3 parallel) with progress bar
    for larger files;
- **Batch upload:** tab-based Single/Batch mode, multi-file dropzone
  (up to 20 files), upload queue with per-file progress, 2-concurrency
  parallel upload, retry failed files, completion countdown with redirect;
- **Stream lifecycle:** `draft → processing → ready → published`, `error`; failed
  transcode shows an error panel with a **Reprocess** button (owner/admin), which
  re-enqueues the processing tasks (tracked per-task in a `processing` array:
  `transcode` + `thumbnail`);
- **Stream visibility:** `public`, `private`, `unlisted`;
- **Publish / unpublish** streams;
- **HLS player** with:
  - Bearer token authorization on playlist/segment requests;
  - Anti-cache `?t=` parameter;
  - 403 "Access denied" handling;
  - Second HLS instance for blurred video background;
  - Custom control panel (play/pause, seek, volume, mute);
  - Wide mode (fills browser width) and fullscreen;
  - Keyboard shortcuts (Space/F/W/Arrows/H/Escape) with help overlay;
  - Touch controls on mobile (auto-hide after 3s);
  - Flash overlays for volume/seek changes;
- **Three themes:** light / soft (muted dark) / dark — cyclic toggle
  (Sun → Star → Moon icons);
- **Real-time updates** via WebSocket (`STREAM_UPDATED`, `STREAM_READY`
  events invalidate RTK Query tags);
- **Public catalog** with infinite scroll (IntersectionObserver);
- **My Streams** page with table/grid toggle, default table view,
  client-side sorting by Title/Status/Created;
- **Edit page** with HLS player preview for ready/published streams;
- **Mobile responsive:** hamburger nav, hidden columns on small screens;
- **Toast notifications** (Sonner, styled as 8-bit pixel toasts);
- **Stream cards** with square thumbnails and duration badge;
- **Marquee title** for long titles that overflow their container.

## Commands

```bash
pnpm dev          # dev server (Vite, HMR) on localhost:5173
pnpm build        # type-check (tsc -b) + production build to dist/
pnpm lint         # ESLint (flat config)
pnpm preview      # preview production build locally
```

Docker / K8s:

```bash
pnpm docker:build   # build Docker image (web-frontend)
pnpm docker:run     # run container on port 3000 (nginx)
pnpm docker:push    # tag + push to Docker Hub (xomrkob/web-frontend:latest)
pnpm k8s:apply      # kubectl apply -f k8s/
pnpm k8s:deploy     # build → push → rollout restart deployment
```

## Project Structure

```
src/
├── main.tsx                    # entry point, Provider + Redux store
├── App.tsx                     # router, ThemeProvider, Toaster
├── hooks.ts                    # typed Redux hooks
├── index.css                   # Tailwind + theme CSS (light/dark/soft)
├── assets/
│   └── react.svg
├── components/
│   ├── hls-player.tsx          # custom HLS player (wide/fullscreen/touch/blur)
│   ├── marquee-title.tsx       # auto-scrolling overflow text
│   ├── mode-toggle.tsx         # cyclic theme toggle (light → soft → dark)
│   ├── protected-route.tsx     # auth guard
│   ├── stream-card.tsx         # card with thumbnail + status + duration
│   ├── stream-sidebar.tsx      # infinite-scroll related streams
│   ├── theme-context.ts        # ThemeProviderContext + useTheme
│   ├── theme-provider.tsx      # ThemeProvider with localStorage
│   ├── video-dropzone.tsx      # react-dropzone (single/multi)
│   └── ui/
│       ├── button.tsx, button-variants.ts, card.tsx, dialog.tsx
│       ├── dropdown-menu.tsx, input.tsx, label.tsx
│       ├── login-form.tsx, register-form.tsx
│       ├── table.tsx, tooltip.tsx
│       └── 8bit/
│           ├── button.tsx      # pixel-art bordered Button
│           ├── dropdown-menu.tsx
│           ├── progress-bar.tsx
│           ├── variants.ts     # CVA variants
│           └── styles/retro.css
├── feature/
│   └── auth/authSlice.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useMultipartUpload.ts
│   └── useVideoUrl.ts
├── layouts/MainLayout.tsx
├── lib/
│   ├── stream-format.ts        # statusConfig, formatDate, thumbnailUrl
│   └── utils.ts                # cn(), getErrorMessage()
├── pages/
│   ├── CreateStreamPage.tsx    # Single/Batch upload tabs
│   ├── EditStreamPage.tsx      # edit + HLS preview
│   ├── MainPage.tsx            # landing page
│   ├── OwnStreamsPage.tsx       # table/grid, sorting
│   ├── StreamPage.tsx          # detail + player + owner actions
│   └── StreamsPage.tsx         # catalog, infinite scroll
├── services/
│   ├── auth.ts                 # login, register, logout
│   ├── streams.ts              # CRUD + upload (single/multipart)
│   └── users.ts                # whoami, lists (with reauth)
├── store/
│   ├── store.ts
│   └── middleware/
│       ├── authListener.ts
│       └── socketMiddleware.ts
└── types/
    ├── auth.types.ts
    ├── stream.types.ts
    └── user.types.ts
```

## Routes

| Path | Page | Access |
| --- | --- | --- |
| `/` | MainPage (landing) | public |
| `/streams` | Stream catalog | public |
| `/streams/:id` | Stream detail + player | public (access by owner rights) |
| `/streams/create` | Create stream | **authenticated only** |
| `/streams/own` | My streams | **authenticated only** |
| `/streams/:id/edit` | Edit stream | **authenticated only** |

Private routes wrapped in `ProtectedRoute`: no token → redirect to `/`.

## Architecture

### State Management

`store/store.ts` combines reducers:
- `authApi`, `userApi`, `streamApi` — RTK Query API slices;
- `auth` — token, profile, initialization flag.

Middleware: `socketMiddleware` (WebSocket) and `authListener` (loads profile
after login).

### RTK Query + Reauth

All requests use `fetchBaseQuery` with `credentials: "include"` and 30s timeout.
`baseQueryWithReauth` intercepts 401, calls `POST auth/refresh`, retries the
original request on success; otherwise dispatches `eraseAuth`.

### Upload Flow

`useMultipartUpload`: `init` → 5 MB chunks × 3 parallel → `complete`.
Each chunk retries up to 3 times with exponential backoff.
Files < 5 MB use direct upload.

**Batch upload** (`CreateStreamPage`): sequential stream creation, 2-concurrency
parallel file upload, per-file progress queue, retry failed, completion countdown.

### WebSocket

`socketMiddleware` opens `wss://.../stream/ws/updates` with the access token passed via the
**`Sec-WebSocket-Protocol` subprotocol** (required by the backend; the server echoes it during
the handshake). Events `STREAM_UPDATED` / `STREAM_READY` invalidate RTK Query tags.

### HLS Player

Custom 547-line player on hls.js:
- Bearer auth + anti-cache `?t=` on all HLS requests;
- 403 → "Access denied";
- Second HLS instance for blurred background;
- Custom controls: play/pause, seek, volume, mute, wide, fullscreen;
- Keyboard shortcuts (Space/F/W/Arrows/H/Escape) + help overlay;
- Touch controls: tap to toggle, auto-hide after 3s;
- Flash overlays for volume/seek feedback.

### Theme System

Three themes via CSS custom properties:
- **Light:** white bg, dark text;
- **Dark:** near-black bg, light text;
- **Soft:** muted dark (`#343d3f` bg, lower contrast).

`ThemeProvider` persists to `<html>` classes. Soft applies both `.soft` and
`.dark` so `dark:` Tailwind variants work. `ModeToggle` cycles:
light → soft → dark → light (Sun / Star / Moon).

## Configuration

All URLs are configurable via environment variables (Vite `VITE_` prefix).
Defaults are set in `.env` (local dev) and `Dockerfile` ARGs (Docker/K8s builds).

| Variable | Default | Used in |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.example.com` | auth.ts, users.ts, streams.ts |
| `VITE_WS_URL` | `wss://api.example.com/stream/ws/updates` | socketMiddleware.ts |
| `VITE_HLS_URL` | `https://api.example.com` | useVideoUrl.ts |
| `VITE_STORAGE_URL` | `https://storage.example.com/go-app-bucket/thumbnails` | stream-format.ts (thumbnails) |

To override for Docker builds:

```bash
docker build --build-arg VITE_API_URL=https://your-api.example.com .
```

Path alias `@/*` → `src/*` (tsconfig + vite.config.ts).

## Deployment

**Docker:** multi-stage — Node 20 + pnpm builder → nginx:alpine.
SPA fallback, 1-year immutable cache on static assets, gzip, `/health` endpoint.

**K8s:** manifests in `k8s/` (Deployment, Service, Ingress).
Image `xomrkob/web-frontend:latest`, namespace `go-app`.
Resources: 50-100m CPU, 64-128Mi memory. Probes on `/health`.

## Known Issues

- `useVideoUrl` is a stub — returns `isLoading: null`, `error: null`
  (dead branches in StreamPage can never trigger loading/error states).

## Troubleshooting

### kindnet veth flaking (WSL2 / Docker Desktop)

**Symptom:** pods Running but requests hang (504, 60s+). Login, upload,
or any DB-backed endpoint stalls.

**Diagnosis:**
```bash
kubectl run nettest --image=busybox --rm -it -- nc -z -w 6 postgresql 5432
```

**Fix:**
```bash
kubectl delete pod -n kube-system -l k8s-app=kindnet
kubectl delete pod -n go-app postgresql-0 casbin-redis-master-0
```

**Note:** known kindnet issue on WSL2, recurred many times — now auto-healed by the
`kindnet-recovery` DaemonSet in `go-app` (restarts the CNI + postgres/redis pods on failure).
Data safe (PVC). If identity-service enters CrashLoopBackOff after recovery, delete its pod.

## Contributing

### Development Setup

```bash
pnpm install
pnpm dev
```

### Code Style

- TypeScript strict, no unused locals/parameters;
- ESLint flat config (v9+) with react-hooks + react-refresh;
- Tailwind CSS 4 (CSS-first, no tailwind.config.ts);
- shadcn/ui (New York) in `src/components/ui/`,
  8-bit variants in `src/components/ui/8bit/`;
- `cn()` utility for class merging (clsx + tailwind-merge);
- Types in `src/types/` (auth, stream, user);
- No comments in code (unless requested), no secrets in commits.

## Changelog

- **WS subprotocol auth:** token moved from `?token=` to `Sec-WebSocket-Protocol`
  (matches backend `WSProtocolAuth`, fixes handshake with gorilla/websocket);
- **Dead code removed:** `useVideoProgress`, `videoProgress` slice,
  `transcoder-progress.tsx` (backend only sends `STREAM_UPDATED`/`STREAM_READY`);
- **Batch upload:** Single/Batch tabs, multi-file dropzone, parallel upload,
  retry, completion countdown;
- **Soft theme:** muted dark, cyclic Sun/Star/Moon toggle;
- **Table view:** default table on OwnStreams, grid toggle, sorting,
  mobile-responsive;
- **HLS player:** blurred background, wide/fullscreen, keyboard shortcuts,
  touch controls, flash overlays;
- **Mobile nav:** hamburger dropdown;
- **Toasts:** Sonner with 8-bit styling;
- **Stream cards:** square thumbnails, duration badge;
- **Edit page:** HLS preview above form;
- **Self-hosted font:** Press Start 2P via @fontsource;
- **Hardened uploads:** chunk retry, 30s timeout;
- **Docker fix:** pnpm-workspace.yaml allowBuilds.
