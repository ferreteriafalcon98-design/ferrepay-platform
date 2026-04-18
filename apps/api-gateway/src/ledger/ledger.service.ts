import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerAccountType, LedgerOrigin, LedgerTransactionStatus, Prisma } from '@prisma/client';
import { prisma } from '@metylosa/db';

type PostingInput = {
  debitAccountId: string;
  creditAccountId: string;
  amountMinor: bigint;
  currencyCode: string;
  reference: string;
  businessRef?: string;
  origin: LedgerOrigin;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class LedgerService {
  async ensureWalletAccounts(walletId: string, currencyCode: string) {
    const userWallet = await prisma.ledgerAccount.upsert({
      where: { code: `wallet:${walletId}:user` },
      update: {},
      create: {
        walletId,
        code: `wallet:${walletId}:user`,
        type: LedgerAccountType.USER_WALLET,
        currencyCode,
      },
    });

    const systemClearing = await prisma.ledgerAccount.upsert({
      where: { code: `wallet:${walletId}:clearing` },
      update: {},
      create: {
        walletId,
        code: `wallet:${walletId}:clearing`,
        type: LedgerAccountType.SYSTEM_CLEARING,
        currencyCode,
      },
    });

    return { userWallet, systemClearing };
  }

  async postTransaction(input: PostingInput) {
    if (input.amountMinor <= 0n) {
      throw new BadRequestException('amountMinor must be positive');
    }

    const [debit, credit] = await Promise.all([
      prisma.ledgerAccount.findUnique({ where: { id: input.debitAccountId } }),
      prisma.ledgerAccount.findUnique({ where: { id: input.creditAccountId } }),
    ]);

    if (!debit || !credit) {
      throw new BadRequestException('ledger accounts not found');
    }

    if (debit.currencyCode !== input.currencyCode || credit.currencyCode !== input.currencyCode) {
      throw new BadRequestException('currency mismatch in ledger accounts');
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const ledgerTransaction = await tx.ledgerTransaction.create({
        data: {
          origin: input.origin,
          reference: input.reference,
          businessRef: input.businessRef,
          currencyCode: input.currencyCode,
          amountMinor: input.amountMinor,
          metadata: input.metadata,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: ledgerTransaction.id,
          debitAccountId: input.debitAccountId,
          creditAccountId: input.creditAccountId,
          amountMinor: input.amountMinor,
        },
      });

      await tx.ledgerAccount.update({
        where: { id: input.debitAccountId },
        data: { currentBalanceMinor: { decrement: input.amountMinor } },
      });
      await tx.ledgerAccount.update({
        where: { id: input.creditAccountId },
        data: { currentBalanceMinor: { increment: input.amountMinor } },
      });

      return ledgerTransaction;
    });

    return transaction;
  }

  async reverseTransaction(transactionId: string, reference: string, metadata?: Prisma.InputJsonValue) {
    const original = await prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
      include: { entries: true },
    });

    if (!original) {
      throw new BadRequestException('Original transaction not found');
    }

    if (original.status === LedgerTransactionStatus.REVERSED) {
      throw new BadRequestException('Transaction already reversed');
    }

    const originalEntry = original.entries[0];
    if (!originalEntry) {
      throw new BadRequestException('Original transaction has no entries');
    }

    const reversal = await this.postTransaction({
      debitAccountId: originalEntry.creditAccountId,
      creditAccountId: originalEntry.debitAccountId,
      amountMinor: original.amountMinor,
      currencyCode: original.currencyCode,
      reference,
      businessRef: original.businessRef ?? undefined,
      origin: original.origin,
      metadata,
    });

    await prisma.ledgerTransaction.update({
      where: { id: original.id },
      data: {
        status: LedgerTransactionStatus.REVERSED,
        reversedByTxId: reversal.id,
      },
    });

    await prisma.ledgerTransaction.update({
      where: { id: reversal.id },
      data: {
        reversalOfTxId: original.id,
      },
    });

    return reversal;
  }

  async getWalletAccounts(walletId: string) {
    return prisma.ledgerAccount.findMany({
      where: { walletId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getWalletPostedHistory(walletId: string) {
    const accounts = await prisma.ledgerAccount.findMany({
      where: { walletId },
      select: { id: true },
    });
    const accountIds = accounts.map((account) => account.id);

    if (accountIds.length === 0) {
      return [];
    }

    return prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { debitAccountId: { in: accountIds } },
          { creditAccountId: { in: accountIds } },
        ],
      },
      include: {
        transaction: true,
        debitAccount: true,
        creditAccount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
