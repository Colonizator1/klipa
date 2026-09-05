import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import type { AssetDocument } from './schemas/asset.schema';

interface AssetResponse {
  id: string;
  kind: string;
  type: string | null;
  name: string;
  currency: string;
  custody: { country: string; holder: string } | null;
  income: unknown;
  status: string;
  notes: string | null;
  createdAt: Date;
}

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AssetResponse[]> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    const assets = await this.assetsService.findAllForPortfolio(portfolio._id);
    return assets.map((asset) => this.toResponse(asset));
  }

  @Post()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateAssetDto,
  ): Promise<AssetResponse> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    const asset = await this.assetsService.create(
      portfolio._id,
      new Types.ObjectId(currentUser.id),
      dto,
    );
    return this.toResponse(asset);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AssetResponse> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    const asset = await this.assetsService.findOneForPortfolio(
      portfolio._id,
      id,
    );
    return this.toResponse(asset);
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetResponse> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    const asset = await this.assetsService.update(
      portfolio._id,
      new Types.ObjectId(currentUser.id),
      id,
      dto,
    );
    return this.toResponse(asset);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    await this.assetsService.softDelete(portfolio._id, id);
  }

  private async requirePortfolio(userId: string) {
    const portfolio = await this.portfoliosService.findByUserId(userId);
    if (!portfolio) {
      throw new NotFoundException({ code: 'PORTFOLIO_NOT_FOUND' });
    }
    return portfolio;
  }

  private toResponse(asset: AssetDocument): AssetResponse {
    return {
      id: asset._id.toString(),
      kind: asset.kind,
      type: asset.type,
      name: asset.name,
      currency: asset.currency,
      custody: asset.custody
        ? { country: asset.custody.country, holder: asset.custody.holder }
        : null,
      income: asset.income ? serializeIncome(asset.income) : null,
      status: asset.status,
      notes: asset.notes,
      createdAt: asset.get('createdAt') as Date,
    };
  }
}

function serializeIncome(
  income: NonNullable<AssetDocument['income']>,
): unknown {
  return {
    enabled: income.enabled,
    autoPost: income.autoPost,
    incomeType: income.incomeType,
    rateType: income.rateType,
    rate: income.rate ? income.rate.toString() : null,
    period: income.period,
    anchorDay: income.anchorDay,
    endOfMonth: income.endOfMonth,
    firstAccrualDate: income.firstAccrualDate,
    maturityDate: income.maturityDate,
    reinvest: income.reinvest,
    taxRate: income.taxRate ? income.taxRate.toString() : null,
    toCash: income.toCash,
    dayCount: income.dayCount,
  };
}
