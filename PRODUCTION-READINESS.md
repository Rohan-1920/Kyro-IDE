# Production Readiness

## Implemented

- Rate limiting utility: `lib/server/utils/rate-limit.ts`
- Structured and monitor-ready error capture: `lib/server/utils/monitoring.ts`
- Audit logs API: `GET /api/audit`
- CI pipeline: `.github/workflows/ci.yml`

## Backup Strategy

- Database backup frequency: every 6 hours full snapshot
- Keep retention for 14 days
- Validate restore weekly in staging
- Encrypt backups at rest and in transit

## Monitoring and Alerts

- Capture all unhandled route errors via monitoring hook
- Alert when 5xx exceeds 2% for 5 minutes
- Alert when rate-limited responses exceed baseline by 3x
- Add uptime checks for `/api/health` every 1 minute

## Deploy Strategy

- Blue/green deploy with health check gates
- Rollback trigger when 5xx spike after deploy
- Migrations run before traffic switch

## Security Controls

- HttpOnly session cookies
- Project ownership authorization guards
- Safe command policy for terminal execution
- Per-route rate limiting
