import { Injectable } from '@nestjs/common';
import { PayoutStatus, ReviewStatus } from '@prisma/client';
import { prisma } from '@metylosa/db';
import { TreasuryService } from '../treasury/treasury.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly treasuryService: TreasuryService) {}

  async widgets() {
    const [pendingReviews, pendingPayouts, securityAlerts, treasuryOverview] = await Promise.all([
      prisma.manualReviewCase.count({ where: { status: ReviewStatus.PENDING } }),
      prisma.payoutRequest.count({ where: { status: PayoutStatus.PENDING_REVIEW } }),
      prisma.securityEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.treasuryService.overview(),
    ]);

    return {
      pendingReviewsWidget: { count: pendingReviews, route: '/admin/reviews' },
      pendingPayoutsWidget: { count: pendingPayouts, route: '/admin/payouts' },
      treasuryOverviewWidget: treasuryOverview,
      securityAlertsWidget: { count24h: securityAlerts, route: '/admin/security-events' },
    };
  }

  async recentActivity() {
    const [ledger, payouts, security] = await Promise.all([
      prisma.ledgerTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.payoutRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.securityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    return {
      ledger,
      payouts,
      security,
    };
  }
}
