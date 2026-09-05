import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const DECIMAL = /^-?\d+(\.\d+)?$/;

export class IncomePeriodDto {
  @IsIn(['week', 'month', 'year'])
  unit: 'week' | 'month' | 'year';

  @IsInt()
  @Min(1)
  count: number;
}

export class AssetIncomeDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsBoolean()
  autoPost?: boolean;

  @ValidateIf((o: AssetIncomeDto) => o.enabled)
  @IsIn(['interest', 'coupon', 'dividend', 'rent'])
  incomeType?: 'interest' | 'coupon' | 'dividend' | 'rent';

  @ValidateIf((o: AssetIncomeDto) => o.enabled)
  @IsIn(['percent_annual', 'fixed_amount'])
  rateType?: 'percent_annual' | 'fixed_amount';

  @ValidateIf((o: AssetIncomeDto) => o.enabled)
  @Matches(DECIMAL, { message: 'rate must be a decimal string' })
  rate?: string;

  @ValidateIf((o: AssetIncomeDto) => o.enabled)
  @ValidateNested()
  @Type(() => IncomePeriodDto)
  period?: IncomePeriodDto;

  @ValidateIf((o: AssetIncomeDto) => o.enabled)
  @IsDateString()
  firstAccrualDate?: string;

  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @IsOptional()
  @IsBoolean()
  endOfMonth?: boolean;

  @IsOptional()
  @IsBoolean()
  reinvest?: boolean;

  @IsOptional()
  @Matches(DECIMAL, { message: 'taxRate must be a decimal string' })
  taxRate?: string;

  @IsOptional()
  @IsBoolean()
  toCash?: boolean;

  @IsOptional()
  @IsString()
  dayCount?: string;
}
