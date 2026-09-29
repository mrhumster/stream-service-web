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
| State | Redux Toolkit + RTK Query, Zustand (coexist) |
| Routing | React Router v7 (`createBrowserRouter`) |
| Video | HLS.js (playback), custom HLS player |
| Components | shadcn/ui (New York) + Radix primitives + custom 8-bit pixel art components |
| Icons | `pixelarticons` (pixel SVG components), lucide-react; the `@hackernoon/pixel-icon-library` icon font is still imported by `index.css` but no longer used in any component |
| Maps | Leaflet 1.9 (location dialog, OpenStreetMap tiles) |
| Fonts | Press Start 2P (self-hosted via @fontsource) |
| Toasts | Sonner (8-bit styled) |
| Upload | react-dropzone, multipart/chunked upload |
| Markdown | react-markdown + remark-gfm (comments) |

> `react`, `react-dom`, `hls.js`, `leaflet`, `sonner`, `react-markdown`, `react-dropzone`,
> `zustand` are runtime dependencies; Redux Toolkit, `react-redux`, `react-router-dom` and
> `shadcn` (CLI) are declared in `devDependencies` (they are bundled at build time).

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
- **Stream visibility:** `public`, `private`, `unlisted` — `unlisted` = "shared by link" (hidden from
  the catalog, anyone with the URL can watch): Share button copies the link, the stream page renders
  for the non-owner (player, details, comments, reactions) without any owner controls,
  and Stream Details shows `(anyone with the link can watch)`;
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
- **Public catalog** with infinite scroll (IntersectionObserver, 24 per page) and
  server-side search: `q` is debounced (400 ms), persisted in `?q=`, and matched by the
  backend against title, description and tags; a separate `?tag=` chip filter is applied
  client-side on top of the fetched page;
- **My Streams** page with table/grid toggle (default table), **server-side** status and
  "faces detected" filters plus `created_at`/`title`/`status` sorting (50 per page,
  infinite scroll), and a quick Share (copy-link) action for `unlisted` streams in the
  table. Filters, sorting and view mode live in the `ownStreamsFilters` Redux slice and are
  persisted to `localStorage` (`gocast-own-streams-filters`), so they survive navigation;
- **Batch face detection:** multiselect (checkboxes in grid and table) → `Detect Faces (N of M)`
  posts one `POST stream/faces/batch` request for all selected streams without detections;
- **Edit page** with HLS player preview for ready/published streams;
- **Mobile responsive:** hamburger nav, hidden columns on small screens;
- **Toast notifications** (Sonner, styled as 8-bit pixel toasts);
- **Stream cards** with square thumbnails and duration badge;
- **Marquee title** for long titles that overflow their container;
- **Video metadata:** recorded date / location / camera (from transcoder ffprobe) shown in
  Stream Details when present on the stream;
- **Email verification:** `/verify` page (single-use token), resend, verification banner in
  MainLayout, "Unverified" badge in profile, create-stream gate (admin bypass);
- **Comments:** `CommentsSection` under Stream Details — markdown (react-markdown + GFM,
  no raw HTML), replies, keyset pagination, edit/delete for authors, admin-delete,
  comment gate (only `published` non-private streams);
- **Activity feed (`/activity`):** who/what/when across streams and your account,
  unread highlight + mark-read, infinite scroll;
- **Reactions + views:** pixel ReactionBar in the HLS player (like/dislike counters,
  optimistic updates, guest → sign-in hint); a view is registered once per stream
  after 80% of it has been watched;
- **Orientation (rotation):** view-only rotation in the player (`RotateCw` button, `R`
  shortcut, 0 → 90 → 180 → 270) that persists nothing by itself; the orientation is
  stored on the Edit page (Orientation selector → PATCH `metadata.rotation`) and passed
  back into the player as `initialRotation`. The box aspect is derived from the real
  `videoWidth`/`videoHeight`, so portrait sources are never cropped;
- **Face detection («Свои люди»):** owner/admin can run face clustering on a ready/published
  stream (single button or **batch** multiselect) — a `faces` processing task appears
  alongside transcode/thumbnail; `/people` lists detected clusters with server-side
  pagination and groups of likely duplicates (cosine similarity of 512-d centroids ≥ 50%),
  `/people/:clusterId` shows per-stream occurrences (timestamp + confidence);
- **Face management:** rename a person (with a "merge into existing person" suggestion when
  the name is already taken), delete a person, merge several people into one, unlink a
  person from a single video (`Unlink` in the stream's People block), and bulk-delete
  empty clusters. Deleting/merging never re-triggers detection — `faces_detected` stays
  `true` because the result is being curated, not invalidated (`VITE_FACES_URL` → faces-service);
- **Location map:** a pin in Stream Details opens a dialog with a lazy-loaded Leaflet map
  (OpenStreetMap tiles) + *Open in OSM* / *Open in Google Maps* links;
- **Error page:** the router's root `errorElement` renders a pixel-styled error page with
  a "Back to Streams" action instead of a blank React Router screen.

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
├── App.tsx                     # router (MainLayout + errorElement), ThemeProvider, Toaster
├── hooks.ts                    # typed Redux hooks
├── index.css                   # Tailwind + theme CSS (light/dark/soft)
├── assets/
│   └── react.svg
├── components/
│   ├── hls-player.tsx          # custom HLS player (wide/fullscreen/touch/blur/rotation)
│   ├── email-verification.tsx  # unverified banner (resend + /verify link)
│   ├── marquee-title.tsx       # auto-scrolling overflow text
│   ├── mode-toggle.tsx         # cyclic theme toggle (light → soft → dark)
│   ├── protected-route.tsx     # auth guard
│   ├── stream-card.tsx         # card with thumbnail + status + duration (+ select overlay)
│   ├── stream-sidebar.tsx      # infinite-scroll related streams
│   ├── theme-context.ts        # ThemeProviderContext + useTheme
│   ├── theme-provider.tsx      # ThemeProvider with localStorage
│   ├── video-dropzone.tsx      # react-dropzone (single/multi, max 20 files in multi mode)
│   ├── comments/
│   │   ├── comments-section.tsx # stream comments (markdown, replies, pagination)
│   │   └── markdown-body.tsx    # react-markdown + remark-gfm renderer
│   ├── faces/
│   │   ├── face-crop.tsx       # cluster thumbnail (lazy by default, eager opt-out)
│   │   └── people-block.tsx    # "People in this video" + unlink
│   ├── player/
│   │   └── reaction-bar.tsx     # 8-bit like/dislike/views bar
│   ├── stream/
│   │   ├── location-map.tsx    # lazy Leaflet + OpenStreetMap map
│   │   └── share-button.tsx     # copy-link button (8-bit)
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
│   ├── auth/authSlice.ts               # token + profile
│   ├── ownStreams/ownStreamsFiltersSlice.ts # filters/sort/view mode (localStorage)
│   └── settings/settingsSlice.ts       # theme preference
├── hooks/
│   ├── useAuth.ts
│   ├── use-in-view.ts        # reusable IntersectionObserver hook (lazy face crops)
│   ├── useMultipartUpload.ts
│   └── useVideoUrl.ts
├── layouts/MainLayout.tsx
├── lib/
│   ├── face-similarity.ts     # display helpers only (threshold 0.5, percent format);
│   │                          # similarity groups are computed by faces-service
│   ├── parse-location.ts      # "lat,lng" and ISO-6709 parsing
│   ├── stream-format.ts       # statusConfig, formatDate, thumbnailUrl
│   └── utils.ts               # cn(), getErrorMessage()
├── pages/
│   ├── ActivityPage.tsx        # activity feed (/activity)
│   ├── CreateStreamPage.tsx    # Single/Batch upload tabs
│   ├── EditStreamPage.tsx      # edit + HLS preview + orientation selector
│   ├── ErrorPage.tsx           # root errorElement (pixel style)
│   ├── HelpPage.tsx            # static help guide (/help)
│   ├── MainPage.tsx            # ⚠ dead code — legacy landing page, not routed (`/` → StreamsPage)
│   ├── OwnStreamsPage.tsx      # table/grid, server filters/sort, batch face detection
│   ├── PeoplePage.tsx          # face clusters (/people)
│   ├── PeopleDetailPage.tsx    # cluster detail + rename/merge (/people/:id)
│   ├── StreamPage.tsx          # detail + player + owner actions
│   ├── StreamsPage.tsx         # catalog (`/` and /streams), search + infinite scroll
│   └── VerifyPage.tsx          # email verification token
├── services/
│   ├── auth.ts                 # login, register, logout, verify/resend
│   ├── comments.ts             # commentApi (list/create/update/delete)
│   ├── events.ts               # eventApi (activity feed)
│   ├── faces.ts                # facesApi (list/detail/rename/merge/delete/unlink)
│   ├── stats.ts                # statsApi (reactions + views)
│   ├── streams.ts              # CRUD + upload (single/multipart) + search/filter params
│   └── users.ts                # whoami (with reauth)
├── store/
│   ├── store.ts
│   └── middleware/
│       ├── authListener.ts
│       └── socketMiddleware.ts
└── types/
    ├── auth.types.ts
    ├── comment.types.ts
    ├── event.types.ts
    ├── face.types.ts
    ├── stats.types.ts
    ├── stream.types.ts
    └── user.types.ts
```

## Routes

| Path | Page | Access |
| --- | --- | --- |
| `/` | Stream catalog | public |
| `/streams` | Stream catalog (same page as `/`) | public |
| `/streams/:id` | Stream detail + player | public for published `public`/`unlisted`; owner for the rest |
| `/streams/create` | Create stream | **authenticated only** |
| `/streams/own` | My streams | **authenticated only** |
| `/streams/:id/edit` | Edit stream | **authenticated only** |
| `/verify` | Email verification (token) | public |
| `/help` | Help guide | public |
| `/activity` | Activity feed | **authenticated only** |
| `/people` | People (face clusters) | **authenticated only** |
| `/people/:clusterId` | People detail + rename/merge | **authenticated only** |

Routes are nested under a single `MainLayout` element in `src/App.tsx`; its
`errorElement` is `ErrorPage`, so any throw in a route or in the layout renders the
pixel error page instead of React Router's blank screen.

Private routes are nested under `ProtectedRoute`: no token → redirect to `/`.
`MainPage.tsx` (legacy landing page) is **not routed** — `/` serves the catalog.

## Architecture

### State Management

`store/store.ts` combines 7 RTK Query API reducers plus 3 local slices:
- API slices — `authApi`, `userApi`, `streamApi`, `eventApi`, `commentApi`,
  `statsApi`, `facesApi` (each with its own `baseQueryWithReauth`);
- `auth` — token, profile, initialization flag;
- `settings` — theme preference (persisted to `localStorage`);
- `ownStreamsFilters` — My Streams status/faces filters, sort field/order and
  grid/table view mode (persisted to `localStorage` under
  `gocast-own-streams-filters`, so they survive navigation and reloads).

Middleware: `socketMiddleware` (WebSocket) and `authListener` (loads profile
after login).

### RTK Query + Reauth

All requests use `fetchBaseQuery` with `credentials: "include"` and 30s timeout.
`baseQueryWithReauth` intercepts 401, calls `POST auth/refresh`, retries the
original request on success; otherwise dispatches `eraseAuth`.

### Upload Flow

`useMultipartUpload`: `init` → 5 MiB chunks (`MAX_PART_ATTEMPTS = 3` per chunk,
exponential backoff) → `complete`.
Files smaller than one chunk (5 MiB) skip the multipart flow and go through the
plain `upload` endpoint instead.

**Batch upload** (`CreateStreamPage`): up to 20 files per batch
(`maxFiles` in `video-dropzone.tsx`), sequential stream creation with a 2-concurrency
parallel file upload, per-file progress queue, retry failed, completion countdown.

### WebSocket

`socketMiddleware` opens `wss://.../stream/ws/updates` with the access token passed via the
**`Sec-WebSocket-Protocol` subprotocol** (required by the backend; the server echoes it during
the handshake). Events `STREAM_UPDATED` / `STREAM_READY` invalidate RTK Query tags.

### HLS Player

Custom 684-line player on hls.js:
- Bearer auth + anti-cache `?t=` on all HLS requests;
- 403 → "Access denied";
- Second HLS instance for blurred background;
- Custom controls: play/pause, seek, volume, mute, wide, fullscreen, rotate;
- Keyboard shortcuts (Space/F/W/R/Arrows/H/Escape) + help overlay;
- Touch controls: tap to toggle, auto-hide after 3s;
- Flash overlays for volume/seek feedback;
- View-only rotation (`initialRotation` / `onRotationChange`): the box aspect comes
  from the real `videoWidth`/`videoHeight`, the rotation is applied to a wrapper
  layer (so the `<video>` element is never remounted and the HLS instance stays
  attached), and the root box is capped with `width: min(100%, <aspect>·70vh)` so
  portrait sources are letterboxed instead of cropped.

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
| `VITE_EVENTS_URL` | `https://events.example.com` | events.ts (activity feed) |
| `VITE_COMMENTS_URL` | `https://comments.example.com` | comments.ts (comments section) |
| `VITE_STATS_URL` | `https://stats.example.com` | stats.ts (reactions + views) |
| `VITE_FACES_URL` | `https://faces.example.com` | faces.ts (People page) |

To override for Docker builds:

```bash
docker build --build-arg VITE_API_URL=https://your-api.example.com .
```

Path alias `@/*` → `src/*` (tsconfig + vite.config.ts).

## Deployment

**Docker:** multi-stage — Node 20 + pnpm builder → nginx:alpine.
SPA fallback, 1-year immutable cache on static assets, gzip, `/health` endpoint.

**K8s:** `k8s/` holds the local manifests — `deployment.yaml` and `service.yaml`
only (no Ingress; traefik is the default ingress class). The Ingress, ConfigMaps and
domain values are generated by `/home/xomrkob/projects/GoCast/scripts/render-env.sh`
and applied by the root `Makefile` (`make render`, `make apps`), not from this repo.
Image `xomrkob/web-frontend:latest`, namespace `go-app`.
Resources: 50-100m CPU, 64-128Mi memory. Probes on `/health`.
Note: the deployment uses the `:latest` tag, so redeploys need
`kubectl -n go-app rollout restart deployment/web-frontend` — `kubectl set image`
with the same tag is a no-op.

## Known Issues

- `useVideoUrl` is a stub — returns `isLoading: null`, `error: null`
  (dead branches in StreamPage can never trigger loading/error states).
- `src/pages/MainPage.tsx` is dead code: the legacy landing page is not routed
  (`/` renders `StreamsPage`) and nothing imports it.
- `axios` is declared in `package.json` but not used anywhere in `src/` —
  the API layer uses RTK Query (`fetchBaseQuery`) exclusively.
- `zustand` is declared in `package.json` but not imported anywhere: global state is
  Redux Toolkit only, and per-component state is local `useState` (Zustand coexists
  in the stack as a leftover from an earlier plan).
- `@hackernoon/pixel-icon-library` is still imported in `src/index.css`
  (`@import ".../fonts/iconfont.css"`) but no component uses its `pixel-icon-*` classes —
  icons come from `pixelarticons/react` and lucide-react, so the font is dead weight in
  the CSS bundle.

## Troubleshooting

### Cluster networking (k3s, since 2026-09-11)

The cluster was **migrated from Docker Desktop/K8s (kindnet) to k3s** — the recurring
kindnet pod→pod TCP flakiness (DNS OK / TCP FAIL) no longer applies.

If an endpoint hangs on a fresh k3s:
```bash
kubectl run nettest --image=busybox --rm -it -- nc -z -w 6 postgresql 5432
kubectl get pods -n go-app              # check CrashLoopBackOff / CreateContainerConfigError
kubectl get ingress -n go-app           # traefik picks up all ingress (default class)
```

**Note (k3s):** pod→pod TCP is flannel, stable. From inside WSL, curl to the public domains via
the traefik LB may time out (WSL networking) — use `--resolve <domain>:443:<traefik-LB-IP>` or
test from the Windows side (hosts entry).

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
- Types in `src/types/` (`auth`, `user`, `stream`, `event`, `comment`, `stats`, `face`);
- No comments in code (unless requested), no secrets in commits.

## Changelog

- **Video orientation:** view-only rotation in the player (`RotateCw` / `R`, 0→90→180→270)
  + Orientation selector on the Edit page persisted to `metadata.rotation`. Series of
  geometry fixes: box aspect from the real `videoWidth`/`videoHeight`, rotation moved to an
  always-rendered wrapper layer (so `<video>` is never remounted and the HLS instance stays
  attached), `min()`-based box in wide mode, and a `70vh` cap in normal mode — portrait
  sources are no longer cropped or padded — 2026-09-26;
- **Catalog search:** server-side `q` (matches title, description and tags), input with
  400 ms debounce, `?q=` URL persistence, `?tag=` stays a client-side filter over the
  fetched page — 2026-09-26;
- **Crash fix + error page:** streams with `processing: null` no longer crash StreamPage
  (`processing` is now `StreamProcessingTask[] | null`); new `ErrorPage` as the router's
  root `errorElement` instead of a blank React Router screen — 2026-09-26;
- **Face management:** rename with "merge into existing person" suggestion, delete,
  merge several people, unlink a person from a single video, bulk-delete empty clusters;
  deleting/merging no longer re-triggers detection (`faces_detected` stays `true`) — 2026-09-25;
- **People `/people`:** server-side pagination (50/page) + server-computed groups and
  `total`, likely-duplicate groups (centroid cosine ≥ 50%) with **Select N** for merge,
  face crops lazy-loaded via IntersectionObserver (fixed the faces-reader 503) — 2026-09-25;
- **My Streams filters:** status/faces filters, sort field/order and grid/table view mode
  moved to Redux + `localStorage` (`gocast-own-streams-filters`) so they survive
  navigation; filter-dependent empty state with **Reset filters** — 2026-09-25;
- **Batch face detection:** multiselect streams (grid + table) → **Detect Faces (N of M)**,
  one batch request instead of N — 2026-09-25;
- **People («Свои люди»):** Detect Faces button on stream page (owner/admin) +
  `faces` task chip, `/people` cluster list, `/people/:clusterId` detail with rename,
  `VITE_FACES_URL` — 2026-09-22;
- **Help guide:** public `/help` page with topic sections + FAQ, Help link in
  header nav (desktop + mobile) — 2026-09-22;
- **Location map:** pin in Stream Details opens a dialog with an embedded Leaflet map
  (OpenStreetMap tiles, no API key) + OSM/Google Maps links; lazy-loaded — 2026-09-16;
- **Video metadata:** Recorded / Location / Camera rows in Stream Details (from
  transcoder ffprobe, incl. ISO-6709 parsing) — 2026-09-16;
- **Reactions + views:** ReactionBar in the HLS player (like/dislike optimistic),
  `registerView` after 80% of the stream is watched, `VITE_STATS_URL` — 2026-09-16;
- **Comments gate:** composer hidden on non-`published`/`private` streams
  (`allowComments`) — 2026-09-15;
- **Comments:** markdown section under Stream Details, replies, edit/delete,
  keyset pagination, `VITE_COMMENTS_URL` — 2026-09-15;
- **Activity feed:** `/activity`, unread badges, mark-read, `VITE_EVENTS_URL` — 2026-09-14;
- **Email verification:** `/verify`, banner, profile badge, create-stream gate — 2026-09-11;
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
