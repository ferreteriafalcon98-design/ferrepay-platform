import { Module } from '@nestjs/common';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PricingModule } from '../pricing/pricing.module';
import { LedgerModule } from '../ledger/ledger.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [PricingModule, LedgerModule, RiskModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
})
export class PayoutsModule {}
