import { Types } from 'mongoose';
import { Decimal } from './decimal-config';
import { DecimalValue } from './decimal-value';

export class Qty extends DecimalValue {
  static of(value: Decimal.Value): Qty {
    return new Qty(value);
  }

  static zero(): Qty {
    return new Qty(0);
  }

  static fromDecimal128(
    value: Types.Decimal128 | string | null | undefined,
  ): Qty {
    return new Qty(value ? value.toString() : 0);
  }

  protected create(value: Decimal): this {
    return new Qty(value) as this;
  }
}
