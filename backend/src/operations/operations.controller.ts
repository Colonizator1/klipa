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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CreateOperationDto } from './dto/create-operation.dto';
import { ListOperationsQueryDto } from './dto/list-operations-query.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import { OperationsService } from './operations.service';
import type { OperationDocument } from './schemas/operation.schema';

export interface OperationResponse {
  id: string;
  assetId: string;
  date: Date;
  seq: number;
  type: string;
  quantity: string | null;
  price: string | null;
  amount: string;
  currency: string;
  fee: string | null;
  feeCurrency: string | null;
  useCash: boolean;
  tax: string | null;
  taxCurrency: string | null;
  status: string;
  source: string;
  notes: string | null;
}

export function toOperationResponse(
  operation: OperationDocument,
): OperationResponse {
  return {
    id: operation._id.toString(),
    assetId: operation.assetId.toString(),
    date: operation.date,
    seq: operation.seq,
    type: operation.type,
    quantity: operation.quantity ? operation.quantity.toString() : null,
    price: operation.price ? operation.price.toString() : null,
    amount: operation.amount.toString(),
    currency: operation.currency,
    fee: operation.fee ? operation.fee.toString() : null,
    feeCurrency: operation.feeCurrency,
    useCash: operation.useCash,
    tax: operation.tax ? operation.tax.toString() : null,
    taxCurrency: operation.taxCurrency,
    status: operation.status,
    source: operation.source,
    notes: operation.notes,
  };
}

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(
    private readonly operationsService: OperationsService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListOperationsQueryDto,
  ): Promise<OperationResponse[]> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    const operations = await this.operationsService.findAllForPortfolio(
      portfolio._id,
      query,
    );
    return operations.map(toOperationResponse);
  }

  @Post()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateOperationDto,
  ): Promise<OperationResponse> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    const operation = await this.operationsService.create(portfolio._id, dto);
    return toOperationResponse(operation);
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOperationDto,
  ): Promise<OperationResponse> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    const operation = await this.operationsService.update(
      portfolio._id,
      id,
      dto,
    );
    return toOperationResponse(operation);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    const portfolio = await this.requirePortfolio(currentUser.id);
    await this.operationsService.softDelete(portfolio._id, id);
  }

  private async requirePortfolio(userId: string) {
    const portfolio = await this.portfoliosService.findByUserId(userId);
    if (!portfolio) {
      throw new NotFoundException({ code: 'PORTFOLIO_NOT_FOUND' });
    }
    return portfolio;
  }
}
