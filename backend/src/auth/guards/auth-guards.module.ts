import { Module } from '@nestjs/common';
import { JwtSharedModule } from '../jwt-shared.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [JwtSharedModule],
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard, JwtSharedModule],
})
export class AuthGuardsModule {}
