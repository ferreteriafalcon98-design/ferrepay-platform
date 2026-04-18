import { BadRequestException, Injectable } from '@nestjs/common';
import { PricingFlow, QuoteStatus, Prisma } from '@prisma/client';
import { prisma } from '@metylosa/db';

type QuoteInput = {
  flow: PricingFlow;
  countryCode: string;
  currencyCode: string;
  amountMinor: bigint;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class PricingService {
  async createQuote(input: QuoteInput) {
    if (input.amountMinor <= 0n) {
      throw new BadRequestException('amountMinor must be positive');
    }

    const rule = await prisma.feeRule.findFirst({
      where: {
        flow: input.flow,
        countryCode: input.countryCode,
        currencyCode: input.currencyCode,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!rule) {
      throw new BadRequestException('No active fee rule for flow/country/currency');
    }

    const percentageFee = (input.amountMinor * BigInt(rule.percentageBps)) / 10000n;
    const feeAmountMinor = rule.fixedFeeMinor + percentageFee;
    const grossAmountMinor = input.amountMinor + feeAmountMinor;

    const quote = await prisma.pricingQuote.create({
      data: {
        flow: input.flow,
        countryCode: input.countryCode,
        currencyCode: input.currencyCode,
        amountMinor: input.amountMinor,
        feeAmountMinor,
        grossAmountMinor,
        netAmountMinor: input.amountMinor,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        metadata: input.metadata,
      },
    });

    return {
      quoteId: quote.id,
      flow: quote.flow,
      expiresAt: quote.expiresAt,
      amountMinor: quote.amountMinor.toString(),
      feeAmountMinor: quote.feeAmountMinor.toString(),
      grossAmountMinor: quote.grossAmountMinor.toString(),
      netAmountMinor: quote.netAmountMinor.toString(),
      postsLedger: false,
    };
  }

  async getActiveQuoteOrThrow(quoteId: string, flow: PricingFlow) {
    const quote = await prisma.pricingQuote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.flow !== flow) {
      throw new BadRequestException('Quote not found for flow');
    }
    if (quote.status !== QuoteStatus.ACTIVE || quote.expiresAt < new Date()) {
      await prisma.pricingQuote.updateMany({
        where: { id: quoteId, status: QuoteStatus.ACTIVE },
        data: { status: QuoteStatus.EXPIRED },
      });
      throw new BadRequestException('Quote expired');
    }

    return quote;
  }

  async consumeQuote(quoteId: string) {
    await prisma.pricingQuote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.CONSUMED },
    });
  }
}
