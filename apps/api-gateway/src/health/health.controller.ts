import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  status() {
    return { status: 'ok' };
  }

  @Get('readiness')
  readiness() {
    return { status: 'ready' };
  }

  @Get('liveness')
  liveness() {
    return { status: 'alive' };
  }
}
