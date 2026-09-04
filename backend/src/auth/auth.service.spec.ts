import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';

interface FakeRefreshRow {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: Types.ObjectId | null;
  save: () => Promise<void>;
}

function makeFakeRefreshModel() {
  const rows: FakeRefreshRow[] = [];
  const model = {
    rows,
    create: jest.fn((doc: Partial<FakeRefreshRow>) => {
      const row: FakeRefreshRow = {
        _id: new Types.ObjectId(),
        userId: doc.userId as Types.ObjectId,
        tokenHash: doc.tokenHash as string,
        familyId: doc.familyId as string,
        expiresAt: doc.expiresAt as Date,
        revokedAt: null,
        replacedByTokenId: null,
        save: () => {
          return Promise.resolve();
        },
      };
      rows.push(row);
      return Promise.resolve(row);
    }),
    findOne: jest.fn((query: { tokenHash: string }) => ({
      exec: () =>
        Promise.resolve(
          rows.find((r) => r.tokenHash === query.tokenHash) ?? null,
        ),
    })),
    updateMany: jest.fn(
      (
        query: { familyId: string; revokedAt: null },
        update: { revokedAt: Date },
      ) => ({
        exec: () => {
          rows
            .filter(
              (r) => r.familyId === query.familyId && r.revokedAt === null,
            )
            .forEach((r) => (r.revokedAt = update.revokedAt));
          return Promise.resolve({ modifiedCount: 0 });
        },
      }),
    ),
    updateOne: jest.fn(() => ({
      exec: () => Promise.resolve({ modifiedCount: 0 }),
    })),
  };
  return model;
}

function makeFakeEmailTokenModel() {
  return {
    create: jest.fn(() => Promise.resolve({})),
    findOne: jest.fn(() => ({ exec: () => Promise.resolve(null) })),
  };
}

describe('AuthService', () => {
  function makeService(
    userOverrides: Partial<{ status: string; passwordValid: boolean }> = {},
  ) {
    const refreshTokenModel = makeFakeRefreshModel();
    const emailTokenModel = makeFakeEmailTokenModel();

    const user = {
      _id: new Types.ObjectId(),
      passwordHash: 'irrelevant',
      role: 'user',
      status: userOverrides.status ?? 'active',
      locale: 'ru',
    };

    const usersService = {
      findByEmailHash: jest.fn(() => Promise.resolve(user)),
      findById: jest.fn(() => Promise.resolve(user)),
      touchLastLogin: jest.fn(() => Promise.resolve()),
    };

    const passwordService = {
      verify: jest.fn(() =>
        Promise.resolve(userOverrides.passwordValid ?? true),
      ),
    };

    const rateLimit = { consume: jest.fn(() => Promise.resolve()) };
    const blindIndex = { hash: jest.fn((v: string) => `hash(${v})`) };
    const jwtService = {
      signAsync: jest.fn(() => Promise.resolve('signed.jwt.token')),
    } as unknown as JwtService;
    const configService = {
      get: (key: string) => {
        if (key === 'auth')
          return { requireEmailVerification: false, refreshTokenTtlDays: 30 };
        return undefined;
      },
    } as unknown as ConfigService;

    const service = new AuthService(
      refreshTokenModel as never,
      emailTokenModel as never,
      usersService as never,
      passwordService as never,
      blindIndex as never,
      {} as never,
      {
        sendVerificationEmail: jest.fn(),
        sendPasswordResetEmail: jest.fn(),
      } as never,
      rateLimit as never,
      jwtService,
      configService,
    );

    return { service, refreshTokenModel, user };
  }

  describe('login', () => {
    it('rejects a blocked account even with the correct password', async () => {
      const { service } = makeService({ status: 'blocked' });
      await expect(
        service.login(
          { email: 'a@b.com', password: 'x' },
          '1.2.3.4',
          undefined,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a pending (unverified) account', async () => {
      const { service } = makeService({ status: 'pending' });
      await expect(
        service.login(
          { email: 'a@b.com', password: 'x' },
          '1.2.3.4',
          undefined,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a wrong password before revealing account status', async () => {
      const { service } = makeService({
        status: 'pending',
        passwordValid: false,
      });
      await expect(
        service.login(
          { email: 'a@b.com', password: 'wrong' },
          '1.2.3.4',
          undefined,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues a refresh token row on successful login', async () => {
      const { service, refreshTokenModel } = makeService();
      await service.login(
        { email: 'a@b.com', password: 'x' },
        '1.2.3.4',
        undefined,
      );
      expect(refreshTokenModel.rows).toHaveLength(1);
      expect(refreshTokenModel.rows[0].revokedAt).toBeNull();
    });
  });

  describe('refresh', () => {
    it('rotates the token: old one is revoked, a new one in the same family is issued', async () => {
      const { service, refreshTokenModel } = makeService();
      const { tokens: firstTokens } = await service.login(
        { email: 'a@b.com', password: 'x' },
        '1.2.3.4',
        undefined,
      );

      const rotated = await service.refresh(
        firstTokens.refreshToken,
        undefined,
      );

      expect(refreshTokenModel.rows).toHaveLength(2);
      const [oldRow, newRow] = refreshTokenModel.rows;
      expect(oldRow.revokedAt).not.toBeNull();
      expect(oldRow.replacedByTokenId).toEqual(newRow._id);
      expect(newRow.familyId).toBe(oldRow.familyId);
      expect(rotated.refreshToken).not.toBe(firstTokens.refreshToken);
    });

    it('revokes the entire family when a revoked (already-used) token is replayed', async () => {
      const { service, refreshTokenModel } = makeService();
      const { tokens: firstTokens } = await service.login(
        { email: 'a@b.com', password: 'x' },
        '1.2.3.4',
        undefined,
      );

      await service.refresh(firstTokens.refreshToken, undefined); // legitimate rotation — firstTokens.refreshToken now revoked

      await expect(
        service.refresh(firstTokens.refreshToken, undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      // Both the original and its replacement must now be revoked (whole chain killed).
      expect(refreshTokenModel.rows.every((r) => r.revokedAt !== null)).toBe(
        true,
      );
    });

    it('rejects an unknown refresh token', async () => {
      const { service } = makeService();
      await expect(
        service.refresh('not-a-real-token', undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when no refresh token is presented', async () => {
      const { service } = makeService();
      await expect(
        service.refresh(undefined, undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
