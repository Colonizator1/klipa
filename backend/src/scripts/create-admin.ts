import 'reflect-metadata';
import '../common/money/decimal-config';
import { createInterface } from 'readline';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BlindIndexService } from '../common/crypto/blind-index.service';
import { EmailCryptoService } from '../common/crypto/email-crypto.service';
import { PasswordService } from '../common/crypto/password.service';
import { UsersService } from '../users/users.service';

// SPEC.md D-16: the first admin is created out-of-band, not through the
// open-registration API. Runs against the real app's DI container so the
// hashing/encryption is byte-for-byte identical to what the API does.
//
// Sequential rl.question() calls race on piped (non-TTY) stdin — e.g. under
// `docker compose exec -T`, both answer lines can arrive in one chunk, and
// the second question's callback never fires because readline already
// consumed that line before question() #2 registered a listener for it.
// The async-iterator protocol pulls lines on demand instead, so it doesn't
// lose any.
function makePrompter(
  rl: ReturnType<typeof createInterface>,
): (question: string) => Promise<string> {
  const lines = rl[Symbol.asyncIterator]();
  return async (question: string): Promise<string> => {
    process.stdout.write(question);
    const { value, done } = await lines.next();
    if (done || value === undefined) {
      throw new Error('No more input on stdin.');
    }
    return value.trim();
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const prompt = makePrompter(rl);

  try {
    const usersService = app.get(UsersService);
    const blindIndex = app.get(BlindIndexService);
    const emailCrypto = app.get(EmailCryptoService);
    const passwordService = app.get(PasswordService);

    const rawEmail = await prompt('Admin email: ');
    const password = await prompt('Admin password (min 8 chars): ');

    if (!rawEmail.includes('@')) {
      console.error('Not a valid-looking email.');
      process.exitCode = 1;
      return;
    }
    if (password.length < 8) {
      console.error('Password must be at least 8 characters.');
      process.exitCode = 1;
      return;
    }

    const email = rawEmail.toLowerCase();
    const emailHash = blindIndex.hash(email);

    const existing = await usersService.findByEmailHash(emailHash);
    if (existing) {
      console.error(
        `A user with this email already exists (role: ${existing.role}, status: ${existing.status}).`,
      );
      process.exitCode = 1;
      return;
    }

    const passwordHash = await passwordService.hash(password);
    const user = await usersService.create({
      emailHash,
      emailEnc: emailCrypto.encrypt(email),
      emailMasked: emailCrypto.mask(email),
      passwordHash,
      locale: 'ru',
      status: 'active',
      role: 'admin',
    });
    await usersService.markEmailVerified(user._id);

    console.log(`Admin user created: ${email}`);
  } finally {
    rl.close();
    await app.close();
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    // readline leaves stdin in a state that keeps the event loop alive even
    // after rl.close() — force termination once our own work is done.
    process.exit(process.exitCode ?? 0);
  });
