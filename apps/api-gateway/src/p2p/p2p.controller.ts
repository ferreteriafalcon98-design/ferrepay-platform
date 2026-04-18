import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequestUserId } from '../common/request-user';
import { P2pService } from './p2p.service';

@Controller('p2p')
export class P2pController {
  constructor(private readonly p2pService: P2pService) {}

  @Get('lookup')
  lookup(@Query('phone') phone: string) {
    return this.p2pService.lookupByPhone(phone);
  }

  @Post('preview')
  preview(@RequestUserId() userId: string, @Body() body: { toPhone: string; amountMinor: string }) {
    return this.p2pService.preview(userId, body.toPhone, BigInt(body.amountMinor));
  }

  @Post('send')
  send(@RequestUserId() userId: string, @Body() body: { toPhone: string; quoteId: string; reference: string }) {
    return this.p2pService.send(userId, body.toPhone, body.quoteId, body.reference);
  }
}
