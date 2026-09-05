import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

const DECIMAL = /^-?\d+(\.\d+)?$/;

// `type` is intentionally not editable — changing it would change which
// fields are required (see OperationsService.validateForType). Delete and
// re-create the operation instead.
export class UpdateOperationDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Matches(DECIMAL, { message: 'quantity must be a decimal string' })
  quantity?: string;

  @IsOptional()
  @Matches(DECIMAL, { message: 'price must be a decimal string' })
  price?: string;

  @IsOptional()
  @Matches(DECIMAL, { message: 'amount must be a decimal string' })
  amount?: string;

  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @IsOptional()
  @Matches(DECIMAL, { message: 'fee must be a decimal string' })
  fee?: string;

  @IsOptional()
  @IsIn(CURRENCIES)
  feeCurrency?: Currency;

  @IsOptional()
  @IsBoolean()
  useCash?: boolean;

  @IsOptional()
  @Matches(DECIMAL, { message: 'tax must be a decimal string' })
  tax?: string;

  @IsOptional()
  @IsIn(CURRENCIES)
  taxCurrency?: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
