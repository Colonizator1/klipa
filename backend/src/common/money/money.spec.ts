import { Types } from 'mongoose';
import { Money } from './money';

describe('Money', () => {
  it('keeps decimal precision that a float would lose', () => {
    const total = Money.of('0.1').plus('0.2');
    expect(total.toString()).toBe('0.3');
  });

  it('round-trips through Decimal128', () => {
    const money = Money.of('1234.56');
    const decimal128 = money.toDecimal128();
    expect(decimal128).toBeInstanceOf(Types.Decimal128);
    expect(Money.fromDecimal128(decimal128).equals(money)).toBe(true);
  });

  it('serializes to a string in JSON, never a number', () => {
    expect(JSON.stringify({ amount: Money.of('9.99') })).toBe(
      '{"amount":"9.99"}',
    );
  });

  it('rounds half-up to a given number of decimal places', () => {
    expect(Money.of('2.005').round(2).toString()).toBe('2.01');
  });

  it('computes costPerUnit-style division without precision loss', () => {
    const costPerUnit = Money.of('100').plus('1.5').dividedBy('3');
    expect(costPerUnit.toString()).toBe('33.833333333333333333');
  });

  it('zero() is zero and comparisons work', () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.of('5').greaterThan(Money.of('3'))).toBe(true);
    expect(Money.of('5').lessThan('3')).toBe(false);
  });
});
