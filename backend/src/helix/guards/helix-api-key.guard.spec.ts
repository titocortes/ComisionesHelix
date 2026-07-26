import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { HelixApiKeyGuard } from './helix-api-key.guard.js';

function contextWithHeaders(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('HelixApiKeyGuard', () => {
  const guard = new HelixApiKeyGuard();
  const originalKey = process.env['HELIX_API_KEY'];

  beforeAll(() => {
    process.env['HELIX_API_KEY'] = 'test-shared-secret';
  });

  afterAll(() => {
    process.env['HELIX_API_KEY'] = originalKey;
  });

  it('allows the request when x-api-key matches the shared secret', () => {
    expect(guard.canActivate(contextWithHeaders({ 'x-api-key': 'test-shared-secret' }))).toBe(true);
  });

  it('rejects a missing x-api-key header', () => {
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(UnauthorizedException);
  });

  it('rejects a mismatched x-api-key header', () => {
    expect(() => guard.canActivate(contextWithHeaders({ 'x-api-key': 'wrong' }))).toThrow(UnauthorizedException);
  });
});
