FROM node:22-alpine AS base

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
FROM base AS dev
USER sto
