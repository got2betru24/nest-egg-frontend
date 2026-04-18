// =============================================================================
// NestEgg - src/constants/defaults.ts
// Default values for new scenario provisioning and input field fallbacks.
// Single source of truth — imported by ScenarioBar (creation) and
// InputsPage (field display fallbacks).
// =============================================================================

import type { AccountType } from "../types";

// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------

export const DEFAULT_INFLATION_RATE = 0.03;
export const DEFAULT_PLAN_TO_AGE = 90;
export const DEFAULT_RETURN_SCENARIO = "base" as const;

// ---------------------------------------------------------------------------
// Persons
// ---------------------------------------------------------------------------

export const DEFAULT_PRIMARY_AGE_OFFSET = 40; // currentYear - offset = birth year
export const DEFAULT_SPOUSE_AGE_OFFSET = 40;
export const DEFAULT_RETIREMENT_AGE = 55;

// ---------------------------------------------------------------------------
// Account base returns by return scenario.
// Conservative/optimistic are derived as ±3% from base everywhere they're used.
// ---------------------------------------------------------------------------

export const SCENARIO_BASE_RETURNS: Record<string, Record<AccountType, number>> = {
  conservative: {
    hysa: 0.03,
    brokerage: 0.05,
    roth_ira: 0.05,
    traditional_401k: 0.05,
    roth_401k: 0.05,
  },
  base: {
    hysa: 0.04,
    brokerage: 0.07,
    roth_ira: 0.07,
    traditional_401k: 0.07,
    roth_401k: 0.07,
  },
  optimistic: {
    hysa: 0.05,
    brokerage: 0.10,
    roth_ira: 0.10,
    traditional_401k: 0.10,
    roth_401k: 0.10,
  },
};
