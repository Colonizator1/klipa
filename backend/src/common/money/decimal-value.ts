import { Types } from 'mongoose';
import { Decimal } from './decimal-config';

/**
 * Base for Money and Qty. Never used directly — SPEC.md D-05 keeps money and
 * quantities as distinct types on purpose, so `plus`/`comparedTo`/etc. only
 * accept the same concrete subclass (or a raw Decimal.Value), which stops a
 * Money accidentally being added to a Qty at compile time.
 */
export abstract class DecimalValue {
  protected readonly value: Decimal;

  constructor(value: Decimal.Value | DecimalValue) {
    this.value =
      value instanceof DecimalValue ? value.value : new Decimal(value);
  }

  protected abstract create(value: Decimal): this;

  private resolve(other: Decimal.Value | this): Decimal {
    return other instanceof DecimalValue ? other.value : new Decimal(other);
  }

  plus(other: Decimal.Value | this): this {
    return this.create(this.value.plus(this.resolve(other)));
  }

  minus(other: Decimal.Value | this): this {
    return this.create(this.value.minus(this.resolve(other)));
  }

  times(factor: Decimal.Value): this {
    return this.create(this.value.times(factor));
  }

  dividedBy(divisor: Decimal.Value): this {
    return this.create(this.value.dividedBy(divisor));
  }

  negated(): this {
    return this.create(this.value.negated());
  }

  abs(): this {
    return this.create(this.value.abs());
  }

  round(decimalPlaces: number): this {
    return this.create(
      this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP),
    );
  }

  comparedTo(other: Decimal.Value | this): number {
    return this.value.comparedTo(this.resolve(other));
  }

  equals(other: Decimal.Value | this): boolean {
    return this.value.equals(this.resolve(other));
  }

  greaterThan(other: Decimal.Value | this): boolean {
    return this.value.greaterThan(this.resolve(other));
  }

  lessThan(other: Decimal.Value | this): boolean {
    return this.value.lessThan(this.resolve(other));
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  toDecimal(): Decimal {
    return this.value;
  }

  toDecimal128(): Types.Decimal128 {
    return Types.Decimal128.fromString(this.value.toFixed());
  }

  toString(): string {
    return this.value.toFixed();
  }

  toJSON(): string {
    return this.value.toFixed();
  }

  /** Display-only escape hatch (e.g. Chart.js). Never feed the result back into money math. */
  toNumber(): number {
    return this.value.toNumber();
  }
}
