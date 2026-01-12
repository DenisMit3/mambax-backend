---
id: "22279dd0-0e1c-46ba-89bc-d9d74e98d862"
title: "🏗️ Project Infrastructure & Setup"
assignee: ""
status: 0
createdAt: "1768027522563"
updatedAt: "1768027748513"
type: ticket
---

# 🏗️ Project Infrastructure & Setup

# Project Infrastructure & Setup

## Overview
Set up the foundational infrastructure for the Enterprise Admin Dashboard using Turborepo monorepo architecture with Next.js 15.3, tRPC 11, and Drizzle ORM.

## Scope

### 1. Monorepo Structure
- Initialize Turborepo 2.0 workspace
- Configure workspace packages: `apps/admin`, `apps/web`, `packages/ui`, `packages/database`, `packages/api`
- Set up shared TypeScript configuration
- Configure ESLint and Prettier for code consistency

### 2. Admin App Setup
- Create Next.js 15.3 app with App Router
- Configure TypeScript 5.6 with strict mode
- Set up Tailwind CSS 4.0 with custom Dark Glassmorphism theme
- Install and configure Shadcn/UI 2.5 components
- Set up Framer Motion 12 for animations

### 3. Database Layer
- Set up Drizzle ORM with PostgreSQL 17
- Create database schema for all admin tables (see `spec:d20d9731-f08e-4c42-83f3-53fa763e440e/0fdc7511-28a7-4deb-b025-85510c054d88`)
- Configure database migrations
- Set up connection pooling
- Create seed data for development

### 4. API Layer
- Set up tRPC 11 with App Router integration
- Configure TanStack Query 5 for data fetching
- Create base router structure
- Set up authentication middleware
- Configure CORS and security headers

### 5. Development Environment
- Create Docker Compose for local development (PostgreSQL, Redis)
- Set up environment variables management
- Configure hot reload and fast refresh
- Set up development scripts

## Technical Requirements

**Dependencies:**
```json
{
  "next": "15.3.0",
  "react": "19.3.0",
  "typescript": "5.6.0",
  "@trpc/server": "^11.0.0",
  "@trpc/client": "^11.0.0",
  "@trpc/react-query": "^11.0.0",
  "@tanstack/react-query": "^5.0.0",
  "drizzle-orm": "^0.30.0",
  "drizzle-kit": "^0.20.0",
  "turbo": "^2.0.0",
  "tailwindcss": "^4.0.0",
  "framer-motion": "^12.0.0"
}
```

**File Structure:**
```
dating-platform-admin/
├── apps/
│   ├── admin/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── server/
│   │   └── package.json
│   └── web/
├── packages/
│   ├── ui/
│   ├── database/
│   ├── api/
│   └── config/
├── turbo.json
└── package.json
```

## Acceptance Criteria

- [ ] Turborepo workspace successfully builds all packages
- [ ] Next.js admin app runs on `localhost:3001`
- [ ] Database migrations run successfully
- [ ] tRPC endpoints are accessible and type-safe
- [ ] Tailwind CSS with Dark Glassmorphism theme is applied
- [ ] Docker Compose starts all services (PostgreSQL, Redis)
- [ ] Hot reload works for all packages
- [ ] TypeScript compilation has zero errors
- [ ] ESLint passes with no warnings

## Dependencies
None (foundational ticket)

## Estimated Effort
3-5 days

## Technical Notes

**Turborepo Configuration:**
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Database Connection:**
- Use connection pooling with `pg` driver
- Configure SSL for production
- Set up read replicas for analytics queries

**Environment Variables:**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
OPENAI_API_KEY=...
HUGGINGFACE_API_KEY=...
```

## Related Files
- `file:turbo.json`
- `file:apps/admin/package.json`
- `file:packages/database/src/schema/admin.ts`
- `file:docker/docker-compose.yml`

## References
- Spec: `spec:d20d9731-f08e-4c42-83f3-53fa763e440e/0fdc7511-28a7-4deb-b025-85510c054d88`
