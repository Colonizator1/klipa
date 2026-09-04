import { Types } from 'mongoose';
import { Decimal } from './decimal-config';
import { DecimalValue } from './decimal-value';

export class Money extends DecimalValue {
  static of(value: Decimal.Value): Money {
    return new Money(value);
  }

  static zero(): Money {
    return new Money(0);
  }

  static fromDecimal128(
    value: Types.Decimal128 | string | null | undefined,
  ): Money {
    return new Money(value ? value.toString() : 0);
  }

  protected create(value: Decimal): this {
    return new Money(value) as this;
  }
}
