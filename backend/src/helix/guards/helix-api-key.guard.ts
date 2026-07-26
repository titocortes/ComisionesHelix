import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class HelixApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const key = req.headers['x-api-key'];
    if (!key || key !== process.env['HELIX_API_KEY']) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
