import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { CustodyPlacesModule } from '../custody-places/custody-places.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { Asset, AssetSchema } from './schemas/asset.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]),
    AuthGuardsModule,
    CustodyPlacesModule,
    PortfoliosModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
