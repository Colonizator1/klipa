import Decimal from 'decimal.js';

// SPEC.md §5.7: internal math at 20 significant digits, half-up rounding.
// Applied once, globally, so every Money/Qty instance shares the same context.
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
