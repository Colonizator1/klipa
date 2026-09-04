import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UserLocale } from '../../users/schemas/user.schema';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;

  @IsOptional()
  @IsIn(['ru', 'en'])
  locale?: UserLocale;
}
