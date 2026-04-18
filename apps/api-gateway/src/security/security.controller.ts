import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequestUserId } from '../common/request-user';
import { SecurityService } from './security.service';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('overview')
  overview(@RequestUserId() userId: string) {
    return this.securityService.overview(userId);
  }

  @Post('pin/setup')
  setPin(@RequestUserId() userId: string, @Body() body: { pin: string }) {
    return this.securityService.setPin(userId, body.pin);
  }

  @Post('biometric/enable')
  enableBiometric(@RequestUserId() userId: string) {
    return this.securityService.setBiometric(userId, true);
  }

  @Post('biometric/disable')
  disableBiometric(@RequestUserId() userId: string) {
    return this.securityService.setBiometric(userId, false);
  }

  @Get('devices')
  devices(@RequestUserId() userId: string) {
    return this.securityService.devices(userId);
  }

  @Post('devices/:id/revoke')
  revokeDevice(@RequestUserId() userId: string, @Param('id') id: string) {
    return this.securityService.revokeDevice(userId, id);
  }

  @Get('sessions')
  sessions(@RequestUserId() userId: string) {
    return this.securityService.sessions(userId);
  }

  @Post('sessions/:id/revoke')
  revokeSession(@RequestUserId() userId: string, @Param('id') id: string) {
    return this.securityService.revokeSession(userId, id);
  }
}
