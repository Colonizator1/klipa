import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

export type AssetKind = 'central' | 'custom';
export type CustomAssetType = 'deposit' | 'bond' | 'cash' | 'realty' | 'other';
export type AssetStatus = 'open' | 'closed' | 'matured';
export type IncomeType = 'interest' | 'coupon' | 'dividend' | 'rent';
export type IncomeRateType = 'percent_annual' | 'fixed_amount';
export type PeriodUnit = 'week' | 'month' | 'year';

@Schema({ _id: false })
export class Custody {
  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  holder: string;
}

export const CustodySchema = SchemaFactory.createForClass(Custody);

@Schema({ _id: false })
export class IncomePeriod {
  @Prop({ type: String, required: true, enum: ['week', 'month', 'year'] })
  unit: PeriodUnit;

  @Prop({ required: true, min: 1 })
  count: number;
}

export const IncomePeriodSchema = SchemaFactory.createForClass(IncomePeriod);

/**
 * SPEC.md §4.7 + §6.1. Only meaningful when `enabled` is true — the accrual
 * *generator* itself (idempotent schedule, cron, needs_decision on maturity)
 * is Stage 5 (SPEC.md §12); Stage 2 only captures and stores these settings.
 */
@Schema({ _id: false })
export class AssetIncome {
  @Prop({ required: true, default: false })
  enabled: boolean;

  @Prop({ required: true, default: false })
  autoPost: boolean;

  @Prop({
    type: String,
    enum: ['interest', 'coupon', 'dividend', 'rent'],
    default: null,
  })
  incomeType: IncomeType | null;

  @Prop({
    type: String,
    enum: ['percent_annual', 'fixed_amount'],
    default: null,
  })
  rateType: IncomeRateType | null;

  @Prop({ type: Types.Decimal128, default: null })
  rate: Types.Decimal128 | null;

  @Prop({ type: IncomePeriodSchema, default: null })
  period: IncomePeriod | null;

  // Day-of-month derived from `firstAccrualDate` at write time — SPEC.md §4.7:
  // "anchorDay — день месяца из firstAccrualDate, хранится явно". Never taken
  // from client input directly.
  @Prop({ type: Number, default: null })
  anchorDay: number | null;

  @Prop({ default: false })
  endOfMonth: boolean;

  @Prop({ type: Date, default: null })
  firstAccrualDate: Date | null;

  @Prop({ type: Date, default: null })
  maturityDate: Date | null;

  @Prop({ default: false })
  reinvest: boolean;

  @Prop({ type: Types.Decimal128, default: null })
  taxRate: Types.Decimal128 | null;

  @Prop({ default: false })
  toCash: boolean;

  @Prop({ default: 'ACT/365' })
  dayCount: string;
}

export const AssetIncomeSchema = SchemaFactory.createForClass(AssetIncome);

@Schema({ timestamps: true, collection: 'assets' })
export class Asset {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'Portfolio' })
  portfolioId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ['central', 'custom'],
    default: 'custom',
  })
  kind: AssetKind;

  // Central assets land in Stage 7 — feature-flagged off until then, see
  // AssetsService.assertKindAllowed.
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Instrument', default: null })
  instrumentId: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ['deposit', 'bond', 'cash', 'realty', 'other'],
    default: null,
  })
  type: CustomAssetType | null;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true, enum: CURRENCIES })
  currency: Currency;

  @Prop({ type: CustodySchema, default: null })
  custody: Custody | null;

  @Prop({ type: AssetIncomeSchema, default: null })
  income: AssetIncome | null;

  @Prop({
    type: String,
    required: true,
    enum: ['open', 'closed', 'matured'],
    default: 'open',
  })
  status: AssetStatus;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export type AssetDocument = HydratedDocument<Asset>;
export const AssetSchema = SchemaFactory.createForClass(Asset);
AssetSchema.index({ portfolioId: 1, deletedAt: 1 });
