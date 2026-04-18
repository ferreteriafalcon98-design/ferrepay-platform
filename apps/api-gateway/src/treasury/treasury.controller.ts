import { Controller, Get, Param } from '@nestjs/common';
import { TreasuryService } from './treasury.service';

@Controller('admin/treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('overview')
  overview() {
    return this.treasuryService.overview();
  }

  @Get('overview/:countryCode')
  overviewByCountry(@Param('countryCode') countryCode: string) {
    return this.treasuryService.overview(countryCode);
  }
}
