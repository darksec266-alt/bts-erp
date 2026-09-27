# The worker process shares apps/api's codebase (src/worker.ts vs.
# src/server.ts — see that file's comment) rather than being a separate
# app, so this Dockerfile mirrors api.Dockerfile exactly except for the
# final CMD.

FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm install --workspaces --if-present --include-workspace-root

FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run generate --workspace=packages/db
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
CMD ["node", "apps/api/dist/worker.js"]
