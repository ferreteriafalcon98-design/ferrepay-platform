import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RiskSource } from '@prisma/client';
import { RiskService } from './risk.service';

@Controller('admin/risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Post('evaluate')
  evaluate(@Body() body: { userId: string; source: RiskSource; businessRef: string; amountMinor?: string; deviceMismatch?: boolean; highVelocity?: boolean }) {
    return this.riskService.evaluate({
      userId: body.userId,
      source: body.source,
      businessRef: body.businessRef,
      amountMinor: body.amountMinor ? BigInt(body.amountMinor) : undefined,
      deviceMismatch: body.deviceMismatch,
      highVelocity: body.highVelocity,
    });
  }

  @Get('events')
  events(@Query('userId') userId?: string) {
    return this.riskService.listEvents(userId);
  }
}
