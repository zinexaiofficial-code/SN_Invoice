# ==============================================================================
# SN INVOICE — PRODUCTION DOCKERFILE
# Multi-stage, secure non-root standalone build for Next.js 14
# Target: Hostinger Ubuntu VPS
# ==============================================================================

# 1. Base Image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1

# 2. Dependencies Stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass build-time environment variable placeholders for static compilation
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_APP_NAME="SN Invoice"
ARG NEXT_PUBLIC_APP_URL="https://sn-invoice.duckdns.org"
ARG NEXT_PUBLIC_DEFAULT_CURRENCY="LKR"
ARG NEXT_PUBLIC_DEFAULT_TIMEZONE="Asia/Colombo"
ARG NEXT_PUBLIC_DEFAULT_VAT_RATE=18

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_DEFAULT_CURRENCY=$NEXT_PUBLIC_DEFAULT_CURRENCY
ENV NEXT_PUBLIC_DEFAULT_TIMEZONE=$NEXT_PUBLIC_DEFAULT_TIMEZONE
ENV NEXT_PUBLIC_DEFAULT_VAT_RATE=$NEXT_PUBLIC_DEFAULT_VAT_RATE

RUN npm run build

# 4. Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create persistent data directory for uploads and PDFs
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Copy standalone build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

