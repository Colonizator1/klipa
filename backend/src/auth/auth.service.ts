import { randomBytes, randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import {
  BlindIndexService,
  hashToken,
} from '../common/crypto/blind-index.service';
import { EmailCryptoService } from '../common/crypto/email-crypto.service';
import { PasswordService } from '../common/crypto/password.service';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { MailService } from '../mail/mail.service';
import { PortfoliosService } from '../portfolios/portfolios.service';
import type {
  UserDocument,
  UserLocale,
  UserRole,
  UserStatus,
} from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import type { AppConfig } from '../config/configuration';
import type { JwtPayload } from './jwt-payload.interface';
import {
  EmailToken,
  EmailTokenDocument,
  EmailTokenPurpose,
} from './schemas/email-token.schema';
import { RefreshToken } from './schemas/refresh-token.schema';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  tokenId: Types.ObjectId;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  locale: UserLocale;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
    @InjectModel(EmailToken.name)
    private readonly emailTokenModel: Model<EmailToken>,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly blindIndex: BlindIndexService,
    private readonly emailCrypto: EmailCryptoService,
    private readonly mailService: MailService,
    private readonly portfoliosService: PortfoliosService,
    private readonly rateLimit: RateLimitService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async register(
    dto: RegisterDto,
    ip: string,
  ): Promise<{ status: UserStatus }> {
    await this.rateLimit.consume(`register:ip:${ip}`, 5, 3600);

    const email = normalizeEmail(dto.email);
    const emailHash = this.blindIndex.hash(email);

    const existing = await this.usersService.findByEmailHash(emailHash);
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_ALREADY_REGISTERED' });
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const requireVerification = this.configService.get('auth', {
      infer: true,
    }).requireEmailVerification;
    const locale = dto.locale ?? 'ru';

    const user = await this.usersService.create({
      emailHash,
      emailEnc: this.emailCrypto.encrypt(email),
      emailMasked: this.emailCrypto.mask(email),
      passwordHash,
      locale,
      status: requireVerification ? 'pending' : 'active',
    });

    // SPEC.md §12 Stage 2: "portfolios (создаётся вместе с пользователем)".
    await this.portfoliosService.createDefault(user._id, locale);

    await this.issueEmailToken(
      user,
      'verify_email',
      VERIFY_EMAIL_TTL_MS,
      email,
      locale,
    );

    return { status: user.status };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const record = await this.consumeEmailToken(dto.token, 'verify_email');
    await this.usersService.markEmailVerified(record.userId);
    return { message: 'verified' };
  }

  async login(
    dto: LoginDto,
    ip: string,
    deviceInfo: string | undefined,
  ): Promise<{ tokens: TokenPair; user: PublicUser }> {
    const email = normalizeEmail(dto.email);
    const emailHash = this.blindIndex.hash(email);

    await this.rateLimit.consume(`login:ip:${ip}`, 5, 60);
    await this.rateLimit.consume(`login:acct:${emailHash}`, 5, 60);

    const user = await this.usersService.findByEmailHash(emailHash);
    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    if (user.status === 'blocked') {
      throw new ForbiddenException({ code: 'ACCOUNT_BLOCKED' });
    }
    if (user.status === 'pending') {
      throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED' });
    }

    const tokens = await this.issueTokenPair(user, deviceInfo);
    await this.usersService.touchLastLogin(user._id);

    return { tokens, user: this.toPublicUser(user, email) };
  }

  async refresh(
    rawToken: string | undefined,
    deviceInfo: string | undefined,
  ): Promise<TokenPair> {
    if (!rawToken) {
      throw new UnauthorizedException({ code: 'NO_REFRESH_TOKEN' });
    }

    const tokenHash = hashToken(rawToken);
    const existing = await this.refreshTokenModel.findOne({ tokenHash }).exec();
    if (!existing) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' });
    }

    if (existing.revokedAt) {
      // Reuse of an already-rotated token — treat as compromise, kill the whole chain.
      await this.refreshTokenModel
        .updateMany(
          { familyId: existing.familyId, revokedAt: null },
          { revokedAt: new Date() },
        )
        .exec();
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_REUSED' });
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_EXPIRED' });
    }

    const user = await this.usersService.findById(existing.userId);
    if (!user || user.status === 'blocked') {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' });
    }

    const tokens = await this.issueTokenPair(
      user,
      deviceInfo,
      existing.familyId,
    );
    existing.revokedAt = new Date();
    existing.replacedByTokenId = tokens.tokenId;
    await existing.save();

    return tokens;
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    const tokenHash = hashToken(rawToken);
    await this.refreshTokenModel
      .updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() })
      .exec();
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    ip: string,
  ): Promise<{ message: string }> {
    const email = normalizeEmail(dto.email);
    const emailHash = this.blindIndex.hash(email);

    await this.rateLimit.consume(`forgot:ip:${ip}`, 3, 3600);
    await this.rateLimit.consume(`forgot:acct:${emailHash}`, 3, 3600);

    const user = await this.usersService.findByEmailHash(emailHash);
    if (user && user.status !== 'blocked') {
      await this.issueEmailToken(
        user,
        'reset_password',
        RESET_PASSWORD_TTL_MS,
        email,
        user.locale,
      );
    }

    // Same response whether or not the account exists — no enumeration.
    return { message: 'if_exists_sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const record = await this.consumeEmailToken(dto.token, 'reset_password');
    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.usersService.setPasswordHash(record.userId, passwordHash);
    // Resetting the password invalidates every existing session.
    await this.refreshTokenModel
      .updateMany(
        { userId: record.userId, revokedAt: null },
        { revokedAt: new Date() },
      )
      .exec();
    return { message: 'password_reset' };
  }

  private async issueTokenPair(
    user: UserDocument,
    deviceInfo: string | undefined,
    familyId?: string,
  ): Promise<TokenPair> {
    const auth = this.configService.get('auth', { infer: true });
    const payload: JwtPayload = { sub: user._id.toString(), role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    const rawRefresh = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );
    const created = await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash: hashToken(rawRefresh),
      familyId: familyId ?? randomUUID(),
      deviceInfo: deviceInfo ?? null,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      refreshTokenExpiresAt: expiresAt,
      tokenId: created._id,
    };
  }

  private async issueEmailToken(
    user: UserDocument,
    purpose: EmailTokenPurpose,
    ttlMs: number,
    email: string,
    locale: UserLocale,
  ): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    await this.emailTokenModel.create({
      userId: user._id,
      userIdHash: this.blindIndex.hash(user._id.toString()),
      tokenHash: hashToken(rawToken),
      purpose,
      expiresAt: new Date(Date.now() + ttlMs),
    });

    const frontendUrl = this.configService.get('frontendUrl', { infer: true });
    const path = purpose === 'verify_email' ? 'verify-email' : 'reset-password';
    const link = `${frontendUrl}/${path}?token=${rawToken}`;

    if (purpose === 'verify_email') {
      await this.mailService.sendVerificationEmail(email, locale, link);
    } else {
      await this.mailService.sendPasswordResetEmail(email, locale, link);
    }
  }

  private async consumeEmailToken(
    rawToken: string,
    purpose: EmailTokenPurpose,
  ): Promise<EmailTokenDocument> {
    const tokenHash = hashToken(rawToken);
    const record = await this.emailTokenModel
      .findOne({ tokenHash, purpose })
      .exec();
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({ code: 'INVALID_OR_EXPIRED_TOKEN' });
    }
    record.usedAt = new Date();
    await record.save();
    return record;
  }

  private toPublicUser(user: UserDocument, email: string): PublicUser {
    return {
      id: user._id.toString(),
      email,
      role: user.role,
      status: user.status,
      locale: user.locale,
    };
  }
}
