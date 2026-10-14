# 開発用ステージ
FROM node:24.13.0-bookworm-slim AS development

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]


# 本番 ビルド用ステージ
FROM development AS build

ARG VITE_API_BASE_URL

RUN npm run build


# 本番 配信用ステージ
# 必要なdistのみ前ステージからコピーして本番
FROM nginx:alpine AS production 

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
