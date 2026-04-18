import { Injectable } from '@nestjs/common';
import { prisma } from '@metylosa/db';

@Injectable()
export class User360Service {
  async profile(userId: string) {
    const [user, devices, sessions, wallets, payouts, riskEvents] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.device.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.session.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.wallet.findMany({ where: { userId }, include: { aliases: true } }),
      prisma.payoutRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.riskEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    return {
      identity: user,
      security: {
        devices,
        sessions,
      },
      wallet: wallets,
      payouts,
      risk: riskEvents,
      note: 'Read-only operational view. Not a source of truth for monetary mutations.',
    };
  }

  async timeline(userId: string, limit: number) {
    const [securityEvents, businessEvents, riskEvents, payoutEvents, audits] = await Promise.all([
      prisma.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.businessEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.riskEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.payoutRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.user360Audit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }),
    ]);

    return {
      securityEvents,
      businessEvents,
      riskEvents,
      payoutEvents,
      audits,
    };
  }

  async auditAction(userId: string, actorId: string, action: string, requestId: string, metadata?: Record<string, unknown>) {
    return prisma.user360Audit.create({
      data: {
        userId,
        actorId,
        action,
        requestId,
        metadata,
      },
    });
  }
}
