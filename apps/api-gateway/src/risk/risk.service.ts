import { Injectable } from '@nestjs/common';
import { RiskDecision, RiskSource } from '@prisma/client';
import { prisma } from '@metylosa/db';

type RiskInput = {
  userId: string;
  source: RiskSource;
  businessRef: string;
  amountMinor?: bigint;
  deviceMismatch?: boolean;
  highVelocity?: boolean;
};

@Injectable()
export class RiskService {
  async evaluate(input: RiskInput) {
    let score = 0;
    if (input.amountMinor && input.amountMinor > 1_000_000n) score += 50;
    if (input.deviceMismatch) score += 30;
    if (input.highVelocity) score += 25;

    const decision = score >= 80 ? RiskDecision.BLOCK : score >= 40 ? RiskDecision.REVIEW : RiskDecision.ALLOW;

    const event = await prisma.riskEvent.create({
      data: {
        userId: input.userId,
        source: input.source,
        businessRef: input.businessRef,
        score,
        decision,
        signals: {
          amountMinor: input.amountMinor?.toString(),
          deviceMismatch: input.deviceMismatch ?? false,
          highVelocity: input.highVelocity ?? false,
        },
      },
    });

    return event;
  }

  async listEvents(userId?: string) {
    return prisma.riskEvent.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
