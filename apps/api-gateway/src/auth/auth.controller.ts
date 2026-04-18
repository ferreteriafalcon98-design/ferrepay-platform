import { Body, Controller, Post } from '@nestjs/common';
import { RequestSessionId } from '../common/request-session';
import { RequestUserId } from '../common/request-user';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/start')
  registerStart(@Body() body: { phone: string }) {
    return this.authService.registerStart(body.phone);
  }

  @Post('register/verify')
  registerVerify(@Body() body: { challengeId: string; otp: string; deviceLabel: string; fingerprint: string }) {
    return this.authService.registerVerify(body.challengeId, body.otp, body.deviceLabel, body.fingerprint);
  }

  @Post('login/start')
  loginStart(@Body() body: { phone: string }) {
    return this.authService.loginStart(body.phone);
  }

  @Post('login/verify')
  loginVerify(@Body() body: { challengeId: string; otp: string; deviceLabel: string; fingerprint: string }) {
    return this.authService.loginVerify(body.challengeId, body.otp, body.deviceLabel, body.fingerprint);
  }

  @Post('logout')
  logout(@RequestUserId() userId: string, @RequestSessionId() sessionId: string) {
    return this.authService.logout(userId, sessionId);
  }

  @Post('refresh')
  refresh(@Body() body: { sessionId: string; refreshToken: string }) {
    return this.authService.refresh(body.sessionId, body.refreshToken);
  }
}
