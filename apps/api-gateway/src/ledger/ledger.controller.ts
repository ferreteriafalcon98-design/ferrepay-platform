import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LedgerOrigin } from '@prisma/client';
import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('postings')
  post(@Body() body: { debitAccountId: string; creditAccountId: string; amountMinor: string; currencyCode: string; reference: string; businessRef?: string; origin?: LedgerOrigin; metadata?: Record<string, unknown> }) {
    return this.ledgerService.postTransaction({
      debitAccountId: body.debitAccountId,
      creditAccountId: body.creditAccountId,
      amountMinor: BigInt(body.amountMinor),
      currencyCode: body.currencyCode,
      reference: body.reference,
      businessRef: body.businessRef,
      origin: body.origin ?? LedgerOrigin.MANUAL_ADJUSTMENT,
      metadata: body.metadata,
    });
  }

  @Post('reversals')
  reverse(@Body() body: { transactionId: string; reference: string; metadata?: Record<string, unknown> }) {
    return this.ledgerService.reverseTransaction(body.transactionId, body.reference, body.metadata);
  }

  @Get('wallet/:walletId/accounts')
  walletAccounts(@Param('walletId') walletId: string) {
    return this.ledgerService.getWalletAccounts(walletId);
  }
}
