# 1. Base Image
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 2. Dependencies Stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile
RUN npx prisma generate

# 3. Build Stage
FROM base AS build
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
RUN pnpm run build
RUN pnpm prune --prod

# 4. Production Stage (Final Image)
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy only necessary files for production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
