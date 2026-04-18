import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@metylosa/db';

@Injectable()
export class AdminLedgerService {
  async getTransactionById(transactionId: string) {
    const transaction = await prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
      include: {
        entries: {
          include: {
            debitAccount: true,
            creditAccount: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return transaction;
  }

  async getTransactionEntries(transactionId: string) {
    return prisma.ledgerEntry.findMany({
      where: { transactionId },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getReversalChain(transactionId: string) {
    const root = await prisma.ledgerTransaction.findUnique({ where: { id: transactionId } });
    if (!root) throw new BadRequestException('Transaction not found');

    const chain = [root];
    let cursor = root;

    while (cursor.reversedByTxId) {
      const next = await prisma.ledgerTransaction.findUnique({ where: { id: cursor.reversedByTxId } });
      if (!next) break;
      chain.push(next);
      cursor = next;
    }

    return chain;
  }

  async getTimeline(businessRef: string, reference?: string) {
    if (!businessRef && !reference) {
      throw new BadRequestException('businessRef or reference is required');
    }

    const timeline = await prisma.ledgerTransaction.findMany({
      where: {
        OR: [
          businessRef ? { businessRef } : undefined,
          reference ? { reference } : undefined,
        ].filter(Boolean) as Array<Record<string, string>>,
      },
      include: {
        entries: {
          include: {
            debitAccount: true,
            creditAccount: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return timeline.map((tx) => ({
      id: tx.id,
      businessRef: tx.businessRef,
      reference: tx.reference,
      origin: tx.origin,
      status: tx.status,
      amountMinor: tx.amountMinor.toString(),
      currencyCode: tx.currencyCode,
      reversalOfTxId: tx.reversalOfTxId,
      reversedByTxId: tx.reversedByTxId,
      entries: tx.entries.map((entry) => ({
        id: entry.id,
        amountMinor: entry.amountMinor.toString(),
        debit: entry.debitAccount.code,
        credit: entry.creditAccount.code,
      })),
      createdAt: tx.createdAt,
    }));
  }
}
