import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { BeneficiaryStatus, LedgerOrigin, NotificationChannel, NotificationStatus, NotificationType, PayoutStatus, PricingFlow, QuoteStatus, ReviewStatus, RiskDecision, RiskSource, WalletHoldReason, WalletHoldStatus } from '@prisma/client';
import { prisma } from '@metylosa/db';
import { LedgerService } from '../ledger/ledger.service';
import { PricingService } from '../pricing/pricing.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly pricingService: PricingService,
    private readonly ledgerService: LedgerService,
    private readonly riskService: RiskService,
  ) {}

  async listBeneficiaries(userId: string) {
    return prisma.beneficiary.findMany({ where: { userId, status: BeneficiaryStatus.ACTIVE }, orderBy: { createdAt: 'desc' } });
  }

  async createBeneficiary(userId: string, stepUpToken: string | undefined, input: { alias: string; accountNumber: string; bankCode: string; countryCode: string; currencyCode: string }) {
    this.ensureStepUp(stepUpToken);
    return prisma.beneficiary.create({ data: { userId, ...input } });
  }

  async updateBeneficiary(userId: string, beneficiaryId: string, stepUpToken: string | undefined, input: { alias?: string; accountNumber?: string; bankCode?: string }) {
    this.ensureStepUp(stepUpToken);
    const existing = await prisma.beneficiary.findFirst({ where: { id: beneficiaryId, userId, status: BeneficiaryStatus.ACTIVE } });
    if (!existing) throw new BadRequestException('Beneficiary not found');
    return prisma.beneficiary.update({ where: { id: beneficiaryId }, data: input });
  }

  async archiveBeneficiary(userId: string, beneficiaryId: string, stepUpToken: string | undefined) {
    this.ensureStepUp(stepUpToken);
    const existing = await prisma.beneficiary.findFirst({ where: { id: beneficiaryId, userId, status: BeneficiaryStatus.ACTIVE } });
    if (!existing) throw new BadRequestException('Beneficiary not found');
    await prisma.beneficiary.update({ where: { id: beneficiaryId }, data: { status: BeneficiaryStatus.ARCHIVED } });
    return { ok: true };
  }

  async preview(userId: string, beneficiaryId: string, amountMinor: bigint) {
    if (amountMinor <= 0n) throw new BadRequestException('amountMinor must be positive');

    const [wallet, beneficiary] = await Promise.all([
      prisma.wallet.findFirst({ where: { userId } }),
      prisma.beneficiary.findFirst({ where: { id: beneficiaryId, userId, status: BeneficiaryStatus.ACTIVE } }),
    ]);

    if (!wallet || !beneficiary) throw new BadRequestException('Wallet or beneficiary not found');
    if (wallet.currencyCode !== beneficiary.currencyCode) throw new BadRequestException('Currency mismatch');

    const quote = await this.pricingService.createQuote({
      flow: PricingFlow.PAYOUT,
      countryCode: beneficiary.countryCode,
      currencyCode: beneficiary.currencyCode,
      amountMinor,
      metadata: { beneficiaryId },
    });

    return {
      beneficiaryId,
      walletId: wallet.id,
      quote,
      postsLedger: false,
      touchesTreasury: false,
    };
  }

  async requestPayout(userId: string, beneficiaryId: string, quoteId: string) {
    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    const beneficiary = await prisma.beneficiary.findFirst({ where: { id: beneficiaryId, userId, status: BeneficiaryStatus.ACTIVE } });
    if (!wallet || !beneficiary) throw new BadRequestException('Wallet or beneficiary not found');

    const quote = await this.pricingService.getActiveQuoteOrThrow(quoteId, PricingFlow.PAYOUT);

    const hold = await prisma.walletHold.create({
      data: {
        walletId: wallet.id,
        amountMinor: quote.grossAmountMinor,
        reason: WalletHoldReason.PAYOUT,
        status: WalletHoldStatus.ACTIVE,
        businessRef: `payout-hold:${quote.id}`,
      },
    });

    const payout = await prisma.payoutRequest.create({
      data: {
        userId,
        walletId: wallet.id,
        beneficiaryId: beneficiary.id,
        quoteId: quote.id,
        holdId: hold.id,
        amountMinor: quote.amountMinor,
        feeAmountMinor: quote.feeAmountMinor,
        grossAmountMinor: quote.grossAmountMinor,
        netAmountMinor: quote.netAmountMinor,
        status: PayoutStatus.PENDING_REVIEW,
      },
    });

    await prisma.notification.upsert({
      where: { dedupKey: `payout-requested:${payout.id}` },
      update: {},
      create: {
        userId,
        type: NotificationType.PAYOUT_REQUESTED,
        channel: NotificationChannel.PUSH,
        title: 'Payout solicitado',
        body: 'Tu solicitud de retiro fue creada.',
        dedupKey: `payout-requested:${payout.id}`,
        status: NotificationStatus.SENT,
      },
    });

    await prisma.businessEvent.create({ data: { userId, type: 'PAYOUT_REQUESTED', requestId: 'unknown', payload: { payoutId: payout.id } } });

    const risk = await this.riskService.evaluate({
      userId,
      source: RiskSource.PAYOUT,
      businessRef: `payout:${payout.id}`,
      amountMinor: payout.grossAmountMinor,
      highVelocity: false,
      deviceMismatch: false,
    });

    if (risk.decision === RiskDecision.BLOCK) {
      await prisma.$transaction([
        prisma.walletHold.update({ where: { id: hold.id }, data: { status: WalletHoldStatus.REVERSED, releasedAt: new Date() } }),
        prisma.payoutRequest.update({ where: { id: payout.id }, data: { status: PayoutStatus.REJECTED } }),
        prisma.manualReviewCase.create({
          data: {
            payoutRequestId: payout.id,
            status: ReviewStatus.REJECTED,
            reviewerId: 'risk-engine',
            decisionNotes: 'Blocked by risk engine',
            riskScore: risk.score,
            riskDecision: risk.decision,
          },
        }),
      ]);

      return { payoutId: payout.id, status: PayoutStatus.REJECTED, riskDecision: risk.decision };
    }

    if (risk.decision === RiskDecision.ALLOW) {
      await this.settleApprovedPayout(payout.id, 'risk-engine', 'Auto-approved by risk engine', risk.score, risk.decision);
      return { payoutId: payout.id, status: PayoutStatus.APPROVED, riskDecision: risk.decision };
    }

    await prisma.manualReviewCase.create({
      data: {
        payoutRequestId: payout.id,
        status: ReviewStatus.PENDING,
        riskScore: risk.score,
        riskDecision: risk.decision,
        slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      },
    });

    return {
      payoutId: payout.id,
      status: payout.status,
      holdId: hold.id,
      reviewStatus: ReviewStatus.PENDING,
      riskDecision: risk.decision,
    };
  }

  async approve(payoutId: string, reviewerId: string, note?: string) {
    await this.settleApprovedPayout(payoutId, reviewerId, note);
    const payout = await prisma.payoutRequest.findUnique({ where: { id: payoutId } });
    if (payout) {
      await prisma.notification.upsert({
        where: { dedupKey: `payout-approved:${payout.id}` },
        update: {},
        create: {
          userId: payout.userId,
          type: NotificationType.PAYOUT_APPROVED,
          channel: NotificationChannel.PUSH,
          title: 'Payout aprobado',
          body: 'Tu payout fue aprobado.',
          dedupKey: `payout-approved:${payout.id}`,
          status: NotificationStatus.SENT,
        },
      });
    }
    await prisma.businessEvent.create({ data: { userId: payout?.userId, type: 'PAYOUT_APPROVED', requestId: 'unknown', payload: { payoutId } } });
    return { payoutId, status: PayoutStatus.APPROVED };
  }

  async reject(payoutId: string, reviewerId: string, note?: string) {
    const payout = await prisma.payoutRequest.findUnique({ where: { id: payoutId } });
    if (!payout) throw new BadRequestException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING_REVIEW) throw new BadRequestException('Payout is not in review state');

    await prisma.$transaction([
      prisma.walletHold.update({ where: { id: payout.holdId }, data: { status: WalletHoldStatus.RELEASED, releasedAt: new Date() } }),
      prisma.payoutRequest.update({ where: { id: payout.id }, data: { status: PayoutStatus.REJECTED } }),
      prisma.manualReviewCase.updateMany({
        where: { payoutRequestId: payout.id, status: ReviewStatus.PENDING },
        data: { status: ReviewStatus.REJECTED, reviewerId, decisionNotes: note },
      }),
    ]);

    await prisma.notification.upsert({
      where: { dedupKey: `payout-rejected:${payout.id}` },
      update: {},
      create: {
        userId: payout.userId,
        type: NotificationType.PAYOUT_REJECTED,
        channel: NotificationChannel.PUSH,
        title: 'Payout rechazado',
        body: 'Tu payout fue rechazado por revisión.',
        dedupKey: `payout-rejected:${payout.id}`,
        status: NotificationStatus.SENT,
      },
    });
    await prisma.businessEvent.create({ data: { userId: payout.userId, type: 'PAYOUT_REJECTED', requestId: 'unknown', payload: { payoutId: payout.id } } });
    return { payoutId: payout.id, status: PayoutStatus.REJECTED };
  }

  async history(userId: string) {
    return prisma.payoutRequest.findMany({
      where: { userId },
      include: { beneficiary: true, quote: true, hold: true, reviewCases: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async settleApprovedPayout(payoutId: string, reviewerId: string, note?: string, riskScore?: number, riskDecision?: RiskDecision) {
    const payout = await prisma.payoutRequest.findUnique({ where: { id: payoutId } });
    if (!payout) throw new BadRequestException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING_REVIEW) throw new BadRequestException('Payout is not in review state');

    const hold = await prisma.walletHold.findUnique({ where: { id: payout.holdId } });
    if (!hold || hold.status !== WalletHoldStatus.ACTIVE) throw new BadRequestException('Hold not active');

    const accountUser = await prisma.ledgerAccount.findUnique({ where: { code: `wallet:${payout.walletId}:user` } });
    const accountClearing = await prisma.ledgerAccount.findUnique({ where: { code: `wallet:${payout.walletId}:clearing` } });
    if (!accountUser || !accountClearing) throw new BadRequestException('Wallet ledger accounts missing');

    await this.ledgerService.postTransaction({
      debitAccountId: accountUser.id,
      creditAccountId: accountClearing.id,
      amountMinor: payout.grossAmountMinor,
      currencyCode: accountUser.currencyCode,
      reference: `payout:${payout.id}:approve`,
      businessRef: `payout:${payout.id}`,
      origin: LedgerOrigin.PAYOUT_EXTERNAL,
      metadata: { payoutId: payout.id },
    });

    await prisma.$transaction([
      prisma.walletHold.update({ where: { id: hold.id }, data: { status: WalletHoldStatus.CONSUMED, releasedAt: new Date() } }),
      prisma.payoutRequest.update({ where: { id: payout.id }, data: { status: PayoutStatus.APPROVED } }),
      prisma.manualReviewCase.upsert({
        where: { id: `review:${payout.id}` },
        update: {
          status: ReviewStatus.APPROVED,
          reviewerId,
          decisionNotes: note,
          riskScore,
          riskDecision,
        },
        create: {
          id: `review:${payout.id}`,
          payoutRequestId: payout.id,
          status: ReviewStatus.APPROVED,
          reviewerId,
          decisionNotes: note,
          riskScore,
          riskDecision,
        },
      }),
      prisma.pricingQuote.update({ where: { id: payout.quoteId }, data: { status: QuoteStatus.CONSUMED } }),
    ]);
  }

  private ensureStepUp(stepUpToken: string | undefined) {
    if (stepUpToken !== 'verified') {
      throw new UnauthorizedException('Step-up required (x-step-up-token: verified)');
    }
  }
}
