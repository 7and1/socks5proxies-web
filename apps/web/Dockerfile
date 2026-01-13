# Build stage
FROM node:20-slim AS builder

# Install pnpm and build dependencies
RUN apt-get update && \
    apt-get install -y python3 make g++ curl && \
    corepack enable && \
    corepack prepare pnpm@latest --activate && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY apps/web/package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY apps/web/ ./

# Build application
RUN pnpm build

# Production stage
FROM node:20-slim AS production

# Install curl + build deps for sharp (cleaned up after install)
RUN apt-get update && apt-get install -y curl python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy package.json for sharp reinstall
COPY --from=builder /app/package.json ./

# CRITICAL: Reinstall sharp for production (linux platform)
# Use build deps above to allow a source build fallback if prebuilt downloads fail.
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm add --os=linux --cpu=x64 sharp && \
    apt-get purge -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
