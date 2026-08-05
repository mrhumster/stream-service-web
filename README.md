# GoCast — Web Frontend

SPA фронтенд видеохостинга/стримингового сервиса GoCast. Позволяет загружать
видео, следить за транскодингом, публиковать и смотреть стримы через HLS-плеер,
управляя доступом (public/private/unlisted) и авторизацией по токенам.

Интерфейс стилизован под ретро-игры (пиксельный 8-bit UI) с поддержкой тёмной и
светлой темы.

## Стек

| Слой | Технология |
| --- | --- |
| UI | React 19, TypeScript |
| Сборка | Vite 7, Tailwind CSS 4, pnpm |
| Состояние | Redux Toolkit, RTK Query, Zustand |
| Роутинг | React Router v7 |
| Видео | HLS.js (воспроизведение) |
| Компоненты | shadcn/ui (New York) + кастомные 8-bit |
| Иконки | pixelarticons, lucide-react |

## Возможности

- Аутентификация: регистрация, вход, выход; access + refresh токены
  (cookie для refresh, автоматическое обновление при 401);
- Загрузка видео двумя способами:
  - прямая (`multipart/form-data`) для файлов до 5 МБ;
  - многопоточная multipart-загрузка (чанки 5 МБ, 3 параллельных куска) с
    прогресс-баром для больших файлов;
- Жизненный цикл стрима: `draft → processing → ready → published`, а также `error`;
- Видимость стрима: `public`, `private`, `unlisted`;
- Публикация / снятие с публикации;
- Просмотр через HLS-плеер с авторизацией (Bearer token) и защитой от кэша;
- Реальные обновления состояния стрима через WebSocket;
- Публичный каталог с бесконечной подгрузкой (IntersectionObserver);
- Личный кабинет: "My Videos", редактирование и удаление стримов.

## Команды

```bash
pnpm dev          # dev-сервер (Vite, HMR) на localhost:5173
pnpm build        # проверка типов (tsc -b) + production-сборка в dist/
pnpm lint         # ESLint (flat config)
pnpm preview      # локальный предпросмотр production-сборки
```

Docker / K8s:

```bash
pnpm docker:build   # собрать образ web-frontend
pnpm docker:run     # запустить контейнер на порту 3000 (nginx)
pnpm k8s:apply      # kubectl apply -f k8s/
pnpm k8s:deploy     # build → push → rollout restart deployment
```

## Структура проекта

```
src/
├── main.tsx                # точка входа, Provider + Redux store
├── App.tsx                 # роутер (createBrowserRouter)
├── pages/                  # страницы (Home, Streams, CreateStream, ...)
├── layouts/
│   └── MainLayout.tsx      # шапка, навигация, auth-модалки, футер
├── components/
│   ├── hls-player.tsx      # воспроизведение HLS с авторизацией
│   ├── stream-card.tsx     # карточка стрима + статусы
│   ├── video-dropzone.tsx  # drag & drop загрузка файла
│   ├── protected-route.tsx # гвардия приватных маршрутов
│   └── ui/                 # shadcn/ui + 8-bit (button, dropdown, progress)
├── feature/
│   ├── auth/               # authSlice (token, authUser, isInitializing)
│   └── videoProgress/      # прогресс транскодинга по streamId
├── services/
│   ├── auth.ts             # RTK Query: login / register / logout
│   ├── users.ts            # RTK Query: who, списки
│   └── streams.ts          # RTK Query: CRUD стримов + загрузка (multipart)
├── store/
│   ├── store.ts            # configureStore, rootReducer
│   └── middleware/
│       ├── socketMiddleware.ts # WebSocket-обновления стримов
│       └── authListener.ts     # подгрузка профиля после логина
├── hooks/                  # useAuth, useVideoUrl, useMultipartUpload, ...
├── types/                  # TS-типы auth / user / stream
├── lib/
│   └── utils.ts            # cn() (clsx + tailwind-merge)
└── index.css               # Tailwind и кастомные стили
```

## Маршруты

| Путь | Страница | Доступ |
| --- | --- | --- |
| `/` | MainPage (лендинг) | публичный |
| `/streams` | Каталог стримов | публичный |
| `/streams/:id` | Страница стрима + плеер | публичный (доступ по правам владельца) |
| `/streams/create` | Создание стрима | **только авторизованные** |
| `/streams/own` | Мои стримы | **только авторизованные** |
| `/streams/:id/edit` | Редактирование стрима | **только авторизованные** |

Приватные маршруты обёрнуты в `ProtectedRoute`: при отсутствии токена — редирект
на `/`.

## Архитектура

### State management

`store/store.ts` собирает редьюсеры:

- `authApi`, `userApi`, `streamApi` — RTK Query API slices;
- `auth` — токен, профиль (authUser), флаг инициализации;
- `videoProgress` — прогресс транскодинга по `streamId`.

Мидлвари: `socketMiddleware` (WebSocket) и `authListener` (загрузка профиля после
успешного логина).

### RTK Query и reauth

Все API-запросы используют `fetchBaseQuery` с `credentials: "include"`.
`baseQueryWithReauth` перехватывает ответ 401, вызывает `POST auth/refresh` и при
успехе повторяет исходный запрос; иначе очищает авторизацию (`eraseAuth`).

### Загрузка видео

`useMultipartUpload` реализует multipart-загрузку:

1. `POST /stream/{id}/upload/init` — получить `upload_id`;
2. нарезать файл на чанки по 5 МБ, заливать по 3 параллельно
   (`PUT /stream/{id}/upload/part`) с метаданными `part_number`/`etag`;
3. `POST /stream/{id}/upload/complete` — собрать части.

Для файлов до 5 МБ используется простая загрузка `POST /stream/{id}/upload`.

### WebSocket

`socketMiddleware` открывает соединение `wss://.../stream/ws/updates?token=...`
при появлении токена. По событиям `STREAM_UPDATED` и `STREAM_READY` инвалидирует
соответствующие теги RTK Query, вызывая автоматическую перезагрузку данных.

### Видеоплеер

`HLSPlayer` на базе hls.js: нативная поддержка HLS на iOS (Safari) или
эмулируемая на остальных браузерах. Запросы плейлиста и сегментов шлются с
заголовком `Authorization: Bearer <token>`. Ошибка 403 показывается
пользователю как "Access denied". URL дёргается параметром `t` для анти-кэша.

## Конфигурация

Базовые адреса захардкожены:

- REST API: `https://api.example.com/` (`src/services/*`, `src/hooks/useVideoUrl.ts`);
- WebSocket: `wss://api.example.com/stream/ws/updates` (`src/store/middleware/socketMiddleware.ts`);
- HLS-плейлист: `https://api.example.com/stream/{id}/hls/index.m3u8` (`useVideoUrl`).

Пат-алиас `@/*` → `src/*` настроен в `tsconfig` и `vite.config.ts`.

## Деплой

**Docker:** multi-stage сборка. Стадия `builder` — Node 20 + pnpm, собирает
`dist/`. Финальный образ — `nginx:alpine`, отдаёт статику с `nginx.conf`:

- SPA-fallback на `index.html`;
- кэширование статики на 1 год (`immutable`);
- gzip ответов;
- healthcheck-эндпоинт `/health`;
- образ слушает порт 80.

**K8s:** манифесты в `k8s/`. Скрипт `k8s:deploy` собирает образ, пушит в
Docker Hub (`xomrkob/web-frontend:latest`) и выполняет `rollout restart` деплоймента
`web-frontend` в namespace `go-app`.

## Примечания по коду

- `useVideoUrl` — заглушка: всегда возвращает `isLoading: null` и `error: null`;
- в `authSlice` есть дублирующийся обработчик `getAuthUser.matchFulfilled`;
- отладочные `console.log` в `socketMiddleware` и `hls-player`;
- в `StreamPage` присутствуют неиспользуемые переменные (например загрузка
  `Publish`/`Unpublish` состояний).
