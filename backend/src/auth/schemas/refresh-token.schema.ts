import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Rotation + reuse-detection (SPEC.md §10): each refresh issues a new row in
 * the same `familyId` and revokes the old one. If a revoked token is ever
 * presented again, the whole family gets revoked — that's a stolen/replayed
 * token, not a legitimate double-refresh race.
 */
@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true })
  familyId: string;

  @Prop({ type: String, default: null })
  deviceInfo: string | null;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  replacedByTokenId: Types.ObjectId | null;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ familyId: 1 });
RefreshTokenSchema.index({ userId: 1 });
