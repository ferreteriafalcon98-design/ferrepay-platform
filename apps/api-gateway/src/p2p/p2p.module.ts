import { Module } from '@nestjs/common';
import { P2pController } from './p2p.controller';
import { P2pService } from './p2p.service';
import { WalletModule } from '../wallet/wallet.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PricingModule } from '../pricing/pricing.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [WalletModule, LedgerModule, PricingModule, RiskModule],
  controllers: [P2pController],
  providers: [P2pService],
})
export class P2pModule {}
