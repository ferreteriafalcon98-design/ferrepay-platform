import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequestUserId } from '../common/request-user';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('bootstrap')
  bootstrap(
    @RequestUserId() userId: string,
    @Body() body: { phone: string; countryCode?: string; currencyCode?: string },
  ) {
    return this.walletService.bootstrapPrimaryWallet(
      userId,
      body.phone,
      body.countryCode ?? 'CO',
      body.currencyCode ?? 'COP',
    );
  }

  @Get('home')
  home(@RequestUserId() userId: string) {
    return this.walletService.home(userId);
  }

  @Get('history')
  history(@RequestUserId() userId: string) {
    return this.walletService.history(userId);
  }

  @Get('alias/:phone')
  resolvePhoneAlias(@Param('phone') phone: string) {
    return this.walletService.resolvePhoneAlias(phone);
  }
}
