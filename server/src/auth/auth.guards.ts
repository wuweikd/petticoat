import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { AuthUser } from './auth-user';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 公开接口仍尝试解析 JWT（失败不拦截），便于 followers 可见性等
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        return result.then(() => true).catch(() => true);
      }
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthUser | undefined>(
    err: Error | null,
    user: TUser,
    _info?: unknown,
    context?: ExecutionContext,
  ): TUser {
    const isPublic =
      !!context &&
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    if (isPublic) {
      return (user || undefined) as TUser;
    }
    if (err || !user) {
      throw err || new UnauthorizedException('请先登录');
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return false;
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('权限不足');
    }
    return true;
  }
}
