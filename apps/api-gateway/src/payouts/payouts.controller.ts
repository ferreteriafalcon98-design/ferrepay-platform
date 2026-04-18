import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { RequestUserId } from '../common/request-user';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('beneficiaries')
  listBeneficiaries(@RequestUserId() userId: string) {
    return this.payoutsService.listBeneficiaries(userId);
  }

  @Post('beneficiaries')
  createBeneficiary(
    @RequestUserId() userId: string,
    @Headers('x-step-up-token') stepUpToken: string | undefined,
    @Body() body: { alias: string; accountNumber: string; bankCode: string; countryCode: string; currencyCode: string },
  ) {
    return this.payoutsService.createBeneficiary(userId, stepUpToken, body);
  }

  @Patch('beneficiaries/:id')
  updateBeneficiary(
    @RequestUserId() userId: string,
    @Param('id') id: string,
    @Headers('x-step-up-token') stepUpToken: string | undefined,
    @Body() body: { alias?: string; accountNumber?: string; bankCode?: string },
  ) {
    return this.payoutsService.updateBeneficiary(userId, id, stepUpToken, body);
  }

  @Delete('beneficiaries/:id')
  archiveBeneficiary(
    @RequestUserId() userId: string,
    @Param('id') id: string,
    @Headers('x-step-up-token') stepUpToken: string | undefined,
  ) {
    return this.payoutsService.archiveBeneficiary(userId, id, stepUpToken);
  }

  @Post('preview')
  preview(@RequestUserId() userId: string, @Body() body: { beneficiaryId: string; amountMinor: string }) {
    return this.payoutsService.preview(userId, body.beneficiaryId, BigInt(body.amountMinor));
  }

  @Post('request')
  request(@RequestUserId() userId: string, @Body() body: { beneficiaryId: string; quoteId: string }) {
    return this.payoutsService.requestPayout(userId, body.beneficiaryId, body.quoteId);
  }

  @Post(':id/approve')
  approve(@Param('id') payoutId: string, @Body() body: { reviewerId: string; note?: string }) {
    return this.payoutsService.approve(payoutId, body.reviewerId, body.note);
  }

  @Post(':id/reject')
  reject(@Param('id') payoutId: string, @Body() body: { reviewerId: string; note?: string }) {
    return this.payoutsService.reject(payoutId, body.reviewerId, body.note);
  }

  @Get('history')
  history(@RequestUserId() userId: string) {
    return this.payoutsService.history(userId);
  }
}
