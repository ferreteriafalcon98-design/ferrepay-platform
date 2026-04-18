import { Body, Controller, Post } from '@nestjs/common';
import { PricingFlow } from '@prisma/client';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('quotes')
  createQuote(@Body() body: { flow: PricingFlow; countryCode: string; currencyCode: string; amountMinor: string; metadata?: Record<string, unknown> }) {
    return this.pricingService.createQuote({
      flow: body.flow,
      countryCode: body.countryCode,
      currencyCode: body.currencyCode,
      amountMinor: BigInt(body.amountMinor),
      metadata: body.metadata,
    });
  }
}
