import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { PortfolioController } from './portfolio.controller';
import { PortfoliosService } from './portfolios.service';
import { Portfolio, PortfolioSchema } from './schemas/portfolio.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Portfolio.name, schema: PortfolioSchema },
    ]),
    AuthGuardsModule,
  ],
  controllers: [PortfolioController],
  providers: [PortfoliosService],
  exports: [PortfoliosService],
})
export class PortfoliosModule {}
