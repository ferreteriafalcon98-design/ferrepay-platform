# Entrega técnica — Tramo 5 + Tramo 6

## 1. objetivo cumplido
- Tramo 5: pricing/quotes integrado en `P2P preview` y `payout preview`, con `quoteId`, `expiresAt`, `feeAmount`, `grossAmount`, `netAmount`, validación de expiración y lifecycle (`ACTIVE/EXPIRED/CONSUMED`).
- Tramo 6: beneficiarios CRUD real con step-up, payout preview/request real, `wallet_holds` reales, approve/reject conectados a review flow, historial de payouts y trazabilidad.

## 2. archivos tocados
- `prisma/schema.prisma`
- `apps/api-gateway/src/pricing/{pricing.module.ts,pricing.controller.ts,pricing.service.ts}`
- `apps/api-gateway/src/p2p/{p2p.module.ts,p2p.controller.ts,p2p.service.ts}`
- `apps/api-gateway/src/payouts/{payouts.module.ts,payouts.controller.ts,payouts.service.ts}`
- `apps/api-gateway/src/wallet/wallet.service.ts`
- `apps/api-gateway/src/ledger/{ledger.controller.ts,ledger.service.ts}`
- `apps/api-gateway/src/app.module.ts`
- `README.md`

## 3. migraciones tocadas
- Se actualizó `prisma/schema.prisma` con modelos/enums de pricing, quotes, beneficiaries, holds, payout requests y review cases.
- Queda pendiente ejecutar/generar migración versionada en entorno con acceso a `pnpm/prisma`.

## 4. inconsistencias corregidas
- Preview P2P/Payout antes sin pricing persistente -> ahora usa `PricingQuote` persistido y expiración real.
- Payout sin hold/review -> ahora crea `WalletHold`, `PayoutRequest` y `ManualReviewCase`.
- Home wallet no descontaba holds -> ahora `available` deriva de ledger - active holds.
- Lifecycle de quote no explícito -> ahora `ACTIVE/EXPIRED/CONSUMED`.

## 5. qué quedó pendiente
- Motor de riesgo aún no integrado a approve/reject (siguiente tramo).
- Treasury overview aún no implementado (siguiente tramo).
- Notificaciones y admin widgets pendientes de tramos posteriores.
- Tests automatizados pendientes por bloqueo de instalación.

## 6. cómo probar
1) `pnpm install`
2) `pnpm db:generate`
3) `pnpm db:migrate`
4) `pnpm dev`
5) Flujo Tramo 5:
   - `POST /api/p2p/preview` => crea quote y **no postea ledger**
   - `POST /api/p2p/send` con `quoteId` válido => postea ledger y consume quote
   - `POST /api/payouts/preview` => crea quote y **no postea ledger**
6) Flujo Tramo 6:
   - CRUD beneficiarios usando header `x-step-up-token: verified`
   - `POST /api/payouts/request` => crea hold + payout + review case
   - `POST /api/payouts/:id/approve` => consume hold + posting ledger + review approved
   - `POST /api/payouts/:id/reject` => release hold + review rejected
   - `GET /api/payouts/history`

## 7. riesgos actuales
- Sin instalación de dependencias en este entorno (proxy), por lo que no corrimos test/build/migrate aquí.
- Step-up es token header mínimo (debe reemplazarse por mecanismo robusto con challenge real).
- Falta validación de fondos insuficientes previa a crear hold/request.

## 8. rollback si aplica
- `git revert <commit_tramo_5_6>` para revertir código.
- Revertir migración en DB antes de revertir app code en entorno compartido.

## reglas no negociables (cumplimiento explícito)
- wallet != ledger
- payment != ledger
- fiscal != order/payment
- preview no postea ledger
- P2P interno no toca treasury
- treasury no toca pasivos de usuario directamente
- toda operación monetaria real pasa por ledger
- reverso crea reverso, nunca borra transacción original
