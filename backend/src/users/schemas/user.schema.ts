import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'blocked';
export type UserLocale = 'ru' | 'en';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true })
  emailHash: string;

  @Prop({ required: true })
  emailEnc: string;

  @Prop({ required: true })
  emailMasked: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ['user', 'admin'], default: 'user' })
  role: UserRole;

  @Prop({
    required: true,
    enum: ['pending', 'active', 'blocked'],
    default: 'pending',
  })
  status: UserStatus;

  @Prop({ required: true, enum: ['ru', 'en'], default: 'ru' })
  locale: UserLocale;

  @Prop({ type: Date, default: null })
  emailVerifiedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  @Prop({ type: Date, default: null })
  deletionRequestedAt: Date | null;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
