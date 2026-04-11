// =============================================================================
// NestEgg - src/utils/inflationUtils.ts
// Today's dollars ↔ nominal conversion helpers (mirrors engine/inflation.py).
// =============================================================================

export function inflate(amount: number, rate: number, years: number): number {
  return amount * Math.pow(1 + rate, years)
}

export function deflate(amount: number, rate: number, years: number): number {
  return amount / Math.pow(1 + rate, years)
}

export function realReturn(nominalReturn: number, inflationRate: number): number {
  return (1 + nominalReturn) / (1 + inflationRate) - 1
}

/** Convert a future nominal amount to today's purchasing power */
export function toTodayDollars(
  nominalAmount: number,
  inflationRate: number,
  years: number
): number {
  return deflate(nominalAmount, inflationRate, years)
}
