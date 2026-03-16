FROM node:24-alpine AS base

RUN apk add --no-cache git zip

# Create non-root user
RUN addgroup -S sto && adduser -S sto -G sto

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the source
COPY . .

# Ensure non-root user can access the app
RUN chown -R sto:sto /app

# ── Build stage ──────────────────────────────────────────────────────
FROM base AS build
USER sto
RUN npm run build

# ── Dev stage (default) ──────────────────────────────────────────────
# NOTE: dev stage runs as root because docker-compose mounts the host
# directory as a volume — file ownership must match the host user.
# The CI pipeline also uses this stage with volume mounts.
# Security is enforced at the build stage level instead.
FROM base AS dev
