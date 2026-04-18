-- Rollback Tramo 9/10 treasury + risk
DROP INDEX `ManualReviewCase_riskDecision_slaDueAt_idx` ON `ManualReviewCase`;
ALTER TABLE `ManualReviewCase`
  DROP COLUMN `riskScore`,
  DROP COLUMN `riskDecision`,
  DROP COLUMN `slaDueAt`;
DROP TABLE IF EXISTS `TreasuryRebalanceOrder`;
DROP TABLE IF EXISTS `TreasuryRebalanceCycle`;
DROP TABLE IF EXISTS `TreasuryCountryPolicy`;
DROP TABLE IF EXISTS `TreasuryAccount`;
DROP TABLE IF EXISTS `RiskEvent`;
