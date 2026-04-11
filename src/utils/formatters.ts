// =============================================================================
// NestEgg - src/utils/formatters.ts
// Currency, percentage, age, and year formatting helpers.
// =============================================================================

export function formatCurrency(
  value: number,
  opts: { compact?: boolean; decimals?: number } = {}
): string {
  const { compact = false, decimals = 0 } = opts

  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`
    }
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatAge(years: number, months = 0): string {
  if (months === 0) return `${years}`
  return `${years}y ${months}m`
}

export function formatYear(year: number): string {
  return year.toString()
}

export function formatDelta(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCurrency(value)}`
}

export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

/** Returns a CSS color string for income gap (positive = good, negative = shortfall) */
export function gapColor(gap: number): string {
  if (gap >= 0) return 'var(--color-positive)'
  return 'var(--color-negative)'
}

/** Format a number with commas, no currency symbol */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
