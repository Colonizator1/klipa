import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

/** SPEC.md §4.11 — backs the "where stored" holder autocomplete (§9). */
@Schema({ collection: 'custody_places' })
export class CustodyPlace {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  holder: string;

  @Prop({ required: true, default: 1 })
  usageCount: number;
}

export type CustodyPlaceDocument = HydratedDocument<CustodyPlace>;
export const CustodyPlaceSchema = SchemaFactory.createForClass(CustodyPlace);
CustodyPlaceSchema.index(
  { userId: 1, country: 1, holder: 1 },
  { unique: true },
);
