import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { WalletModule } from './wallet/wallet.module';
import { LedgerModule } from './ledger/ledger.module';
import { PricingModule } from './pricing/pricing.module';
import { P2pModule } from './p2p/p2p.module';
import { PayoutsModule } from './payouts/payouts.module';
import { AdminLedgerModule } from './admin-ledger/admin-ledger.module';
import { TreasuryModule } from './treasury/treasury.module';
import { RiskModule } from './risk/risk.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { HealthModule } from './health/health.module';
import { User360Module } from './user360/user360.module';
import { ObservabilityModule } from './observability/observability.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RequestIdMiddleware } from './common/request-id.middleware';

@Module({
  imports: [
    AuthModule,
    SecurityModule,
    WalletModule,
    LedgerModule,
    PricingModule,
    P2pModule,
    PayoutsModule,
    AdminLedgerModule,
    TreasuryModule,
    RiskModule,
    AdminDashboardModule,
    HealthModule,
    User360Module,
    ObservabilityModule,
    FiscalModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
