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
import { CustodyDto } from './create-asset.dto';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustodyDto)
  custody?: CustodyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssetIncomeDto)
  income?: AssetIncomeDto;

  @IsOptional()
  @IsIn(['open', 'closed', 'matured'])
  status?: 'open' | 'closed' | 'matured';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
