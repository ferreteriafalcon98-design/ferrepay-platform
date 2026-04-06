# Metylosa v1 — Blueprint funcional + técnico (90 días)

## 1) Objetivo y alcance v1
Metylosa v1 nace como **plataforma híbrida** para operación comercial integral:

- Marketplace B2C/B2B básico
- Tienda propia tipo Store Builder
- POS desktop con inventario y facturación
- CRM omnicanal básico
- Operación online/offline
- Capa fiscal adaptable por país (arranque: Venezuela/Colombia)

> Principio rector: **no es una web con extras**, es un ecosistema cloud + desktop + bridge local.

---

## 2) Decisiones de arquitectura (cerradas)

1. **Arquitectura híbrida obligatoria**
   - Cloud para administración, e-commerce, marketplace, CRM y reporting.
   - Desktop POS para operación local de caja, inventario y documentos.

2. **Separación estricta de dominios**
   - `orden ≠ factura`
   - `factura ≠ pago`
   - `pago ≠ ledger`

3. **Política dual de tasas**
   - **Tasa oficial fiscal**: fuente oficial, snapshot por documento, no editable en caja.
   - **Tasa comercial interna**: configurable por roles autorizados.

4. **Cumplimiento fiscal por tipo documental (no por toggle manual)**
   - Documento fiscal → reglas fiscales obligatorias.
   - Documento interno/no fiscal → reglas comerciales internas.

5. **Offline real con trazabilidad**
   - Cola local de eventos, reintentos, idempotencia y bitácora de sincronización.

---

## 3) Arquitectura de referencia

```text
Metylosa Cloud
  ├─ tenants, users, roles, businesses, branches
  ├─ catálogo maestro e inventario central
  ├─ marketplace + store builder
  ├─ CRM omnicanal
  ├─ pagos online
  ├─ wallet + ledger
  └─ reporting central

Metylosa Desktop POS
  ├─ POS (ventas rápidas)
  ├─ inventario local cacheado
  ├─ clientes y documentos
  ├─ caja y cierres
  ├─ impresión PDF/térmica/fiscal bridge
  ├─ modo offline
  └─ sync local ↔ cloud

Metylosa Fiscal Bridge
  ├─ spool local
  ├─ drivers/periféricos (térmica/fiscal)
  ├─ estados + reintentos
  └─ logs auditables
```

---

## 4) Stack recomendado

### Cloud
- Frontend/paneles: **Next.js**
- Backend: servicios modulares por dominio
- BD transaccional: **MySQL**
- Cache/colas ligeras/eventos: **Redis**
- Archivos/evidencias: **S3-compatible object storage**

### Desktop
- App instalable: **Electron**
- BD local: **SQLite**
- Servicios locales: bridge de impresoras/fiscal + sync worker

---

## 5) Estructura de módulos (monorepo objetivo)

```text
/apps
  /web-public
  /app-private
  /seller-center
  /admin-panel
  /desktop-pos

/packages
  /auth
  /geo
  /catalog
  /inventory
  /orders
  /billing
  /fiscal-ve
  /payments
  /wallet
  /ledger
  /crm
  /ai
  /offline-store
  /sync
  /printer-bridge
  /rate-engine
  /shared
```

---

## 6) Matriz documental v1 (billing)

| Documento | Fiscal | Offline | Snapshot de tasa | Impacta inventario | Impacta cuentas por cobrar |
|---|---|---|---|---|---|
| Cotización | No | Sí | Comercial | No | No |
| Pedido | No | Sí | Comercial | Reserva opcional | Sí (si confirmado) |
| Nota de entrega | Puede variar por país | Sí | Comercial/Fiscal según caso | Sí | No |
| Factura | Sí | Sí (con cola y estados) | Fiscal (obligatorio) | Sí | Sí |
| Nota débito | Sí | Sí | Fiscal | No | Sí |
| Nota crédito | Sí | Sí | Fiscal | Puede revertir | Sí (disminuye) |
| Recibo | No fiscal (normalmente) | Sí | Comercial | No | Sí (cancela saldo) |

---

## 7) Política de tasas (rate-engine)

### A. Tasa oficial fiscal
- Fuente oficial parametrizable por país (ej. BCV en VE)
- Captura automática por ventana temporal
- `rate_snapshot` inmutable al emitir documento fiscal
- Auditoría: fecha/hora/fuente/hash
- Sin permisos de edición para caja

### B. Tasa comercial interna
- Editable por roles (admin financiero/comercial)
- Vigencia programable
- Uso: listas, cotización, preventa, e-commerce y docs no fiscales
- Historial versionado con motivo de cambio

---

## 8) Núcleo de datos mínimo (tablas base)

### Organización y seguridad
- `tenants`
- `users`
- `roles`
- `user_roles`
- `businesses`
- `branches`
- `devices`

### Catálogo e inventario
- `products`
- `product_variants`
- `price_lists`
- `price_list_items`
- `tax_profiles`
- `warehouses`
- `stock_balances`
- `inventory_movements`

### Comercial y documentos
- `customers`
- `sales_orders`
- `billing_documents`
- `billing_document_lines`
- `document_series`
- `document_events`

### Pagos, wallet, ledger
- `payments`
- `payment_allocations`
- `wallet_accounts`
- `ledger_transactions`
- `ledger_entries`
- `settlements`
- `fees`

### Offline/sync/periféricos
- `sync_outbox`
- `sync_inbox`
- `sync_conflicts`
- `print_jobs`
- `print_job_events`
- `fiscal_events`
- `fiscal_retries`

### Tasa y fiscal
- `official_rate_sources`
- `official_rate_snapshots`
- `commercial_rates`
- `document_rate_snapshots`

---

## 9) Flujos críticos v1

1. **Venta POS online**
   - Buscar SKU/EAN → agregar líneas → seleccionar documento → calcular tasa/impuestos → emitir → imprimir → registrar pago(s) → asentar ledger.

2. **Venta POS offline**
   - Mismo flujo, guardando eventos en `sync_outbox` y jobs de impresión en spool local.

3. **Reconciliación de sync**
   - Worker local reintenta envío con idempotency key; cloud responde ACK/NACK; conflictos a `sync_conflicts`.

4. **Impresión fiscal/bridge**
   - Documento fiscal genera `print_job` → driver local → estado (`queued/sent/failed/confirmed`) con trazabilidad completa.

5. **Cambio de tasa**
   - Comercial: cambio por rol autorizado y vigencia.
   - Fiscal: solo refresco desde fuente oficial, nunca edición manual en caja.

---

## 10) UX mínima del POS

### Layout recomendado
- Barra superior: sucursal, caja, usuario, documento, estado online/offline.
- Zona central: búsqueda por código/nombre, líneas de artículo.
- Lateral derecho: subtotal, IVA, descuentos, total, forma de pago.
- Barra inferior: procesar, guardar, imprimir, nota de entrega, factura, ND, NC, enviar por WhatsApp.

### Indicadores obligatorios
- Escanear con teléfono
- Lector USB/Bluetooth conectado
- Impresora térmica conectada
- Impresora fiscal conectada
- Modo offline
- Tasa activa (fiscal oficial/comercial)
- Estado de impresión fiscal (pendiente/enviada/fallida)

---

## 11) Roadmap de 90 días

### Días 1–15 (Fundaciones)
- ADR arquitectura híbrida
- Mapa de módulos y límites de dominio
- Políticas: offline, tasas, documentos fiscales vs no fiscales
- Esqueleto monorepo y paquetes base

### Días 16–30 (Núcleo de datos)
- Modelado y migraciones para tenants, catálogo, inventario, clientes, documentos
- Eventos base y auditoría
- Primer API de catálogo/inventario/documentos

### Días 31–45 (Desktop POS MVP)
- App Electron instalable (Windows primero)
- Login + bootstrap de datos
- Venta rápida con catálogo local SQLite
- Caja básica + impresión PDF/térmica
- Outbox de sync

### Días 46–60 (Billing completo v1)
- Cotización, pedido, nota entrega, factura, NC, ND, recibo
- Series documentales
- Historial y reimpresión

### Días 61–75 (Periféricos + Fiscal VE base)
- Lectores HID USB/Bluetooth
- Escaneo por teléfono (handoff al POS)
- Printer bridge local
- fiscal-ve + estados + reintentos + logs
- rate-engine con snapshots

### Días 76–90 (Cloud commerce + CRM básico)
- Store Builder inicial + storefront
- Marketplace básico + seller center
- CRM básico omnicanal
- Dashboard operativo y KPIs

---

## 12) KPI de salida v1

- Tiempo medio de venta POS < 45s (ticket simple)
- Disponibilidad operativa offline 100% en cortes de internet
- Sync exitoso > 99% en reintentos automáticos
- Trazabilidad fiscal con evidencia completa por documento
- Cero edición manual de tasa fiscal en caja

---

## 13) Riesgos y mitigaciones

1. **Intentar resolver todo como web** → mitigación: desktop POS como ruta crítica.
2. **Acoplar orden/factura/pago/ledger** → mitigación: bounded contexts y contratos de eventos.
3. **Duplicación caótica de inventario** → mitigación: maestro central + caché local + reconciliación.
4. **Sync opaco** → mitigación: outbox/inbox/event logs por equipo/usuario/hora/error.
5. **Fiscal genérico sin adapter** → mitigación: `fiscal-ve` especializado y versionable.

---

## 14) Entregables internos inmediatos

1. ADR-001 Arquitectura híbrida cloud/desktop/bridge
2. ADR-002 Separación de dominios comerciales y contables
3. SPEC-001 Matriz documental y reglas de estado
4. SPEC-002 Política de tasas (fiscal/comercial)
5. SPEC-003 Contrato de sync offline/online
6. SPEC-004 Integración periféricos e impresión
7. PLAN-90D Roadmap operativo con responsables
