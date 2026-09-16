# 開発用ステージ
FROM node:24.13.0-bookworm-slim AS development

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .


# 本番 ビルド用ステージ
FROM development AS build

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build


# 本番 配信用ステージ
# 必要なdistのみ前ステージからコピーして本番
FROM nginx:alpine AS production 

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
