# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package*.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variable for the build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 3: Production runner (standalone output — no node_modules needed)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
