import { Controller, Get, Query } from '@nestjs/common';
import { ObservabilityService } from './observability.service';

@Controller('admin/observability')
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Get('metrics')
  metrics() {
    return this.observabilityService.metrics();
  }

  @Get('security-events')
  securityEvents(@Query('limit') limit?: string) {
    return this.observabilityService.securityEvents(limit ? Number(limit) : 100);
  }

  @Get('readiness')
  readiness() {
    return this.observabilityService.readiness();
  }
}
