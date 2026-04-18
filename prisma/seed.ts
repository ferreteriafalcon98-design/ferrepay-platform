import { PrismaClient, PricingFlow, TreasuryAccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertFeeRule(flow: PricingFlow, countryCode: string, currencyCode: string, fixedFeeMinor: bigint, percentageBps: number) {
  const existing = await prisma.feeRule.findFirst({
    where: { flow, countryCode, currencyCode, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!existing) {
    await prisma.feeRule.create({ data: { flow, countryCode, currencyCode, fixedFeeMinor, percentageBps, isActive: true } });
  }
}

async function upsertTreasuryAccount(countryCode: string, currencyCode: string, accountType: TreasuryAccountType, balanceMinor: bigint) {
  const existing = await prisma.treasuryAccount.findFirst({ where: { countryCode, currencyCode, accountType } });
  if (!existing) {
    await prisma.treasuryAccount.create({ data: { countryCode, currencyCode, accountType, balanceMinor } });
  }
}

async function main() {
  await upsertFeeRule(PricingFlow.P2P, 'CO', 'COP', 0n, 0);
  await upsertFeeRule(PricingFlow.P2P, 'VE', 'USD', 0n, 0);
  await upsertFeeRule(PricingFlow.PAYOUT, 'CO', 'COP', 1500n, 50);
  await upsertFeeRule(PricingFlow.PAYOUT, 'VE', 'USD', 100n, 75);

  await prisma.treasuryCountryPolicy.upsert({
    where: { countryCode: 'CO' },
    update: {},
    create: {
      countryCode: 'CO',
      corridor: 'CO-VE',
      localCashMinMinor: 500000000n,
      localCashMaxMinor: 3000000000n,
      usdtMinMinor: 300000n,
      usdtMaxMinor: 1200000n,
      rebalanceThresholdBps: 250,
    },
  });

  await prisma.treasuryCountryPolicy.upsert({
    where: { countryCode: 'VE' },
    update: {},
    create: {
      countryCode: 'VE',
      corridor: 'VE-CO',
      localCashMinMinor: 10000000000n,
      localCashMaxMinor: 40000000000n,
      usdtMinMinor: 250000n,
      usdtMaxMinor: 1000000n,
      rebalanceThresholdBps: 300,
    },
  });

  await upsertTreasuryAccount('CO', 'COP', TreasuryAccountType.LOCAL_CASH, 950000000n);
  await upsertTreasuryAccount('CO', 'USD', TreasuryAccountType.USDT_RESERVE, 560000n);
  await upsertTreasuryAccount('VE', 'VES', TreasuryAccountType.LOCAL_CASH, 18000000000n);
  await upsertTreasuryAccount('VE', 'USD', TreasuryAccountType.USDT_RESERVE, 420000n);

  await prisma.treasuryRebalanceCycle.create({
    data: {
      countryCode: 'CO',
      forecastOutflowMinor: 120000000n,
      forecastInflowMinor: 98000000n,
      status: 'PENDING',
    },
  });

  await prisma.treasuryRebalanceCycle.create({
    data: {
      countryCode: 'VE',
      forecastOutflowMinor: 5000000000n,
      forecastInflowMinor: 6200000000n,
      status: 'PENDING',
    },
  });

  await prisma.user.upsert({ where: { phone: '+570000000001' }, update: {}, create: { phone: '+570000000001', status: 'ACTIVE' } });
  await prisma.user.upsert({ where: { phone: '+580000000001' }, update: {}, create: { phone: '+580000000001', status: 'ACTIVE' } });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
