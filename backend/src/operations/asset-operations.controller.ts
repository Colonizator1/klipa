import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { OperationsService } from './operations.service';
import {
  OperationResponse,
  toOperationResponse,
} from './operations.controller';

// SPEC.md §8: `GET /assets/:id/operations` — a separate controller (rather
// than a method on AssetsController) so AssetsModule never has to depend on
// OperationsModule; only OperationsModule depends on AssetsModule (for
// asset-existence checks on create), never the other way around.
@Controller('assets/:assetId/operations')
@UseGuards(JwtAuthGuard)
export class AssetOperationsController {
  constructor(
    private readonly operationsService: OperationsService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('assetId') assetId: string,
  ): Promise<OperationResponse[]> {
    const portfolio = await this.portfoliosService.findByUserId(currentUser.id);
    if (!portfolio) {
      throw new NotFoundException({ code: 'PORTFOLIO_NOT_FOUND' });
    }
    const operations = await this.operationsService.findAllForAsset(
      portfolio._id,
      assetId,
    );
    return operations.map(toOperationResponse);
  }
}
