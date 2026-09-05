import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { FxRatesController } from './fx-rates.controller';
import { FxRatesService } from './fx-rates.service';
import { FxRate, FxRateSchema } from './schemas/fx-rate.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FxRate.name, schema: FxRateSchema }]),
    AuthGuardsModule,
  ],
  controllers: [FxRatesController],
  providers: [FxRatesService],
  exports: [FxRatesService],
})
export class FxRatesModule {}
