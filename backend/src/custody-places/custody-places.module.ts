import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustodyPlacesService } from './custody-places.service';
import {
  CustodyPlace,
  CustodyPlaceSchema,
} from './schemas/custody-place.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustodyPlace.name, schema: CustodyPlaceSchema },
    ]),
  ],
  providers: [CustodyPlacesService],
  exports: [CustodyPlacesService],
})
export class CustodyPlacesModule {}
