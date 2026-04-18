import { Injectable } from '@nestjs/common';
import { TreasuryAccountType } from '@prisma/client';
import { prisma } from '@metylosa/db';

@Injectable()
export class TreasuryService {
  async overview(countryCode?: string) {
    const where = countryCode ? { countryCode } : {};

    const [accounts, policies, cycles, orders] = await Promise.all([
      prisma.treasuryAccount.findMany({ where, orderBy: [{ countryCode: 'asc' }, { accountType: 'asc' }] }),
      prisma.treasuryCountryPolicy.findMany({ where: countryCode ? { countryCode } : {}, orderBy: { countryCode: 'asc' } }),
      prisma.treasuryRebalanceCycle.findMany({ where: countryCode ? { countryCode } : {}, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.treasuryRebalanceOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    const byCountry = new Map<string, { localCashMinor: bigint; usdtReserveMinor: bigint }>();
    for (const account of accounts) {
      const current = byCountry.get(account.countryCode) ?? { localCashMinor: 0n, usdtReserveMinor: 0n };
      if (account.accountType === TreasuryAccountType.LOCAL_CASH) current.localCashMinor += account.balanceMinor;
      if (account.accountType === TreasuryAccountType.USDT_RESERVE) current.usdtReserveMinor += account.balanceMinor;
      byCountry.set(account.countryCode, current);
    }

    const forecast = cycles.map((cycle) => ({
      cycleId: cycle.id,
      countryCode: cycle.countryCode,
      outflowMinor: cycle.forecastOutflowMinor.toString(),
      inflowMinor: cycle.forecastInflowMinor.toString(),
      netMinor: (cycle.forecastInflowMinor - cycle.forecastOutflowMinor).toString(),
      status: cycle.status,
      createdAt: cycle.createdAt,
    }));

    return {
      balances: Array.from(byCountry.entries()).map(([country, agg]) => ({
        countryCode: country,
        localCashMinor: agg.localCashMinor.toString(),
        usdtReserveMinor: agg.usdtReserveMinor.toString(),
      })),
      policies,
      forecast,
      rebalanceOrders: orders,
    };
  }
}
