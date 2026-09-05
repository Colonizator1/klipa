import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateFxRateDto } from './dto/create-fx-rate.dto';
import { ListFxRatesQueryDto } from './dto/list-fx-rates-query.dto';
import { FxRatesService } from './fx-rates.service';
import type { FxRateDocument } from './schemas/fx-rate.schema';

interface FxRateResponse {
  id: string;
  base: string;
  quote: string;
  date: Date;
  rate: string;
  source: string;
}

function toResponse(fxRate: FxRateDocument): FxRateResponse {
  return {
    id: fxRate._id.toString(),
    base: fxRate.base,
    quote: fxRate.quote,
    date: fxRate.date,
    rate: fxRate.rate.toString(),
    source: fxRate.source,
  };
}

// D-24/§12 Stage 2: no providers yet — an admin enters rates by hand, which
// is the only way the app gets any multi-currency data at all right now.
@Controller('admin/fx-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class FxRatesController {
  constructor(private readonly fxRatesService: FxRatesService) {}

  @Get()
  async list(@Query() query: ListFxRatesQueryDto): Promise<FxRateResponse[]> {
    const rates = await this.fxRatesService.findAll(query);
    return rates.map(toResponse);
  }

  @Post()
  async create(@Body() dto: CreateFxRateDto): Promise<FxRateResponse> {
    const rate = await this.fxRatesService.upsert(dto);
    return toResponse(rate);
  }
}
