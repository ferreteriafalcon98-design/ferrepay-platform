import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const started = Date.now();
    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - started;
        const log = {
          level: 'info',
          requestId: req.requestId,
          method: req.method,
          path: req.url,
          durationMs,
        };
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(log));
      }),
    );
  }
}
