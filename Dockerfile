FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

ARG VITE_API_URL=https://api.example.com
ARG VITE_WS_URL=wss://api.example.com/stream/ws/updates
ARG VITE_HLS_URL=https://api.example.com
ARG VITE_STORAGE_URL=https://storage.example.com/go-app-bucket/thumbnails

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_HLS_URL=$VITE_HLS_URL
ENV VITE_STORAGE_URL=$VITE_STORAGE_URL

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --config.confirmModulesPurge=false --config.packagesIgnoreBuiltDependencies='[]' --config.packagesOnlyBuiltDependencies='["esbuild","msw"]'
COPY . .
RUN pnpm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
