import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

export type FxRateSource = 'manual' | 'provider';

/** SPEC.md §4.5 — manual entry only until Stage 9 wires up real providers. */
@Schema({ timestamps: true, collection: 'fx_rates' })
export class FxRate {
  @Prop({ type: String, required: true, enum: CURRENCIES })
  base: Currency;

  @Prop({ type: String, required: true, enum: CURRENCIES })
  quote: Currency;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Types.Decimal128, required: true })
  rate: Types.Decimal128;

  @Prop({
    type: String,
    required: true,
    enum: ['manual', 'provider'],
    default: 'manual',
  })
  source: FxRateSource;
}

export type FxRateDocument = HydratedDocument<FxRate>;
export const FxRateSchema = SchemaFactory.createForClass(FxRate);
FxRateSchema.index({ base: 1, quote: 1, date: 1 }, { unique: true });
