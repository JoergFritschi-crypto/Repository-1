# GardenScape Pro

## Overview
GardenScape Pro is a full-stack web application designed for ornamental garden design with AI assistance. It provides tools for creating garden layouts, a comprehensive plant library, plant identification, and expert gardening advice. The platform aims to offer a professional and intuitive experience for garden enthusiasts and professionals.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript on Vite.
- **Routing**: Wouter for lightweight client-side navigation.
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS.
- **State Management**: TanStack Query for server state management and caching.
- **Form Handling**: React Hook Form with Zod validation.
- **Authentication**: Session-based authentication integrated with Replit's OpenID Connect.
- **Internationalization**: React i18next for 6-language support, including English, German, Italian, French, Spanish, and Polish.
- **Performance**: Lazy loading, virtual scrolling, code splitting, search debouncing, and comprehensive error boundaries.
- **UI/UX**: Gold accent theme, consistent skeleton loading, smooth transitions, and auto-save functionality.
- **Workflow**: Streamlined 6-step garden creation process focused on seasonal visualization.

### Backend Architecture
- **Runtime**: Node.js with Express.js framework.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM for type-safe database operations.
- **Session Management**: Express sessions with PostgreSQL storage using `connect-pg-simple`.
- **Authentication**: Passport.js with OpenID Connect strategy for Replit integration.
- **API Design**: RESTful API endpoints with standardized error handling.

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless.
- **Schema Management**: Drizzle Kit for migrations and schema synchronization.
- **Key Tables**: Users, sessions, gardens (with flexible shape and climate data), plants (with botanical info and care), plant collections, garden-plant relationships, and plant doctor sessions.
- **Plant Data**: Numeric dimension fields (heightMinCm, heightMaxCm, spreadMinCm, spreadMaxCm) for precise measurements in metric and Imperial units.

### Authentication & Authorization
- **Provider**: Replit OpenID Connect.
- **Session Storage**: PostgreSQL-backed sessions.
- **Security**: HTTP-only cookies, CSRF protection, and secure session management.
- **User Tiers**: Three subscription levels (free, pay_per_design, premium).

### AI System Architecture
- **AI Implementation**: Uses Anthropic Claude API for garden design generation.
- **Photorealization**: Automatic minimal marker mode for improved AI accuracy in garden visualizations (white dots on black background for AI reference).
- **Abuse Prevention**: Rate limiting and design limits implemented for different user tiers.

## External Dependencies

### Payment Processing
- **Stripe**: For subscription management, customer creation, and payment tracking.
- **React Stripe.js**: Frontend integration for payment forms.

### AI Services
- **Anthropic Claude**: AI-powered plant identification, disease diagnosis, care recommendations, and garden design generation.

### Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Replit Platform**: Integrated hosting and authentication.
- **Supabase (HTTP API)**: Planned integration for persistent storage, as direct database connections encounter DNS resolution issues in the Replit environment.

### UI & Design System
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide Icons**: Consistent icon library.
- **Google Fonts**: Custom typography (DM Sans, Architects Daughter, Fira Code).

## Backup & Disaster Recovery

### Backup Strategy

#### Automated Backups
- **Neon PostgreSQL**: Automatic backups with point-in-time recovery (PITR) enabled.
  - Continuous WAL archiving for up to 7 days of recovery points.
  - Daily snapshots retained for 7 days minimum.
  - Full database backups performed nightly at 2 AM UTC.

#### Manual Backup Procedures
1. **Before Critical Operations**:
   ```bash
   # Export full database backup
   npm run db:backup
   
   # Verify backup integrity
   npm run db:verify-backup
   ```

2. **User-Generated Content**:
   - Garden designs stored in `/vault/garden_designs/` with timestamped filenames.
   - Plant images in `/vault/garden_images/` and `/public/generated-images/`.
   - All uploaded assets in `/attached_assets/` directory.

3. **Application State**:
   - Session data backed up from PostgreSQL sessions table.
   - User preferences and settings exported via API endpoints.

### Recovery Procedures

#### Step-by-Step Database Restore

1. **From Neon Backup**:
   ```bash
   # Step 1: Access Neon console
   # Navigate to Settings → Backups → Restore
   
   # Step 2: Select recovery point (maximum 7 days)
   # Choose specific timestamp or latest available
   
   # Step 3: Initiate restore to new branch
   # Neon creates a new branch with restored data
   
   # Step 4: Update DATABASE_URL in Replit Secrets
   # Point to new restored branch
   
   # Step 5: Verify data integrity
   npm run db:health-check
   ```

2. **From Manual Backup**:
   ```bash
   # Restore from SQL dump
   npm run db:restore -- --file=backup_[timestamp].sql
   
   # Verify schema integrity
   npm run db:push
   ```

#### Fallback Cache During Outages
- **In-Memory Storage**: Application automatically falls back to `MemStorage` when database is unavailable.
- **Cache Duration**: 6 hours of operation without database connectivity.
- **Data Sync**: Automatic reconciliation when database connection restored.

#### Circuit Breaker Management
- **Status Check**: Monitor at `/api/health/detailed` endpoint.
- **Reset Procedure**:
  1. Wait for 30-second cooldown period.
  2. Test connection with `npm run db:ping`.
  3. If successful, circuit breaker auto-resets.
  4. If failed, check database status in Neon console.

### Data Export/Import

#### Export All User Data
```bash
# Complete user data export
npm run export:users -- --format=json --output=users_export.json

# Individual user export
npm run export:user -- --id=[user_id] --include-gardens
```

#### Export Garden Designs
```bash
# Export all gardens with metadata
npm run export:gardens -- --include-plants --include-images

# Export specific garden
npm run export:garden -- --id=[garden_id] --format=json
```

#### Import to New Instance
```bash
# Import users (preserves IDs)
npm run import:users -- --file=users_export.json --preserve-ids

# Import gardens with relationships
npm run import:gardens -- --file=gardens_export.json --map-users

# Bulk import with validation
npm run import:bulk -- --validate --dry-run
```

### Monitoring & Alerts

#### Health Check Endpoints
- **Basic Health**: `GET /api/health`
  - Returns: `{ status: "healthy" | "degraded" | "unhealthy", timestamp }`
  - Check interval: Every 30 seconds

- **Detailed Health**: `GET /api/health/detailed`
  - Includes: Database connectivity, session store status, cache status, API availability
  - Response time threshold: < 1000ms

#### Circuit Breaker Monitoring
- **Database Circuit**: Trips after 5 consecutive failures.
- **API Circuit**: Trips after 10 failures in 60 seconds.
- **Status Dashboard**: Available at `/admin/system-status` (admin only).

#### Error Rate Thresholds
- **Critical**: > 10% error rate over 5 minutes → Automatic degraded mode.
- **Warning**: > 5% error rate over 10 minutes → Alert administrators.
- **Recovery**: < 1% error rate for 15 minutes → Normal operation restored.

### Emergency Procedures

#### During an Outage

1. **Immediate Actions**:
   - Check `/api/health/detailed` for specific failure points.
   - Verify Neon database status at console.neon.tech.
   - Check Replit status page for platform issues.

2. **Communication**:
   - Update status banner: "System maintenance in progress".
   - Notify users via email if outage > 30 minutes.

3. **Mitigation**:
   - Enable read-only mode: `npm run mode:readonly`.
   - Activate local caching: `npm run cache:enable`.
   - Queue write operations for later processing.

#### Degraded Mode Operation
```bash
# Enable degraded mode
npm run mode:degraded

# Features available in degraded mode:
# - Plant library browsing (cached)
# - Garden viewing (read-only)
# - Static content access
# - Limited AI features (queued)

# Disable degraded mode
npm run mode:normal
```

#### Critical Issue Contacts
- **Database Issues**: Neon Support - support@neon.tech
- **Platform Issues**: Replit Support - Via dashboard ticket system
- **Payment Processing**: Stripe Support - Via Stripe Dashboard
- **AI Services**: Anthropic Status - status.anthropic.com

### Testing Recovery

#### Monthly Backup Restore Test
```bash
# Scheduled for first Sunday of each month
npm run test:backup-restore

# Test includes:
# 1. Create test backup
# 2. Restore to staging branch
# 3. Verify data integrity
# 4. Run automated tests
# 5. Generate report
```

#### Chaos Testing Recommendations
1. **Database Failure Simulation**:
   ```bash
   npm run chaos:db-failure -- --duration=5m
   ```

2. **Network Partition Test**:
   ```bash
   npm run chaos:network -- --latency=1000ms --packet-loss=10%
   ```

3. **Resource Exhaustion**:
   ```bash
   npm run chaos:resources -- --memory=90% --cpu=95%
   ```

#### Recovery Objectives
- **RTO (Recovery Time Objective)**: < 60 minutes
  - Database restore: 30 minutes
  - Application restart: 10 minutes
  - Verification: 20 minutes

- **RPO (Recovery Point Objective)**: < 24 hours
  - Maximum acceptable data loss: 24 hours
  - Typical data loss: < 1 hour (with PITR)
  - Critical data: Near-zero (session data, payments)

### Preventive Measures

#### Data Loss Prevention
1. **Pre-deployment Backups**: Automatic backup before any deployment.
2. **Transaction Logs**: All critical operations logged with timestamps.
3. **Dual-Write Pattern**: Critical data written to both database and file system.
4. **Validation Checksums**: Data integrity verified on all exports/imports.

#### Regular Maintenance
- **Weekly**: Verify backup integrity, check storage usage.
- **Monthly**: Full restore test, update recovery documentation.
- **Quarterly**: Disaster recovery drill, review and update procedures.

#### Monitoring Dashboard
Access comprehensive monitoring at `/admin/disaster-recovery`:
- Real-time backup status
- Last successful backup timestamp
- Storage usage and trends
- Recovery test results
- Incident history and lessons learned