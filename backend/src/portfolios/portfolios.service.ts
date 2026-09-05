import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Currency } from '../common/dictionaries/currencies';
import type { UserLocale } from '../users/schemas/user.schema';
import { Portfolio, PortfolioDocument } from './schemas/portfolio.schema';

const DEFAULT_PORTFOLIO_NAME: Record<UserLocale, string> = {
  ru: 'Мой портфель',
  en: 'My portfolio',
};

export interface UpdatePortfolioInput {
  name?: string;
  baseCurrency?: Currency;
  settings?: { defaultUseCash?: boolean };
}

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectModel(Portfolio.name)
    private readonly portfolioModel: Model<Portfolio>,
  ) {}

  /** Called once, right after `UsersService.create` in `AuthService.register` — SPEC.md §12 Stage 2: "portfolios (создаётся вместе с пользователем)". */
  createDefault(
    userId: Types.ObjectId,
    locale: UserLocale,
  ): Promise<PortfolioDocument> {
    return this.portfolioModel.create({
      userId,
      name: DEFAULT_PORTFOLIO_NAME[locale],
      baseCurrency: 'USD',
      settings: {
        walletsEnabled: false,
        defaultUseCash: false,
        costBasis: 'FIFO',
      },
      recalcFrom: null,
      recalcStatus: 'clean',
    });
  }

  findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<PortfolioDocument | null> {
    return this.portfolioModel.findOne({ userId }).exec();
  }

  async update(
    userId: Types.ObjectId,
    input: UpdatePortfolioInput,
  ): Promise<PortfolioDocument | null> {
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) {
      update.name = input.name;
    }
    if (input.baseCurrency !== undefined) {
      update.baseCurrency = input.baseCurrency;
    }
    if (input.settings?.defaultUseCash !== undefined) {
      update['settings.defaultUseCash'] = input.settings.defaultUseCash;
    }
    if (Object.keys(update).length === 0) {
      return this.findByUserId(userId);
    }
    return this.portfolioModel
      .findOneAndUpdate({ userId }, update, { new: true })
      .exec();
  }
}
