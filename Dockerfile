FROM node:22-alpine AS base

RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the source
COPY . .

# ── Build stage ──────────────────────────────────────────────────────
FROM base AS build
RUN npm run build

# ── Dev stage (default) ──────────────────────────────────────────────
FROM base AS dev
