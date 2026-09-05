import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Money } from '../common/money';
import { CustodyPlacesService } from '../custody-places/custody-places.service';
import { AssetIncomeDto } from './dto/asset-income.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset, AssetDocument, AssetIncome } from './schemas/asset.schema';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<Asset>,
    private readonly custodyPlaces: CustodyPlacesService,
  ) {}

  async create(
    portfolioId: Types.ObjectId,
    userId: Types.ObjectId,
    dto: CreateAssetDto,
  ): Promise<AssetDocument> {
    if (dto.custody) {
      await this.custodyPlaces.touch(
        userId,
        dto.custody.country,
        dto.custody.holder,
      );
    }
    return this.assetModel.create({
      portfolioId,
      kind: 'custom',
      type: dto.type,
      name: dto.name,
      currency: dto.currency,
      custody: dto.custody ?? null,
      income: dto.income ? toIncomeDocument(dto.income) : null,
      status: 'open',
      notes: dto.notes ?? null,
    });
  }

  async findAllForPortfolio(
    portfolioId: Types.ObjectId,
  ): Promise<AssetDocument[]> {
    return this.assetModel
      .find({ portfolioId, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOneForPortfolio(
    portfolioId: Types.ObjectId,
    assetId: string,
  ): Promise<AssetDocument> {
    if (!Types.ObjectId.isValid(assetId)) {
      throw new NotFoundException({ code: 'ASSET_NOT_FOUND' });
    }
    const asset = await this.assetModel
      .findOne({ _id: assetId, portfolioId, deletedAt: null })
      .exec();
    if (!asset) {
      throw new NotFoundException({ code: 'ASSET_NOT_FOUND' });
    }
    return asset;
  }

  async update(
    portfolioId: Types.ObjectId,
    userId: Types.ObjectId,
    assetId: string,
    dto: UpdateAssetDto,
  ): Promise<AssetDocument> {
    const asset = await this.findOneForPortfolio(portfolioId, assetId);

    if (dto.name !== undefined) {
      asset.name = dto.name;
    }
    if (dto.currency !== undefined) {
      asset.currency = dto.currency;
    }
    if (dto.custody !== undefined) {
      asset.custody = dto.custody;
      await this.custodyPlaces.touch(
        userId,
        dto.custody.country,
        dto.custody.holder,
      );
    }
    if (dto.income !== undefined) {
      asset.income = toIncomeDocument(dto.income);
    }
    if (dto.status !== undefined) {
      asset.status = dto.status;
    }
    if (dto.notes !== undefined) {
      asset.notes = dto.notes;
    }

    await asset.save();
    return asset;
  }

  async softDelete(
    portfolioId: Types.ObjectId,
    assetId: string,
  ): Promise<void> {
    const asset = await this.findOneForPortfolio(portfolioId, assetId);
    asset.deletedAt = new Date();
    await asset.save();
  }
}

/** Converts the wire DTO to the stored sub-document, deriving `anchorDay` from `firstAccrualDate` (SPEC.md §4.7 — never taken directly from the client). */
function toIncomeDocument(dto: AssetIncomeDto): AssetIncome {
  const firstAccrualDate = dto.firstAccrualDate
    ? new Date(dto.firstAccrualDate)
    : null;
  return {
    enabled: dto.enabled,
    autoPost: dto.autoPost ?? false,
    incomeType: dto.enabled ? (dto.incomeType ?? null) : null,
    rateType: dto.enabled ? (dto.rateType ?? null) : null,
    rate: dto.rate ? Money.of(dto.rate).toDecimal128() : null,
    period: dto.enabled && dto.period ? dto.period : null,
    anchorDay:
      dto.enabled && firstAccrualDate ? firstAccrualDate.getUTCDate() : null,
    endOfMonth: dto.endOfMonth ?? false,
    firstAccrualDate,
    maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : null,
    reinvest: dto.reinvest ?? false,
    taxRate: dto.taxRate ? Money.of(dto.taxRate).toDecimal128() : null,
    toCash: dto.toCash ?? false,
    dayCount: dto.dayCount ?? 'ACT/365',
  };
}
