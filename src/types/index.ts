// =============================================================================
// NestEgg - src/types/index.ts
// Shared TypeScript types mirroring the backend Pydantic models.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ReturnScenario = 'conservative' | 'base' | 'optimistic'
export type AccountType = 'hysa' | 'brokerage' | 'roth_ira' | 'traditional_401k' | 'roth_401k'
export type SolveMode = 'fixed' | 'solve_for'
export type ProjectionPhase = 'accumulation' | 'bridge' | 'distribution'
export type PersonRole = 'primary' | 'spouse'

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

export interface Scenario {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface ScenarioCreate {
  name: string
  description?: string
}

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

export interface Person {
  id: number
  scenario_id: number
  role: PersonRole
  birth_year: number
  birth_month: number
  planned_retirement_age: number
}

export interface PersonCreate {
  role: PersonRole
  birth_year: number
  birth_month?: number
  planned_retirement_age: number
}

// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------

export interface Assumptions {
  id: number
  scenario_id: number
  inflation_rate: number
  plan_to_age: number
  filing_status: 'married_filing_jointly'
  current_income: number
  desired_retirement_income: number
  healthcare_annual_cost: number
  enable_catchup_contributions: boolean
  enable_roth_ladder: boolean
  return_scenario: ReturnScenario
}

export interface AssumptionsCreate {
  inflation_rate: number
  plan_to_age: number
  filing_status: 'married_filing_jointly'
  current_income: number
  desired_retirement_income: number
  healthcare_annual_cost: number
  enable_catchup_contributions: boolean
  enable_roth_ladder: boolean
  return_scenario: ReturnScenario
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export interface Account {
  id: number
  scenario_id: number
  account_type: AccountType
  label: string | null
  current_balance: number
  return_conservative: number
  return_base: number
  return_optimistic: number
}

export interface AccountCreate {
  account_type: AccountType
  label?: string
  current_balance: number
  return_conservative: number
  return_base: number
  return_optimistic: number
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export interface Contribution {
  id: number
  account_id: number
  annual_amount: number
  employer_match_amount: number
  enforce_irs_limits: boolean
  solve_mode: SolveMode
}

export interface ContributionCreate {
  annual_amount: number
  employer_match_amount: number
  enforce_irs_limits: boolean
  solve_mode: SolveMode
}

// ---------------------------------------------------------------------------
// Social Security
// ---------------------------------------------------------------------------

export interface SSEarningsRow {
  year: number
  earnings: number
}

export interface SSClaiming {
  id: number
  person_id: number
  claim_age_years: number
  claim_age_months: number
  use_spousal_benefit: boolean
  spousal_benefit_pct: number
}

export interface SSClaimingCreate {
  claim_age_years: number
  claim_age_months: number
  use_spousal_benefit: boolean
  spousal_benefit_pct: number
}

export interface SSBenefitEstimate {
  claim_age_years: number
  claim_age_months: number
  fra_years: number
  fra_months: number
  aime: number
  pia: number
  monthly_benefit: number
  annual_benefit: number
  adjustment_factor: number
  is_early: boolean
  is_late: boolean
  months_from_fra: number
}

export interface SSClaimingComparison {
  early: SSBenefitEstimate
  fra: SSBenefitEstimate
  late: SSBenefitEstimate
}

// ---------------------------------------------------------------------------
// Roth Conversions
// ---------------------------------------------------------------------------

export interface RothConversionOverride {
  plan_year: number
  amount: number
}

export interface RothConversion extends RothConversionOverride {
  id: number
  scenario_id: number
  source_account: string
  is_optimizer_suggested: boolean
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface AccountBalances {
  hysa: number
  brokerage: number
  roth_ira: number
  traditional_401k: number
  roth_401k: number
  total_pretax: number
  total_posttax: number
  total: number
}

export interface YearWithdrawals {
  hysa: number
  brokerage: number
  roth_ira: number
  traditional_401k: number
  roth_401k: number
  roth_conversion: number
}

export interface YearContributions {
  traditional_401k: number
  roth_401k: number
  roth_ira: number
  employer_match: number
}

export interface TaxSummary {
  ordinary_taxable_income: number
  standard_deduction: number
  tax_owed: number
  effective_rate: number
  marginal_rate: number
  ltcg_tax: number
  niit: number
  ss_taxable_amount: number
  total_tax: number
  total_effective_rate: number
}

export interface ProjectionYear {
  calendar_year: number
  age_primary: number
  age_spouse: number | null
  phase: ProjectionPhase
  balances_start: AccountBalances
  balances_end: AccountBalances
  contributions: YearContributions
  withdrawals: YearWithdrawals
  ss_primary: number
  ss_spouse: number
  healthcare_cost: number
  tax: TaxSummary | null
  gross_income: number
  net_income: number
  income_target: number
  income_gap: number
  roth_ladder_conversion: number
  roth_available_principal: number
  is_depleted: boolean
  notes: string[]
}

export interface ProjectionResult {
  scenario_id: number
  return_scenario: ReturnScenario
  years: ProjectionYear[]
  depletion_year: number | null
  depletion_age: number | null
  final_balance: number
  total_tax_paid: number
  total_ss_received: number
  success: boolean
}

// ---------------------------------------------------------------------------
// Optimizer
// ---------------------------------------------------------------------------

export interface OptimizedStrategy {
  primary_ss_claim_age_years: number
  primary_ss_claim_age_months: number
  primary_ss_claim_label: string
  spouse_ss_claim_age_years: number | null
  spouse_ss_claim_age_months: number | null
  spouse_ss_claim_label: string | null
  roth_ladder_enabled: boolean
  roth_ladder_target_bracket: number
  portfolio_survives: boolean
  residual_balance: number
  total_tax_saved_vs_no_ladder: number | null
  rationale: string[]
  projection: ProjectionResult
}

// ---------------------------------------------------------------------------
// Full scenario (load/save)
// ---------------------------------------------------------------------------

export interface FullScenario {
  scenario: Scenario
  assumptions: Assumptions | null
  persons: Person[]
  accounts: Account[]
  contributions: Contribution[]
  ss_claiming: SSClaiming[]
  roth_overrides: RothConversion[]
}

// ---------------------------------------------------------------------------
// Contribution Planner
// ---------------------------------------------------------------------------

export interface ContributionPlanRequest {
  scenario_id: number
  return_scenario?: 'conservative' | 'base' | 'optimistic'
  include_traditional_401k: boolean
  include_roth_401k: boolean
  include_roth_ira: boolean
  include_hysa: boolean
  include_brokerage: boolean
}

export interface ContributionPlanResult {
  solved: boolean
  traditional_401k_annual: number
  roth_401k_annual: number
  roth_ira_annual: number
  hysa_annual: number
  brokerage_annual: number
  employer_match_annual: number
  total_annual_contribution: number
  limit_traditional_401k: number
  limit_roth_401k: number
  limit_roth_ira: number
  projection: ProjectionResult | null
  iterations: number
  notes: string[]
}

// ---------------------------------------------------------------------------
// Tax
// ---------------------------------------------------------------------------

export interface TaxBracket {
  rate: number
  income_min: number
  income_max: number | null
}

export interface TaxBracketsResponse {
  tax_year: number
  filing_status: string
  standard_deduction: number
  brackets: TaxBracket[]
}
