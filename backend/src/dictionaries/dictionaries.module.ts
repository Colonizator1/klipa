import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { CustodyPlacesModule } from '../custody-places/custody-places.module';
import { DictionariesController } from './dictionaries.controller';

@Module({
  imports: [AuthGuardsModule, CustodyPlacesModule],
  controllers: [DictionariesController],
})
export class DictionariesModule {}
