# Web demo: the UI only, no Rust backend and no AI keys. Data stays in the visitor's browser.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Telemetry is off when these are unset (infra-vps sites/add-telemetry.sh sets them on Coolify).
ARG VITE_UMAMI_ID VITE_UMAMI_SRC VITE_GLITCHTIP_DSN
RUN pnpm exec vp build

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/headers.conf /etc/nginx/headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
