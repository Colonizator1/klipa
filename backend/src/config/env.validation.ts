import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const HEX_32_BYTES = /^[0-9a-f]{64}$/i;

class EnvironmentVariables {
  @IsIn([NodeEnv.Development, NodeEnv.Test, NodeEnv.Production])
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  MONGODB_URI: string;

  @IsString()
  REDIS_HOST: string = 'redis';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsOptional()
  @IsString()
  CORS_ORIGINS: string = '';

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
  LOG_LEVEL: string = 'info';

  @IsOptional()
  @IsString()
  DOMAIN: string = 'localhost';

  @IsOptional()
  @IsString()
  FRONTEND_URL: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters',
  })
  JWT_ACCESS_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL: string = '15m';

  @IsOptional()
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 30;

  @IsOptional()
  @IsString()
  REQUIRE_EMAIL_VERIFICATION: string = 'false';

  @Matches(HEX_32_BYTES, {
    message: 'EMAIL_ENCRYPTION_KEY must be 64 hex chars (32 bytes)',
  })
  EMAIL_ENCRYPTION_KEY: string;

  @Matches(HEX_32_BYTES, {
    message: 'EMAIL_HASH_PEPPER must be 64 hex chars (32 bytes)',
  })
  EMAIL_HASH_PEPPER: string;

  @IsOptional()
  @IsIn(['log', 'smtp'])
  MAIL_DRIVER: string = 'log';

  @IsOptional()
  @IsString()
  MAIL_FROM: string;

  @IsOptional()
  @IsString()
  SMTP_HOST: string;

  @IsOptional()
  @IsInt()
  SMTP_PORT: number;

  @IsOptional()
  @IsString()
  SMTP_USER: string;

  @IsOptional()
  @IsString()
  SMTP_PASS: string;

  @IsOptional()
  @IsString()
  SMTP_SECURE: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.toString()}`);
  }

  return validated;
}
