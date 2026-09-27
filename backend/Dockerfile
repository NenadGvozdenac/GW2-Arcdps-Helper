FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Hot-reload stage for `make dev` (docker-compose.dev.yml syncs src/ into the container).
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
EXPOSE 3000
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && npx tsx watch src/server.ts"]

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3000
USER node
# Run pending migrations, then start the API.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
