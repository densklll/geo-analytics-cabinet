import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth-user';
import { IS_PUBLIC } from './public.decorator';

/**
 * Глобальный guard: по умолчанию закрыто всё, открываем явно через @Public().
 * Так новый эндпоинт нельзя случайно оставить без авторизации.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Требуется авторизация');

    try {
      const payload = await this.jwt.verifyAsync(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId ?? null,
      } satisfies AuthUser;
      return true;
    } catch {
      throw new UnauthorizedException('Сессия истекла, войдите заново');
    }
  }
}
