import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetsModule } from '../assets/assets.module';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { AssetOperationsController } from './asset-operations.controller';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { Operation, OperationSchema } from './schemas/operation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Operation.name, schema: OperationSchema },
    ]),
    AuthGuardsModule,
    AssetsModule,
    PortfoliosModule,
  ],
  controllers: [OperationsController, AssetOperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
