import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

export type RecalcStatus = 'clean' | 'queued' | 'running' | 'failed';

@Schema({ _id: false })
export class PortfolioSettings {
  @Prop({ required: true, default: false })
  walletsEnabled: boolean;

  @Prop({ required: true, default: false })
  defaultUseCash: boolean;

  @Prop({ required: true, enum: ['FIFO'], default: 'FIFO' })
  costBasis: 'FIFO';
}

export const PortfolioSettingsSchema =
  SchemaFactory.createForClass(PortfolioSettings);

@Schema({ timestamps: true, collection: 'portfolios' })
export class Portfolio {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    unique: true,
    ref: 'User',
  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true, enum: CURRENCIES })
  baseCurrency: Currency;

  @Prop({ type: PortfolioSettingsSchema, required: true })
  settings: PortfolioSettings;

  // Stage 3 owns reading/writing this beyond its initial `null` — see SPEC.md
  // §5.2. Stage 2 only shapes the field, it never sets it.
  @Prop({ type: Date, default: null })
  recalcFrom: Date | null;

  @Prop({
    type: String,
    required: true,
    enum: ['clean', 'queued', 'running', 'failed'],
    default: 'clean',
  })
  recalcStatus: RecalcStatus;
}

export type PortfolioDocument = HydratedDocument<Portfolio>;
export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
