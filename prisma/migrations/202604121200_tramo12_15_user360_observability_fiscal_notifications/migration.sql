-- Tramo 12-15: user360, observability, fiscal sandbox, notifications
CREATE TABLE IF NOT EXISTS `User360Audit` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `actorId` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `requestId` varchar(191) NOT NULL,
  `metadata` json NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `User360Audit_userId_createdAt_idx`(`userId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `BusinessEvent` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NULL,
  `type` varchar(191) NOT NULL,
  `requestId` varchar(191) NOT NULL,
  `payload` json NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `BusinessEvent_type_createdAt_idx`(`type`, `createdAt`),
  INDEX `BusinessEvent_requestId_idx`(`requestId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SaleOrder` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `externalRef` varchar(191) NOT NULL,
  `countryCode` varchar(191) NOT NULL,
  `currencyCode` varchar(191) NOT NULL,
  `amountMinor` bigint NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'CREATED',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SaleOrder_externalRef_key`(`externalRef`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `InvoiceRequest` (
  `id` varchar(191) NOT NULL,
  `saleOrderId` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `decision` varchar(191) NULL,
  `errorCode` varchar(191) NULL,
  `errorMessage` varchar(191) NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `InvoiceRequest_status_createdAt_idx`(`status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FiscalDocument` (
  `id` varchar(191) NOT NULL,
  `invoiceRequestId` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'DRAFT',
  `documentNumber` varchar(191) NULL,
  `xmlPayload` longtext NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `FiscalDocument_invoiceRequestId_status_idx`(`invoiceRequestId`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FiscalSubmission` (
  `id` varchar(191) NOT NULL,
  `fiscalDocumentId` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `responseCode` varchar(191) NULL,
  `responseMessage` varchar(191) NULL,
  `requestPayload` json NULL,
  `responsePayload` json NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `FiscalSubmission_fiscalDocumentId_createdAt_idx`(`fiscalDocumentId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FiscalArtifact` (
  `id` varchar(191) NOT NULL,
  `fiscalDocumentId` varchar(191) NOT NULL,
  `kind` varchar(191) NOT NULL,
  `uri` varchar(191) NOT NULL,
  `checksum` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `FiscalArtifact_fiscalDocumentId_kind_idx`(`fiscalDocumentId`, `kind`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Notification` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `dedupKey` varchar(191) NOT NULL,
  `channel` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `body` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Notification_dedupKey_key`(`dedupKey`),
  INDEX `Notification_userId_type_createdAt_idx`(`userId`, `type`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
