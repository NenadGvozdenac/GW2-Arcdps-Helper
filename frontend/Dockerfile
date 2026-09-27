FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
# The Docker stack is a local environment: use .env.development (VITE_API_URL empty -> "/api",
# which nginx proxies to the backend container) instead of the production URL.
RUN npm run build:local

# Hot-reload stage for `make dev`: the Vite dev server on port 8080 (docker-compose.dev.yml syncs the sources).
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
EXPOSE 8080
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "8080", "--strictPort"]

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
