import { IsDateString, IsIn, IsMongoId, IsOptional } from 'class-validator';
import {
  OPERATION_TYPES,
  type OperationType,
} from '../schemas/operation.schema';

export class ListOperationsQueryDto {
  @IsOptional()
  @IsMongoId()
  assetId?: string;

  @IsOptional()
  @IsIn(OPERATION_TYPES)
  type?: OperationType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
