import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { EmailCryptoService } from './email-crypto.service';

function makeService(): EmailCryptoService {
  const configService = {
    get: () => ({ emailEncryptionKey: randomBytes(32).toString('hex') }),
  } as unknown as ConfigService;
  return new EmailCryptoService(configService);
}

describe('EmailCryptoService', () => {
  it('round-trips plaintext through encrypt/decrypt', () => {
    const service = makeService();
    const email = 'ivan@example.com';
    const encrypted = service.encrypt(email);
    expect(encrypted).not.toContain(email);
    expect(service.decrypt(encrypted)).toBe(email);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const service = makeService();
    const a = service.encrypt('same@example.com');
    const b = service.encrypt('same@example.com');
    expect(a).not.toBe(b);
  });

  it('rejects a tampered ciphertext', () => {
    const service = makeService();
    const encrypted = service.encrypt('ivan@example.com');
    const [iv, tag, ciphertext] = encrypted.split('.');
    const tampered = [
      iv,
      tag,
      Buffer.from('tampered').toString('base64') + ciphertext.slice(8),
    ].join('.');
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('masks the local part but keeps the domain visible', () => {
    const service = makeService();
    expect(service.mask('ivan@gmail.com')).toBe('iv**@gmail.com');
    expect(service.mask('al@gmail.com')).toBe('al*@gmail.com');
  });
});
