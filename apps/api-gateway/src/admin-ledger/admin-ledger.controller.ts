import { Controller, Get, Param, Query } from '@nestjs/common';
import { AdminLedgerService } from './admin-ledger.service';

@Controller('admin/ledger')
export class AdminLedgerController {
  constructor(private readonly adminLedgerService: AdminLedgerService) {}

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    return this.adminLedgerService.getTransactionById(id);
  }

  @Get('transactions/:id/entries')
  getTransactionEntries(@Param('id') id: string) {
    return this.adminLedgerService.getTransactionEntries(id);
  }

  @Get('reversals/:id')
  getReversalChain(@Param('id') id: string) {
    return this.adminLedgerService.getReversalChain(id);
  }

  @Get('timeline')
  timeline(@Query('businessRef') businessRef: string, @Query('reference') reference?: string) {
    return this.adminLedgerService.getTimeline(businessRef, reference);
  }
}
