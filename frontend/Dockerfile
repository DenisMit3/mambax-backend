# Multi-stage build for Next.js

# Stage 1: Dependencies
FROM node:20-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app
RUN npm run build

# Stage 3: Development
FROM node:20-alpine AS development
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment
ENV NEXT_TELEMETRY_DISABLED=1

# Start development server
CMD ["npm", "run", "dev"]

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start production server
CMD ["node", "server.js"]
