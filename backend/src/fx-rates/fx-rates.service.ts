import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Money } from '../common/money';
import { CreateFxRateDto } from './dto/create-fx-rate.dto';
import { ListFxRatesQueryDto } from './dto/list-fx-rates-query.dto';
import { FxRate, FxRateDocument } from './schemas/fx-rate.schema';

function toDateOnly(value: string | Date): Date {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

@Injectable()
export class FxRatesService {
  constructor(
    @InjectModel(FxRate.name) private readonly fxRateModel: Model<FxRate>,
  ) {}

  async upsert(dto: CreateFxRateDto): Promise<FxRateDocument> {
    const date = toDateOnly(dto.date);
    try {
      return await this.fxRateModel.findOneAndUpdate(
        { base: dto.base, quote: dto.quote, date },
        {
          base: dto.base,
          quote: dto.quote,
          date,
          rate: Money.of(dto.rate).toDecimal128(),
          source: 'manual',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException({ code: 'FX_RATE_ALREADY_EXISTS' });
      }
      throw error;
    }
  }

  findAll(filters: ListFxRatesQueryDto): Promise<FxRateDocument[]> {
    const query: Record<string, unknown> = {};
    if (filters.base) query.base = filters.base;
    if (filters.quote) query.quote = filters.quote;
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.$gte = toDateOnly(filters.from);
      if (filters.to) range.$lte = toDateOnly(filters.to);
      query.date = range;
    }
    return this.fxRateModel.find(query).sort({ date: -1 }).limit(500).exec();
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
