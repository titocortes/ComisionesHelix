import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: { userRole?: { roleName: string } } }>();
    if (req.user?.userRole?.roleName?.toLowerCase() !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
