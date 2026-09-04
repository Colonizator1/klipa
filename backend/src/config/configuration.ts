export interface AppConfig {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  redis: { host: string; port: number };
  corsOrigins: string[];
  logLevel: string;
  domain: string;
  frontendUrl: string;
  auth: {
    jwtAccessSecret: string;
    jwtAccessTtl: string;
    refreshTokenTtlDays: number;
    requireEmailVerification: boolean;
  };
  crypto: {
    emailEncryptionKey: string;
    emailHashPepper: string;
  };
  mail: {
    driver: 'log' | 'smtp';
    from: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
    };
  };
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri:
    process.env.MONGODB_URI ?? 'mongodb://mongo:27017/klipa?replicaSet=rs0',
  redis: {
    host: process.env.REDIS_HOST ?? 'redis',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  domain: process.env.DOMAIN ?? 'localhost',
  frontendUrl:
    process.env.FRONTEND_URL ?? `http://${process.env.DOMAIN ?? 'localhost'}`,
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTokenTtlDays: parseInt(
      process.env.REFRESH_TOKEN_TTL_DAYS ?? '30',
      10,
    ),
    requireEmailVerification: parseBool(
      process.env.REQUIRE_EMAIL_VERIFICATION,
      false,
    ),
  },
  crypto: {
    emailEncryptionKey: process.env.EMAIL_ENCRYPTION_KEY ?? '',
    emailHashPepper: process.env.EMAIL_HASH_PEPPER ?? '',
  },
  mail: {
    driver: process.env.MAIL_DRIVER === 'smtp' ? 'smtp' : 'log',
    from:
      process.env.MAIL_FROM ?? `no-reply@${process.env.DOMAIN ?? 'localhost'}`,
    smtp: {
      host: process.env.SMTP_HOST ?? 'mailhog',
      port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
      secure: parseBool(process.env.SMTP_SECURE, false),
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
  },
});
