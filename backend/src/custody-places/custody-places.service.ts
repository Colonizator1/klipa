import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CustodyPlace,
  CustodyPlaceDocument,
} from './schemas/custody-place.schema';

@Injectable()
export class CustodyPlacesService {
  constructor(
    @InjectModel(CustodyPlace.name)
    private readonly custodyPlaceModel: Model<CustodyPlace>,
  ) {}

  /** Called whenever an asset is saved with a `custody` block — feeds the holder autocomplete. */
  async touch(
    userId: Types.ObjectId,
    country: string,
    holder: string,
  ): Promise<void> {
    const trimmedHolder = holder.trim();
    if (!trimmedHolder) {
      return;
    }
    await this.custodyPlaceModel
      .updateOne(
        { userId, country, holder: trimmedHolder },
        { $inc: { usageCount: 1 } },
        { upsert: true },
      )
      .exec();
  }

  search(
    userId: string | Types.ObjectId,
    country?: string,
    q?: string,
  ): Promise<CustodyPlaceDocument[]> {
    const filter: Record<string, unknown> = { userId };
    if (country) {
      filter.country = country;
    }
    if (q) {
      filter.holder = { $regex: escapeRegex(q), $options: 'i' };
    }
    return this.custodyPlaceModel
      .find(filter)
      .sort({ usageCount: -1 })
      .limit(20)
      .exec();
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
