# apps/api — multi-stage build. Build context is the monorepo root (see
# docker-compose.yml's `context: .`) because npm workspaces needs the root
# package.json + lockfile plus every workspace's package.json to resolve
# cross-package deps (@bts/db, @bts/config, @bts/shared-types) correctly.

FROM node:20-alpine AS base
WORKDIR /repo

# ---- deps: install once, cached until any package.json changes ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm install --workspaces --if-present --include-workspace-root

# ---- build: compile TS -> JS ----
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run generate --workspace=packages/db
RUN npm run build --workspace=apps/api

# ---- runtime: slim image, prod deps only ----
FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
