import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface PrismaError {
  code?: string;
  meta?: { target?: string[] };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;

    // Handle HttpException (NestJS built-in: 400, 401, 403, 404, 409, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res['message'] as string) ?? exception.message;
        if (Array.isArray(res['message'])) {
          message = 'Validation failed';
          errors = res['message'];
        }
      }
    }
    // Handle Prisma Errors
    else if (this.isPrismaError(exception)) {
      const prismaError = exception as PrismaError;
      switch (prismaError.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = prismaError.meta?.target;
          message = target
            ? `Duplicate value for field: ${target.join(', ')}`
            : 'Unique constraint violation';
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Database error: ${prismaError.code ?? 'unknown'}`;
      }
    }
    // Handle generic Error
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log the error
    this.logger.error(
      `[${request.method}] ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      message,
      data: null,
      errors,
      meta: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  private isPrismaError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof (exception as PrismaError).code === 'string' &&
      (exception as PrismaError).code!.startsWith('P')
    );
  }
}
