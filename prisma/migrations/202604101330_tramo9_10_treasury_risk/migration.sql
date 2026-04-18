-- Tramo 9/10: treasury + risk + review SLA fields
CREATE TABLE IF NOT EXISTS `RiskEvent` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `source` varchar(191) NOT NULL,
  `businessRef` varchar(191) NOT NULL,
  `score` int NOT NULL,
  `decision` varchar(191) NOT NULL,
  `signals` json NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `RiskEvent_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `RiskEvent_businessRef_idx`(`businessRef`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TreasuryAccount` (
  `id` varchar(191) NOT NULL,
  `countryCode` varchar(191) NOT NULL,
  `currencyCode` varchar(191) NOT NULL,
  `accountType` varchar(191) NOT NULL,
  `balanceMinor` bigint NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TreasuryAccount_countryCode_currencyCode_idx`(`countryCode`, `currencyCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TreasuryCountryPolicy` (
  `id` varchar(191) NOT NULL,
  `countryCode` varchar(191) NOT NULL,
  `corridor` varchar(191) NOT NULL,
  `localCashMinMinor` bigint NOT NULL,
  `localCashMaxMinor` bigint NOT NULL,
  `usdtMinMinor` bigint NOT NULL,
  `usdtMaxMinor` bigint NOT NULL,
  `rebalanceThresholdBps` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TreasuryCountryPolicy_countryCode_key`(`countryCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TreasuryRebalanceCycle` (
  `id` varchar(191) NOT NULL,
  `countryCode` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `forecastOutflowMinor` bigint NOT NULL DEFAULT 0,
  `forecastInflowMinor` bigint NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TreasuryRebalanceOrder` (
  `id` varchar(191) NOT NULL,
  `cycleId` varchar(191) NOT NULL,
  `fromAccountType` varchar(191) NOT NULL,
  `toAccountType` varchar(191) NOT NULL,
  `amountMinor` bigint NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ManualReviewCase`
  ADD COLUMN `riskScore` int NULL,
  ADD COLUMN `riskDecision` varchar(191) NULL,
  ADD COLUMN `slaDueAt` datetime(3) NULL;

CREATE INDEX `ManualReviewCase_riskDecision_slaDueAt_idx` ON `ManualReviewCase`(`riskDecision`, `slaDueAt`);
