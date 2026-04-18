# Metylosa Global Payments (Miskiclos Core)

Estado actual: **Tramo 1–15 implementado en código** (validación runtime limitada por entorno sin acceso a registry).

## Endpoints nuevos (Tramos 12-15)
### User360
- `GET /api/admin/user360/:userId`
- `GET /api/admin/user360/:userId/timeline`
- `POST /api/admin/user360/:userId/actions/audit`

### Observabilidad
- `GET /api/admin/observability/metrics`
- `GET /api/admin/observability/security-events`
- `GET /api/admin/observability/readiness`
- `GET /api/health`
- `GET /api/health/readiness`
- `GET /api/health/liveness`

### Fiscal sandbox
- `POST /api/admin/fiscal/sale-orders`
- `POST /api/admin/fiscal/invoice-requests`
- `POST /api/admin/fiscal/invoice-requests/:id/submit`
- `GET /api/admin/fiscal/invoice-requests/:id`

### Notificaciones admin
- `GET /api/admin/notifications`

## Migraciones nuevas
- `prisma/migrations/202604101100_tramo7_admin_ledger_trace_indexes`
- `prisma/migrations/202604101330_tramo9_10_treasury_risk`
- `prisma/migrations/202604121200_tramo12_15_user360_observability_fiscal_notifications`

## Quickstart
1. `DATABASE_URL=mysql://user:pass@localhost:3306/metylosa`
2. `pnpm install`
3. `pnpm db:generate`
4. `pnpm db:migrate`
5. `pnpm db:seed`
6. `pnpm dev`
7. `pnpm test`
