import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  UserLocale,
  UserRole,
  UserStatus,
} from './schemas/user.schema';

export interface CreateUserInput {
  emailHash: string;
  emailEnc: string;
  emailMasked: string;
  passwordHash: string;
  locale: UserLocale;
  status: UserStatus;
  /** Defaults to 'user' (schema default) — only scripts/create-admin.ts passes 'admin'. */
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  create(input: CreateUserInput): Promise<UserDocument> {
    return this.userModel.create(input);
  }

  findByEmailHash(emailHash: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ emailHash }).exec();
  }

  findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async setPasswordHash(
    id: Types.ObjectId,
    passwordHash: string,
  ): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { passwordHash }).exec();
  }

  async markEmailVerified(id: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      return;
    }
    user.emailVerifiedAt = new Date();
    if (user.status === 'pending') {
      user.status = 'active';
    }
    await user.save();
  }

  async touchLastLogin(id: Types.ObjectId): Promise<void> {
    await this.userModel
      .updateOne({ _id: id }, { lastLoginAt: new Date() })
      .exec();
  }

  async updateLocale(id: Types.ObjectId, locale: UserLocale): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { locale }).exec();
  }
}
