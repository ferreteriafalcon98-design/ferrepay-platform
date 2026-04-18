import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerOrigin, NotificationChannel, NotificationStatus, NotificationType, PricingFlow, RiskDecision, RiskSource, WalletAliasType } from '@prisma/client';
import { prisma } from '@metylosa/db';
import { LedgerService } from '../ledger/ledger.service';
import { PricingService } from '../pricing/pricing.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class P2pService {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly pricingService: PricingService,
    private readonly riskService: RiskService,
  ) {}

  async lookupByPhone(phone: string) {
    const alias = await prisma.walletAlias.findUnique({
      where: { aliasType_aliasValue: { aliasType: WalletAliasType.PHONE_E164, aliasValue: phone } },
      include: { wallet: true },
    });

    return {
      found: Boolean(alias),
      walletId: alias?.walletId ?? null,
      countryCode: alias?.wallet.countryCode ?? null,
      currencyCode: alias?.wallet.currencyCode ?? null,
    };
  }

  async preview(senderUserId: string, toPhone: string, amountMinor: bigint) {
    if (amountMinor <= 0n) throw new BadRequestException('amountMinor must be positive');

    const senderWallet = await prisma.wallet.findFirst({ where: { userId: senderUserId } });
    if (!senderWallet) throw new BadRequestException('Sender wallet not found');

    const recipientAlias = await prisma.walletAlias.findUnique({
      where: { aliasType_aliasValue: { aliasType: WalletAliasType.PHONE_E164, aliasValue: toPhone } },
      include: { wallet: true },
    });

    if (!recipientAlias) throw new BadRequestException('Recipient not found');
    if (recipientAlias.wallet.id === senderWallet.id) throw new BadRequestException('Cannot send to same wallet');
    if (recipientAlias.wallet.currencyCode !== senderWallet.currencyCode) throw new BadRequestException('Currency mismatch for internal p2p');

    const quote = await this.pricingService.createQuote({
      flow: PricingFlow.P2P,
      countryCode: senderWallet.countryCode,
      currencyCode: senderWallet.currencyCode,
      amountMinor,
      metadata: { toPhone, receiverWalletId: recipientAlias.wallet.id },
    });

    return {
      senderWalletId: senderWallet.id,
      receiverWalletId: recipientAlias.wallet.id,
      quote,
      postsLedger: false,
      touchesTreasury: false,
    };
  }

  async send(senderUserId: string, toPhone: string, quoteId: string, reference: string) {
    const senderWallet = await prisma.wallet.findFirst({ where: { userId: senderUserId } });
    if (!senderWallet) throw new BadRequestException('Sender wallet not found');

    const recipientAlias = await prisma.walletAlias.findUnique({
      where: { aliasType_aliasValue: { aliasType: WalletAliasType.PHONE_E164, aliasValue: toPhone } },
      include: { wallet: true },
    });
    if (!recipientAlias) throw new BadRequestException('Recipient not found');

    const quote = await this.pricingService.getActiveQuoteOrThrow(quoteId, PricingFlow.P2P);

    const risk = await this.riskService.evaluate({
      userId: senderUserId,
      source: RiskSource.P2P,
      businessRef: `p2p:${quote.id}`,
      amountMinor: quote.netAmountMinor,
      highVelocity: false,
      deviceMismatch: false,
    });

    if (risk.decision === RiskDecision.BLOCK) {
      throw new BadRequestException('P2P blocked by risk engine');
    }
    if (risk.decision === RiskDecision.REVIEW) {
      throw new BadRequestException('P2P requires manual review');
    }

    if (quote.currencyCode !== senderWallet.currencyCode || quote.countryCode !== senderWallet.countryCode) {
      throw new BadRequestException('Quote currency/country mismatch with sender wallet');
    }

    const [senderAccount, receiverAccount] = await Promise.all([
      prisma.ledgerAccount.findUnique({ where: { code: `wallet:${senderWallet.id}:user` } }),
      prisma.ledgerAccount.findUnique({ where: { code: `wallet:${recipientAlias.wallet.id}:user` } }),
    ]);

    if (!senderAccount || !receiverAccount) throw new BadRequestException('Wallet accounts missing');

    const tx = await this.ledgerService.postTransaction({
      debitAccountId: senderAccount.id,
      creditAccountId: receiverAccount.id,
      amountMinor: quote.netAmountMinor,
      currencyCode: quote.currencyCode,
      reference,
      businessRef: `p2p:${quote.id}`,
      origin: LedgerOrigin.P2P_INTERNAL,
      metadata: {
        quoteId,
        senderWalletId: senderWallet.id,
        receiverWalletId: recipientAlias.wallet.id,
        touchesTreasury: false,
      },
    });

    await this.pricingService.consumeQuote(quote.id);

    await prisma.notification.upsert({
      where: { dedupKey: `p2p-received:${tx.id}` },
      update: {},
      create: {
        userId: recipientAlias.wallet.userId,
        type: NotificationType.P2P_RECEIVED,
        channel: NotificationChannel.PUSH,
        title: 'Transferencia recibida',
        body: 'Has recibido una transferencia P2P interna.',
        dedupKey: `p2p-received:${tx.id}`,
        status: NotificationStatus.SENT,
      },
    });
    await prisma.businessEvent.create({
      data: {
        userId: senderUserId,
        type: 'P2P_SENT',
        requestId: 'unknown',
        payload: { transactionId: tx.id, quoteId: quote.id },
      },
    });

    return {
      transactionId: tx.id,
      reference: tx.reference,
      quoteId: quote.id,
      origin: tx.origin,
      riskDecision: risk.decision,
      touchesTreasury: false,
    };
  }
}
