# Tramos 8-11 — Ejecución secuencial

## Tramo 8
- Implementado: tests unitarios base (auth/security/wallet/ledger/admin-ledger), integration test de módulos, e2e skeleton de flujos críticos, smoke checklist.
- Probado: no ejecutado por bloqueo de instalación de dependencias.

## Tramo 9
- Implementado: treasury accounts/policies/rebalance models, servicio de overview con bandas CO/VE y forecast mínimo.
- Probado: no ejecutado runtime.

## Tramo 10
- Implementado: risk events persistidos, scoring base, decision allow/review/block, SLA de review en payouts, hooks en auth/security/p2p/payouts.
- Probado: validación estática únicamente.

## Tramo 11
- Implementado: admin dashboard widgets accionables (pending reviews, pending payouts, treasury overview, security alerts) + recent activity feed.
- Probado: no ejecutado runtime.

## Bloqueo de entorno
- `pnpm install` falla por proxy/registry, por lo que no se pudieron correr migraciones/tests/build.
