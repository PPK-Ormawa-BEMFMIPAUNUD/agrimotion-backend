import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        code: 'token_expired',
        message: 'Token telah kadaluarsa, silakan login kembali',
      });
    }
    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException({
        code: 'invalid_token',
        message: 'Token tidak valid',
      });
    }
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          code: 'unauthorized',
          message:
            'Akses ditolak (HTTP 401). Endpoint memerlukan autentikasi JWT.',
        })
      );
    }
    return user;
  }
}
