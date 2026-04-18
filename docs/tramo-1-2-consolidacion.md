# Entrega técnica — Estado real Tramo 1 + Tramo 2 (actualizado)

## 1) Objetivo cumplido
- Se consolidó el workspace (pnpm + turbo + tsconfig paths).
- Se cerró Tramo 2 de auth/security con persistencia real (OTP/sessions/devices/security events).
- Se dejó preparado wallet bootstrap real como puente hacia Tramo 3.

## 2) Archivos tocados
- Workspace: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`.
- Prisma: `prisma/schema.prisma`.
- API gateway: `apps/api-gateway/src/{auth,security,wallet,common}/*`, `apps/api-gateway/src/app.module.ts`.
- Packages: `packages/{db,shared-kernel,auth,security,devices,users,config,wallet}/*`.
- Documentación: `README.md`, este documento.

## 3) Inconsistencias corregidas
- Repo sin monorepo funcional -> normalizado con workspace/scripts/tasks.
- Imports inter-package inconsistentes -> paths centralizados.
- Auth sin persistencia -> Prisma con modelos de OTP/session/device/events.
- Security sin trazabilidad -> eventos persistidos y overview enriquecido.
- Logout acoplado a body -> ahora usa headers de identidad/sesión.
- Inicio de Tramo 3 ausente -> wallet bootstrap y alias telefónico inicial.

## 4) Pendiente
- Guard/autorización formal con JWT access token (hoy headers operativos).
- Conectar balances de wallet a ledger (sin mutación manual).
- Tramo 3 completo (home/history derivado de ledger), Tramo 4+ (ledger real, P2P, payouts, pricing, treasury, risk, admin).
- Tests automatizados E2E/unit.

## 5) Cómo probar
1. `pnpm install`
2. `pnpm db:generate`
3. `pnpm db:migrate`
4. `pnpm dev`
5. Flujo:
   - `POST /api/auth/register/start`
   - `POST /api/auth/register/verify`
   - `POST /api/auth/login/start`
   - `POST /api/auth/login/verify`
   - `POST /api/auth/refresh`
   - `POST /api/auth/logout` (con `x-user-id`, `x-session-id`)
   - `GET /api/security/overview` (con `x-user-id`)
   - `POST /api/security/pin/setup`
   - `POST /api/security/biometric/enable|disable`
   - `GET /api/security/devices`
   - `POST /api/security/devices/:id/revoke`
   - `GET /api/security/sessions`
   - `POST /api/security/sessions/:id/revoke`
   - `POST /api/wallet/bootstrap`
   - `GET /api/wallet/home`
   - `GET /api/wallet/history`

## 6) Riesgos actuales
- Entorno de ejecución con red restringida impide validar install/build aquí.
- `otpPreview` se devuelve solo fuera de producción; validar `NODE_ENV=production` en despliegue.
- Se requiere disciplina de migraciones Prisma antes de despliegue compartido.

## 7) Siguiente tramo recomendado
- Tramo 3 completo + Tramo 4 base:
  1) ledger accounts/entries/transactions + posting/reversal
  2) wallet home/history 100% derivado de ledger
  3) alias lookup para P2P preview/send sin tocar treasury
