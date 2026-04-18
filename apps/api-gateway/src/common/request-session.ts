import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequestSessionId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
  const sessionId = request.headers['x-session-id'];

  if (!sessionId) {
    throw new BadRequestException('Missing x-session-id header');
  }

  return sessionId;
});
