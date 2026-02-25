import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const secret = this.config.get<string>('API_SECRET_KEY');

    // No secret configured = dev mode, allow everything
    if (!secret) return true;

    const req = ctx.switchToHttp().getRequest<{
      path: string;
      headers: Record<string, string | undefined>;
    }>();

    // Health check is always public
    if (req.path === '/health') return true;

    const key = req.headers['x-api-key'];
    if (!key || key !== secret) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
