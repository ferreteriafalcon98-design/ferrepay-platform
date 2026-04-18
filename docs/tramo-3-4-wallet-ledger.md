# Entrega técnica — Tramo 3 completo + Tramo 4 base

## 1) Objetivo cumplido
Se implementó wallet bootstrap real, wallet home/history derivados del ledger y base de ledger doble entrada (accounts, transactions, entries) con posting y reversal service.

## 2) Archivos tocados
- `prisma/schema.prisma`
- `apps/api-gateway/src/app.module.ts`
- `apps/api-gateway/src/ledger/{ledger.module.ts,ledger.controller.ts,ledger.service.ts}`
- `apps/api-gateway/src/wallet/{wallet.module.ts,wallet.controller.ts,wallet.service.ts}`
- `apps/api-gateway/src/p2p/{p2p.module.ts,p2p.controller.ts,p2p.service.ts}`
- `README.md`

## 3) Inconsistencias corregidas
- Wallet history ya no se basa en placeholders; ahora deriva de ledger entries posteadas.
- Wallet bootstrap crea alias telefónico + ledger accounts en una sola operación de bootstrap.
- Se separó explícitamente wallet de ledger (wallet consulta/expone, ledger postea/mueve saldos).
- Se implementó reverso contable creando transacción inversa; no se borra la original.

## 4) Qué quedó pendiente
- Motor de pricing + quotes aplicado en P2P/payouts.
- Validación de fondos insuficientes y reservas/holds previos al posting.
- Panel admin para inspección de ledger y reversals.
- Migraciones Prisma versionadas y tests E2E.

## 5) Cómo probar
1. `pnpm install`
2. `pnpm db:generate`
3. `pnpm db:migrate`
4. `pnpm dev`
5. Flujo:
   - Auth register/login
   - `POST /api/wallet/bootstrap`
   - `GET /api/wallet/home`
   - `GET /api/wallet/history`
   - `GET /api/wallet/alias/:phone`
   - `POST /api/p2p/preview` (debe retornar `postsLedger:false`)
   - `POST /api/p2p/send` (postea ledger con `origin:P2P_INTERNAL`, `touchesTreasury:false`)
   - `POST /api/ledger/reversals` para reversar una transacción

## 6) Riesgos actuales
- Aún sin pruebas automatizadas.
- Falta control formal de concurrencia/idem-potencia para posting/reversal.
- Entorno sin acceso a registry impide validar instalación en esta ejecución.

## 7) Siguiente tramo recomendado
Tramo 5 + 6: P2P endurecido (límite, riesgo, antifraude) + payouts/beneficiarios/holds/review sin tocar pasivos de usuario fuera de ledger.

## Reglas explícitas preservadas
- `wallet != ledger`
- `preview no postea ledger`
- `payment != ledger`
- `fiscal != order/payment`
- `P2P interno no toca treasury`
