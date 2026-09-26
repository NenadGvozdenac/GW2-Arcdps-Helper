FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
# The Docker stack is a local environment: use .env.development (VITE_API_URL empty -> "/api",
# which nginx proxies to the backend container) instead of the production URL.
RUN npm run build:local

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
