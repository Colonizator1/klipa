/** SPEC.md D-24 — currencies fixed for MVP. Order matters only for display. */
export const CURRENCIES = ['USD', 'EUR', 'RUB', 'BYN', 'PLN'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}
