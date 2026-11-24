FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# образ для автотестов: docker compose --profile test run --rm api-test
FROM deps AS test
COPY . .
CMD ["npm", "test"]

FROM deps AS build
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY package.json ./
EXPOSE 3001
# миграции -> демо-данные (только в пустую базу) -> сервер
CMD ["sh", "-c", "node dist/db/seed.js --if-empty && node dist/main.js"]
