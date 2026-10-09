# syntax=docker/dockerfile:1

# package.json requires node >= 24
ARG NODE_VERSION=24
ARG PNPM_VERSION=11.17.0

# ---- deps: install dependencies from pnpm-lock.yaml ----
FROM node:${NODE_VERSION}-alpine AS deps
ARG PNPM_VERSION
WORKDIR /app
RUN npm install -g pnpm@${PNPM_VERSION}
# pnpm-workspace.yaml / .npmrc carry pnpm settings (e.g. which dependencies may run build scripts);
# the wildcards copy them only if they exist.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./
RUN pnpm install --frozen-lockfile

# ---- build: compile the Next.js app ----
FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@${PNPM_VERSION}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
RUN pnpm run build

# ---- runtime ----
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
# Port 3000 matches the grievance-ui Service in the develop namespace.
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
