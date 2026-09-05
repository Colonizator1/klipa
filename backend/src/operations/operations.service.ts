import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssetsService } from '../assets/assets.service';
import { Money, Qty } from '../common/money';
import { CreateOperationDto } from './dto/create-operation.dto';
import { ListOperationsQueryDto } from './dto/list-operations-query.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import {
  CreatableOperationType,
  Operation,
  OperationDocument,
} from './schemas/operation.schema';

const QUANTITY_TYPES: CreatableOperationType[] = ['BUY', 'SELL'];
const AMOUNT_TYPES: CreatableOperationType[] = [
  'INCOME',
  'FEE',
  'REVALUATION',
  'PRINCIPAL_IN',
];

/** UTC-midnight, per SPEC.md §4 ("даты операций — дата без времени"). */
function toDateOnly(value: string | Date): Date {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

@Injectable()
export class OperationsService {
  constructor(
    @InjectModel(Operation.name)
    private readonly operationModel: Model<Operation>,
    private readonly assetsService: AssetsService,
  ) {}

  async create(
    portfolioId: Types.ObjectId,
    dto: CreateOperationDto,
  ): Promise<OperationDocument> {
    await this.assertAssetBelongsToPortfolio(portfolioId, dto.assetId);
    this.validateCreatePayload(dto);

    const date = toDateOnly(dto.date);
    const seq = await this.nextSeq(portfolioId, date);
    const amount = this.computeAmount(dto);

    return this.operationModel.create({
      portfolioId,
      assetId: new Types.ObjectId(dto.assetId),
      date,
      seq,
      type: dto.type,
      quantity: dto.quantity ? Qty.of(dto.quantity).toDecimal128() : null,
      price: dto.price ? Money.of(dto.price).toDecimal128() : null,
      amount: amount.toDecimal128(),
      currency: dto.currency,
      fee: dto.fee ? Money.of(dto.fee).toDecimal128() : null,
      feeCurrency: dto.feeCurrency ?? null,
      useCash: dto.useCash ?? false,
      tax: dto.tax ? Money.of(dto.tax).toDecimal128() : null,
      taxCurrency: dto.taxCurrency ?? null,
      status: 'normal',
      source: 'manual',
      notes: dto.notes ?? null,
    });
  }

  async findAllForPortfolio(
    portfolioId: Types.ObjectId,
    filters: ListOperationsQueryDto,
  ): Promise<OperationDocument[]> {
    const query: Record<string, unknown> = { portfolioId, deletedAt: null };
    if (filters.assetId) {
      query.assetId = new Types.ObjectId(filters.assetId);
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.$gte = toDateOnly(filters.from);
      if (filters.to) range.$lte = toDateOnly(filters.to);
      query.date = range;
    }
    return this.operationModel.find(query).sort({ date: -1, seq: -1 }).exec();
  }

  findAllForAsset(
    portfolioId: Types.ObjectId,
    assetId: string,
  ): Promise<OperationDocument[]> {
    return this.operationModel
      .find({
        portfolioId,
        assetId: new Types.ObjectId(assetId),
        deletedAt: null,
      })
      .sort({ date: -1, seq: -1 })
      .exec();
  }

  async findOneForPortfolio(
    portfolioId: Types.ObjectId,
    id: string,
  ): Promise<OperationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({ code: 'OPERATION_NOT_FOUND' });
    }
    const operation = await this.operationModel
      .findOne({ _id: id, portfolioId, deletedAt: null })
      .exec();
    if (!operation) {
      throw new NotFoundException({ code: 'OPERATION_NOT_FOUND' });
    }
    return operation;
  }

  async update(
    portfolioId: Types.ObjectId,
    id: string,
    dto: UpdateOperationDto,
  ): Promise<OperationDocument> {
    const operation = await this.findOneForPortfolio(portfolioId, id);
    const type = operation.type as CreatableOperationType;

    if (dto.date !== undefined) {
      operation.date = toDateOnly(dto.date);
      operation.seq = await this.nextSeq(portfolioId, operation.date, id);
    }
    if (dto.currency !== undefined) {
      operation.currency = dto.currency;
    }
    if (dto.quantity !== undefined) {
      operation.quantity = Qty.of(dto.quantity).toDecimal128();
    }
    if (dto.price !== undefined) {
      operation.price = Money.of(dto.price).toDecimal128();
    }
    if (dto.amount !== undefined && !QUANTITY_TYPES.includes(type)) {
      operation.amount = Money.of(dto.amount).toDecimal128();
    }
    if (dto.fee !== undefined) {
      operation.fee = Money.of(dto.fee).toDecimal128();
    }
    if (dto.feeCurrency !== undefined) {
      operation.feeCurrency = dto.feeCurrency;
    }
    if (dto.useCash !== undefined) {
      operation.useCash = dto.useCash;
    }
    if (dto.tax !== undefined) {
      operation.tax = Money.of(dto.tax).toDecimal128();
    }
    if (dto.taxCurrency !== undefined) {
      operation.taxCurrency = dto.taxCurrency;
    }
    if (dto.notes !== undefined) {
      operation.notes = dto.notes;
    }

    if (QUANTITY_TYPES.includes(type)) {
      this.requireFields(type, {
        quantity: operation.quantity
          ? operation.quantity.toString()
          : undefined,
        price: operation.price ? operation.price.toString() : undefined,
      });
      // Re-derive, per SPEC.md §4.8 — never trust a client-sent `amount` for BUY/SELL.
      const quantity = Qty.fromDecimal128(operation.quantity);
      const price = Money.fromDecimal128(operation.price);
      operation.amount = Money.of(quantity.toDecimal())
        .times(price.toDecimal())
        .toDecimal128();
    } else {
      this.requireFields(type, {
        amount: operation.amount ? operation.amount.toString() : undefined,
      });
    }

    await operation.save();
    return operation;
  }

  async softDelete(portfolioId: Types.ObjectId, id: string): Promise<void> {
    const operation = await this.findOneForPortfolio(portfolioId, id);
    operation.deletedAt = new Date();
    await operation.save();
  }

  private computeAmount(dto: CreateOperationDto): Money {
    if (QUANTITY_TYPES.includes(dto.type)) {
      // Server-derived, per SPEC.md §4.8: "amount = quantity × price для
      // сделок" — any client-sent `amount` for BUY/SELL is ignored.
      return Money.of(dto.quantity!).times(dto.price!);
    }
    return Money.of(dto.amount!);
  }

  private validateCreatePayload(dto: CreateOperationDto): void {
    if (QUANTITY_TYPES.includes(dto.type)) {
      this.requireFields(dto.type, {
        quantity: dto.quantity,
        price: dto.price,
      });
    } else if (AMOUNT_TYPES.includes(dto.type)) {
      this.requireFields(dto.type, { amount: dto.amount });
    }
  }

  private requireFields(
    type: CreatableOperationType,
    fields: Record<string, string | undefined>,
  ): void {
    for (const [field, value] of Object.entries(fields)) {
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException({
          code: 'OPERATION_FIELD_REQUIRED',
          details: { type, field },
        });
      }
    }
  }

  private async assertAssetBelongsToPortfolio(
    portfolioId: Types.ObjectId,
    assetId: string,
  ): Promise<void> {
    // Throws NotFoundException on a bad/foreign id — deliberately let that
    // surface as-is rather than translating to a different code here.
    await this.assetsService.findOneForPortfolio(portfolioId, assetId);
  }

  private async nextSeq(
    portfolioId: Types.ObjectId,
    date: Date,
    excludeId?: string,
  ): Promise<number> {
    const query: Record<string, unknown> = { portfolioId, date };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const last = await this.operationModel
      .findOne(query)
      .sort({ seq: -1 })
      .exec();
    return last ? last.seq + 1 : 0;
  }
}
