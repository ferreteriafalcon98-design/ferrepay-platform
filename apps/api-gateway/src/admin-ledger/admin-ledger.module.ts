import { Module } from '@nestjs/common';
import { AdminLedgerController } from './admin-ledger.controller';
import { AdminLedgerService } from './admin-ledger.service';

@Module({
  controllers: [AdminLedgerController],
  providers: [AdminLedgerService],
})
export class AdminLedgerModule {}
