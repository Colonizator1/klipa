import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

/**
 * Full type list per SPEC.md §4.8 — the schema's shape isn't ours to trim
 * (§13 rule 5), but Stage 2 (SPEC.md §12) only creates the subset that needs
 * no engine/wallets/corporate-actions support yet: `CREATABLE_OPERATION_TYPES`
 * below, enforced in OperationsService. The rest (`TAX`, `MATURITY`,
 * `WALLET_IN`/`OUT`, `FX_EXCHANGE`, `SPLIT_ADJUST`) arrive with Stages 4/5/10.
 */
export type OperationType =
  | 'BUY'
  | 'SELL'
  | 'INCOME'
  | 'FEE'
  | 'TAX'
  | 'REVALUATION'
  | 'PRINCIPAL_IN'
  | 'MATURITY'
  | 'WALLET_IN'
  | 'WALLET_OUT'
  | 'FX_EXCHANGE'
  | 'SPLIT_ADJUST';

export const OPERATION_TYPES: OperationType[] = [
  'BUY',
  'SELL',
  'INCOME',
  'FEE',
  'TAX',
  'REVALUATION',
  'PRINCIPAL_IN',
  'MATURITY',
  'WALLET_IN',
  'WALLET_OUT',
  'FX_EXCHANGE',
  'SPLIT_ADJUST',
];

export const CREATABLE_OPERATION_TYPES = [
  'BUY',
  'SELL',
  'INCOME',
  'FEE',
  'REVALUATION',
  'PRINCIPAL_IN',
] as const;
export type CreatableOperationType = (typeof CREATABLE_OPERATION_TYPES)[number];

export type OperationStatus = 'normal' | 'needs_decision';
export type OperationSource = 'manual' | 'auto' | 'import' | 'corporate_action';

@Schema({ timestamps: true, collection: 'operations' })
export class Operation {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Portfolio' })
  portfolioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Asset' })
  assetId: Types.ObjectId;

  // Date-without-time (UTC midnight) — SPEC.md §4: "даты операций — дата без
  // времени", to sidestep timezone questions in accrual scheduling.
  @Prop({ type: Date, required: true })
  date: Date;

  // Same-day ordering, since FIFO would otherwise be non-deterministic
  // (SPEC.md §4). Assigned server-side, never client input.
  @Prop({ required: true })
  seq: number;

  @Prop({ type: String, required: true, enum: OPERATION_TYPES })
  type: OperationType;

  @Prop({ type: Types.Decimal128, default: null })
  quantity: Types.Decimal128 | null;

  @Prop({ type: Types.Decimal128, default: null })
  price: Types.Decimal128 | null;

  @Prop({ type: Types.Decimal128, required: true })
  amount: Types.Decimal128;

  @Prop({ type: String, required: true, enum: CURRENCIES })
  currency: Currency;

  @Prop({ type: Types.Decimal128, default: null })
  fee: Types.Decimal128 | null;

  @Prop({ type: String, enum: CURRENCIES, default: null })
  feeCurrency: Currency | null;

  @Prop({ required: true, default: false })
  useCash: boolean;

  @Prop({ type: String, enum: CURRENCIES, default: null })
  walletCurrency: Currency | null;

  @Prop({ type: Types.Decimal128, default: null })
  tax: Types.Decimal128 | null;

  @Prop({ type: String, enum: CURRENCIES, default: null })
  taxCurrency: Currency | null;

  @Prop({
    type: String,
    required: true,
    enum: ['normal', 'needs_decision'],
    default: 'normal',
  })
  status: OperationStatus;

  @Prop({
    type: String,
    required: true,
    enum: ['manual', 'auto', 'import', 'corporate_action'],
    default: 'manual',
  })
  source: OperationSource;

  @Prop({ type: String, default: null })
  idempotencyKey: string | null;

  @Prop({ type: Types.ObjectId, default: null })
  generatedFrom: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export type OperationDocument = HydratedDocument<Operation>;
export const OperationSchema = SchemaFactory.createForClass(Operation);
OperationSchema.index({ portfolioId: 1, date: 1, seq: 1 });
OperationSchema.index({ assetId: 1, deletedAt: 1 });
OperationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
