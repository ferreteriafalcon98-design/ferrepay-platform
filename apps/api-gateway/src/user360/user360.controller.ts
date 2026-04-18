import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { User360Service } from './user360.service';

@Controller('admin/user360')
export class User360Controller {
  constructor(private readonly user360Service: User360Service) {}

  @Get(':userId')
  profile(@Param('userId') userId: string) {
    return this.user360Service.profile(userId);
  }

  @Get(':userId/timeline')
  timeline(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.user360Service.timeline(userId, limit ? Number(limit) : 200);
  }

  @Post(':userId/actions/audit')
  auditAction(
    @Param('userId') userId: string,
    @Body() body: { actorId: string; action: string; requestId: string; metadata?: Record<string, unknown> },
  ) {
    return this.user360Service.auditAction(userId, body.actorId, body.action, body.requestId, body.metadata);
  }
}
