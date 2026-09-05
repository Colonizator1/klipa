import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { PortfoliosService } from './portfolios.service';
import type { PortfolioDocument } from './schemas/portfolio.schema';

interface PortfolioResponse {
  id: string;
  name: string;
  baseCurrency: string;
  settings: {
    walletsEnabled: boolean;
    defaultUseCash: boolean;
    costBasis: string;
  };
  recalcStatus: string;
}

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  async getPortfolio(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PortfolioResponse> {
    const portfolio = await this.portfoliosService.findByUserId(currentUser.id);
    if (!portfolio) {
      throw new NotFoundException({ code: 'PORTFOLIO_NOT_FOUND' });
    }
    return this.toResponse(portfolio);
  }

  @Patch()
  async updatePortfolio(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdatePortfolioDto,
  ): Promise<PortfolioResponse> {
    const portfolio = await this.portfoliosService.update(
      new Types.ObjectId(currentUser.id),
      dto,
    );
    if (!portfolio) {
      throw new NotFoundException({ code: 'PORTFOLIO_NOT_FOUND' });
    }
    return this.toResponse(portfolio);
  }

  private toResponse(portfolio: PortfolioDocument): PortfolioResponse {
    return {
      id: portfolio._id.toString(),
      name: portfolio.name,
      baseCurrency: portfolio.baseCurrency,
      settings: {
        walletsEnabled: portfolio.settings.walletsEnabled,
        defaultUseCash: portfolio.settings.defaultUseCash,
        costBasis: portfolio.settings.costBasis,
      },
      recalcStatus: portfolio.recalcStatus,
    };
  }
}
