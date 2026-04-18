import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FiscalService } from './fiscal.service';

@Controller('admin/fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Post('sale-orders')
  createSaleOrder(@Body() body: { userId: string; externalRef: string; countryCode: string; currencyCode: string; amountMinor: string }) {
    return this.fiscalService.createSaleOrder(body.userId, body.externalRef, body.countryCode, body.currencyCode, BigInt(body.amountMinor));
  }

  @Post('invoice-requests')
  createInvoiceRequest(@Body() body: { saleOrderId: string }) {
    return this.fiscalService.createInvoiceRequest(body.saleOrderId);
  }

  @Post('invoice-requests/:id/submit')
  submitInvoiceRequest(@Param('id') id: string) {
    return this.fiscalService.submitInvoiceRequest(id);
  }

  @Get('invoice-requests/:id')
  getInvoiceRequest(@Param('id') id: string) {
    return this.fiscalService.getInvoiceRequest(id);
  }
}
