import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OperationsService } from './operations.service';
import { CreateOperationDto } from './dto/create-operation.dto';

interface FakeRow {
  _id: Types.ObjectId;
  portfolioId: Types.ObjectId;
  assetId: Types.ObjectId;
  date: Date;
  seq: number;
  type: string;
  quantity: { toString: () => string } | null;
  price: { toString: () => string } | null;
  amount: { toString: () => string };
  currency: string;
  fee: unknown;
  feeCurrency: unknown;
  useCash: boolean;
  tax: unknown;
  taxCurrency: unknown;
  status: string;
  source: string;
  notes: string | null;
  deletedAt: Date | null;
  save: () => Promise<void>;
}

function makeFakeOperationModel() {
  const rows: FakeRow[] = [];
  const model = {
    rows,
    create: jest.fn((doc: Partial<FakeRow>) => {
      const row = {
        _id: new Types.ObjectId(),
        deletedAt: null,
        save: () => Promise.resolve(),
        ...doc,
      } as FakeRow;
      rows.push(row);
      return Promise.resolve(row);
    }),
    findOne: jest.fn((query: Record<string, unknown>) => ({
      sort: () => ({
        exec: () => Promise.resolve(matchOne(rows, query)),
      }),
      exec: () => Promise.resolve(matchOne(rows, query)),
    })),
    find: jest.fn(() => ({
      sort: () => ({ exec: () => Promise.resolve(rows) }),
    })),
  };
  return model;
}

function matchOne(
  rows: FakeRow[],
  query: Record<string, unknown>,
): FakeRow | null {
  const candidates = rows.filter((row) => {
    if (query.portfolioId && row.portfolioId !== query.portfolioId)
      return false;
    if (query.date && row.date.getTime() !== (query.date as Date).getTime())
      return false;
    return true;
  });
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

function makeService(assetExists = true) {
  const operationModel = makeFakeOperationModel();
  const assetsService = {
    findOneForPortfolio: jest.fn(() => {
      if (!assetExists) {
        throw new NotFoundException({ code: 'ASSET_NOT_FOUND' });
      }
      return Promise.resolve({ _id: new Types.ObjectId() });
    }),
  };
  const service = new OperationsService(
    operationModel as never,
    assetsService as never,
  );
  return { service, operationModel };
}

const portfolioId = new Types.ObjectId();
const assetId = new Types.ObjectId().toString();

function buyDto(
  overrides: Partial<CreateOperationDto> = {},
): CreateOperationDto {
  return {
    assetId,
    date: '2024-01-15',
    type: 'BUY',
    quantity: '10',
    price: '100',
    currency: 'USD',
    ...overrides,
  };
}

describe('OperationsService', () => {
  describe('create', () => {
    it('derives amount = quantity × price for BUY, ignoring a client-sent amount', async () => {
      const { service } = makeService();
      const operation = await service.create(
        portfolioId,
        buyDto({ amount: '999999' }),
      );
      expect(operation.amount.toString()).toBe('1000');
    });

    it('throws OPERATION_FIELD_REQUIRED when price is missing for a BUY', async () => {
      const { service } = makeService();
      await expect(
        service.create(portfolioId, buyDto({ price: undefined })),
      ).rejects.toMatchObject({
        response: { code: 'OPERATION_FIELD_REQUIRED' },
      });
    });

    it('throws OPERATION_FIELD_REQUIRED when amount is missing for INCOME', async () => {
      const { service } = makeService();
      await expect(
        service.create(portfolioId, {
          assetId,
          date: '2024-01-15',
          type: 'INCOME',
          currency: 'USD',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an asset that does not belong to the portfolio', async () => {
      const { service } = makeService(false);
      await expect(
        service.create(portfolioId, buyDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('assigns increasing seq for operations on the same day', async () => {
      const { service } = makeService();
      const first = await service.create(portfolioId, buyDto());
      const second = await service.create(portfolioId, buyDto());
      expect(second.seq).toBe(first.seq + 1);
    });

    it('normalizes the date to UTC midnight', async () => {
      const { service } = makeService();
      const operation = await service.create(
        portfolioId,
        buyDto({ date: '2024-01-15T18:30:00.000Z' }),
      );
      expect(operation.date.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });
  });
});
