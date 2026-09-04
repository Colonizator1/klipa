import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CryptoModule } from '../common/crypto/crypto.module';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { MeController } from './me.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CryptoModule,
    AuthGuardsModule,
  ],
  controllers: [MeController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
