import { Injectable } from '@nestjs/common';
import { PayoutStatus } from '@prisma/client';
import { prisma } from '@metylosa/db';

@Injectable()
export class ObservabilityService {
  async trackBusinessEvent(type: string, requestId: string, userId?: string, payload?: Record<string, unknown>) {
    return prisma.businessEvent.create({
      data: {
        type,
        requestId,
        userId,
        payload,
      },
    });
  }

  async metrics() {
    const [events, securityEvents, riskEvents, payoutsPending] = await Promise.all([
      prisma.businessEvent.groupBy({ by: ['type'], _count: { type: true } }),
      prisma.securityEvent.count(),
      prisma.riskEvent.count(),
      prisma.payoutRequest.count({ where: { status: PayoutStatus.PENDING_REVIEW } }),
    ]);

    return {
      businessEvents: events,
      securityEvents,
      riskEvents,
      payoutsPending,
    };
  }

  async securityEvents(limit = 100) {
    return prisma.securityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  readiness() {
    return { status: 'ready' };
  }
}
