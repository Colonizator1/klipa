import { ConfigService } from '@nestjs/config';
import { BlindIndexService, hashToken } from './blind-index.service';

function makeService(pepper: string): BlindIndexService {
  const configService = {
    get: () => ({ emailHashPepper: pepper }),
  } as unknown as ConfigService;
  return new BlindIndexService(configService);
}

describe('BlindIndexService', () => {
  it('is deterministic for the same input and pepper', () => {
    const service = makeService('pepper-a');
    expect(service.hash('ivan@example.com')).toBe(
      service.hash('ivan@example.com'),
    );
  });

  it('differs for different peppers (so a leaked DB alone cannot be dictionary-attacked)', () => {
    const a = makeService('pepper-a').hash('ivan@example.com');
    const b = makeService('pepper-b').hash('ivan@example.com');
    expect(a).not.toBe(b);
  });

  it('never contains the plaintext input', () => {
    const service = makeService('pepper-a');
    expect(service.hash('ivan@example.com')).not.toContain('ivan');
  });
});

describe('hashToken', () => {
  it('is deterministic', () => {
    expect(hashToken('raw-token')).toBe(hashToken('raw-token'));
  });

  it('differs for different tokens', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});
