import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

class UpdatePortfolioSettingsDto {
  @IsOptional()
  @IsBoolean()
  defaultUseCash?: boolean;
}

export class UpdatePortfolioDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(CURRENCIES)
  baseCurrency?: Currency;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePortfolioSettingsDto)
  settings?: UpdatePortfolioSettingsDto;
}
