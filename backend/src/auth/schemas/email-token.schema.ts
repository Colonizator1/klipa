import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type EmailTokenPurpose = 'verify_email' | 'reset_password';

@Schema({ timestamps: true, collection: 'email_tokens' })
export class EmailToken {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  /** SPEC.md §4.11 — HMAC blind index of the userId, for admin tooling without exposing the raw id relationship. Not used for lookups (tokenHash already is). */
  @Prop({ required: true })
  userIdHash: string;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true, enum: ['verify_email', 'reset_password'] })
  purpose: EmailTokenPurpose;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  usedAt: Date | null;
}

export type EmailTokenDocument = HydratedDocument<EmailToken>;
export const EmailTokenSchema = SchemaFactory.createForClass(EmailToken);
EmailTokenSchema.index({ userIdHash: 1 });
