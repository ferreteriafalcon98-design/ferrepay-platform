import { FiscalDecision } from '@prisma/client';

export class DocumentDecisionEngine {
  decide(amountMinor: bigint): FiscalDecision {
    if (amountMinor <= 0n) return FiscalDecision.REJECT;
    return FiscalDecision.ACCEPT;
  }
}
