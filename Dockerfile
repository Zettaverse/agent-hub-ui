# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Use the nginx template mechanism so ${BACKEND_HOST}/${BACKEND_PORT} are
# substituted at container startup via envsubst.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV BACKEND_HOST=localhost \
    BACKEND_PORT=8080

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
