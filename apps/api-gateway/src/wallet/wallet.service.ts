import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletAliasType, WalletHoldStatus } from '@prisma/client';
import { prisma } from '@metylosa/db';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class WalletService {
  constructor(private readonly ledgerService: LedgerService) {}

  async bootstrapPrimaryWallet(userId: string, phone: string, countryCode: string, currencyCode: string) {
    const wallet = await prisma.wallet.upsert({
      where: {
        userId_countryCode_currencyCode: {
          userId,
          countryCode,
          currencyCode,
        },
      },
      update: {},
      create: {
        userId,
        countryCode,
        currencyCode,
      },
    });

    await prisma.walletAlias.upsert({
      where: {
        aliasType_aliasValue: {
          aliasType: WalletAliasType.PHONE_E164,
          aliasValue: phone,
        },
      },
      update: {
        walletId: wallet.id,
        isPrimary: true,
      },
      create: {
        walletId: wallet.id,
        aliasType: WalletAliasType.PHONE_E164,
        aliasValue: phone,
        isPrimary: true,
      },
    });

    const accounts = await this.ledgerService.ensureWalletAccounts(wallet.id, currencyCode);

    return {
      walletId: wallet.id,
      countryCode,
      currencyCode,
      aliasPhone: phone,
      ledgerAccounts: {
        userWalletAccountId: accounts.userWallet.id,
        clearingAccountId: accounts.systemClearing.id,
      },
    };
  }

  async home(userId: string) {
    const wallet = await prisma.wallet.findFirst({
      where: { userId },
      include: { aliases: { where: { isPrimary: true }, take: 1 }, ledgerAccounts: true, holds: { where: { status: WalletHoldStatus.ACTIVE } } },
      orderBy: { createdAt: 'asc' },
    });

    if (!wallet) {
      return { wallet: null, balances: { availableMinor: '0' }, source: 'ledger' };
    }

    const userWalletAccount = wallet.ledgerAccounts.find((account) => account.code === `wallet:${wallet.id}:user`);

    const heldMinor = wallet.holds.reduce((acc, hold) => acc + hold.amountMinor, 0n);
    const ledgerBalance = userWalletAccount?.currentBalanceMinor ?? 0n;

    return {
      wallet: {
        id: wallet.id,
        countryCode: wallet.countryCode,
        currencyCode: wallet.currencyCode,
        aliasPhone: wallet.aliases[0]?.aliasValue ?? null,
      },
      balances: {
        ledgerBalanceMinor: ledgerBalance.toString(),
        heldMinor: heldMinor.toString(),
        availableMinor: (ledgerBalance - heldMinor).toString(),
      },
      source: 'ledger + active_holds',
    };
  }

  async history(userId: string) {
    const wallet = await prisma.wallet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!wallet) {
      return [];
    }

    const entries = await this.ledgerService.getWalletPostedHistory(wallet.id);
    return entries.map((entry) => ({
      ledgerEntryId: entry.id,
      ledgerTransactionId: entry.transactionId,
      origin: entry.transaction.origin,
      status: entry.transaction.status,
      reference: entry.transaction.reference,
      amountMinor: entry.amountMinor.toString(),
      currencyCode: entry.transaction.currencyCode,
      createdAt: entry.createdAt,
      debitAccountCode: entry.debitAccount.code,
      creditAccountCode: entry.creditAccount.code,
    }));
  }

  async resolvePhoneAlias(phone: string) {
    const alias = await prisma.walletAlias.findUnique({
      where: {
        aliasType_aliasValue: {
          aliasType: WalletAliasType.PHONE_E164,
          aliasValue: phone,
        },
      },
      include: { wallet: true },
    });

    if (!alias) {
      throw new NotFoundException('Alias not found');
    }

    return {
      walletId: alias.walletId,
      aliasType: alias.aliasType,
      aliasValue: alias.aliasValue,
      countryCode: alias.wallet.countryCode,
      currencyCode: alias.wallet.currencyCode,
    };
  }
}
