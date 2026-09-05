import { Type } from 'class-transformer';
import {
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
import { AssetIncomeDto } from './asset-income.dto';

export class CustodyDto {
  @IsString()
  @MinLength(1)
  country: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  holder: string;
}

// Central assets (kind: 'central') are feature-flagged off until Stage 7
// (SPEC.md §12) — this stage only ever creates 'custom' assets, so `kind`
// isn't even a client-settable field yet.
export class CreateAssetDto {
  @IsIn(['deposit', 'bond', 'cash', 'realty', 'other'])
  type: 'deposit' | 'bond' | 'cash' | 'realty' | 'other';

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsIn(CURRENCIES)
  currency: Currency;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustodyDto)
  custody?: CustodyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssetIncomeDto)
  income?: AssetIncomeDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
