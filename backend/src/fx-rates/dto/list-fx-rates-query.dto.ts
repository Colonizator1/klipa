import { IsDateString, IsIn, IsOptional } from 'class-validator';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

export class ListFxRatesQueryDto {
  @IsOptional()
  @IsIn(CURRENCIES)
  base?: Currency;

  @IsOptional()
  @IsIn(CURRENCIES)
  quote?: Currency;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
