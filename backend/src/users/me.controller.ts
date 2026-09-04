import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { EmailCryptoService } from '../common/crypto/email-crypto.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

interface MeResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  locale: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailCrypto: EmailCryptoService,
  ) {}

  @Get()
  async getMe(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<MeResponse> {
    const user = await this.usersService.findById(currentUser.id);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    }
    return this.toResponse(user);
  }

  @Patch()
  async updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponse> {
    if (dto.locale) {
      await this.usersService.updateLocale(
        new Types.ObjectId(currentUser.id),
        dto.locale,
      );
    }
    const user = await this.usersService.findById(currentUser.id);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    }
    return this.toResponse(user);
  }

  private toResponse(user: {
    _id: Types.ObjectId;
    emailEnc: string;
    role: string;
    status: string;
    locale: string;
    emailVerifiedAt: Date | null;
    createdAt?: Date;
  }): MeResponse {
    return {
      id: user._id.toString(),
      email: this.emailCrypto.decrypt(user.emailEnc),
      role: user.role,
      status: user.status,
      locale: user.locale,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt as Date,
    };
  }
}
