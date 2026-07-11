import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: {
    statusCode: number;
    timestamp: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((result) => {
        // If the service returns { data, meta } (paginated), merge meta into root meta
        const isPaginated =
          result !== null &&
          typeof result === 'object' &&
          'data' in result &&
          'meta' in result;

        if (isPaginated) {
          const paginated = result as unknown as {
            data: T;
            meta: Record<string, unknown>;
          };
          return {
            success: true,
            message: 'Success',
            data: paginated.data,
            meta: {
              statusCode: response.statusCode,
              timestamp: new Date().toISOString(),
              ...paginated.meta,
            },
          };
        }

        return {
          success: true,
          message: 'Success',
          data: result,
          meta: {
            statusCode: response.statusCode,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
