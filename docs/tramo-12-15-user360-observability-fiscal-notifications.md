# Tramos 12-15 — User360, Observabilidad, Fiscal Sandbox, Notificaciones

## Tramo 12
- User360 admin endpoints con loaders reales por dominio y timeline unificada por usuario.
- Auditoría explícita de acciones disparadas desde User360 (`User360Audit`).

## Tramo 13
- Request ID middleware + logging estructurado básico.
- Health/readiness/liveness + métricas de observabilidad + security events para admin.
- Business events mínimos persistidos.

## Tramo 14
- Módulo fiscal sandbox con modelos persistidos:
  - sale_order
  - invoice_request
  - fiscal_document
  - fiscal_submission
  - fiscal_artifact
- `DocumentDecisionEngine` + `SandboxMockAdapter`.
- Conexión sale_order -> invoice_request.

## Tramo 15
- Notificaciones básicas persistidas con deduplicación (`dedupKey`) y plantillas mínimas:
  - OTP sent
  - login new device
  - p2p received
  - payout requested
  - payout approved
  - payout rejected
  - security alert

## Validación pendiente
- Entorno bloqueado por red/proxy impidió ejecutar install/migrate/test.
