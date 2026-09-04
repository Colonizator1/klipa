import { IsIn, IsOptional } from 'class-validator';
import type { UserLocale } from '../schemas/user.schema';

export class UpdateMeDto {
  @IsOptional()
  @IsIn(['ru', 'en'])
  locale?: UserLocale;
}
