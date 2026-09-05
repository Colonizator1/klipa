import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';
import {
  CREATABLE_OPERATION_TYPES,
  type CreatableOperationType,
} from '../schemas/operation.schema';

const DECIMAL = /^-?\d+(\.\d+)?$/;

export class CreateOperationDto {
  @IsMongoId()
  assetId: string;

  @IsDateString()
  date: string;

  @IsIn(CREATABLE_OPERATION_TYPES)
  type: CreatableOperationType;

  @IsOptional()
  @Matches(DECIMAL, { message: 'quantity must be a decimal string' })
  quantity?: string;

  @IsOptional()
  @Matches(DECIMAL, { message: 'price must be a decimal string' })
  price?: string;

  @IsOptional()
  @Matches(DECIMAL, { message: 'amount must be a decimal string' })
  amount?: string;

  @IsIn(CURRENCIES)
  currency: Currency;

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
