// =============================================================================
// NestEgg - src/api.ts
// All typed API calls to the FastAPI backend.
// =============================================================================

import axios from 'axios'
import type {
  Account,
  AccountCreate,
  Assumptions,
  AssumptionsCreate,
  Contribution,
  ContributionCreate,
  ContributionPlanRequest,
  ContributionPlanResult,
  FullScenario,
  OptimizedStrategy,
  Person,
  PersonCreate,
  ProjectionResult,
  RothConversion,
  RothConversionOverride,
  SSBenefitEstimate,
  SSClaiming,
  SSClaimingCreate,
  SSClaimingComparison,
  Scenario,
  ScenarioCreate,
  TaxBracketsResponse,
} from './types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const scenarioApi = {
  list: (): Promise<Scenario[]> =>
    api.get('/scenarios/').then(r => r.data),

  create: (body: ScenarioCreate): Promise<Scenario> =>
    api.post('/scenarios/', body).then(r => r.data),

  get: (id: number): Promise<Scenario> =>
    api.get(`/scenarios/${id}`).then(r => r.data),

  update: (id: number, body: Partial<ScenarioCreate>): Promise<Scenario> =>
    api.patch(`/scenarios/${id}`, body).then(r => r.data),

  delete: (id: number): Promise<{ message: string }> =>
    api.delete(`/scenarios/${id}`).then(r => r.data),

  duplicate: (id: number): Promise<Scenario> =>
    api.post(`/scenarios/${id}/duplicate`).then(r => r.data),

  getFull: (id: number): Promise<FullScenario> =>
    api.get(`/scenarios/${id}/full`).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Persons
// ---------------------------------------------------------------------------

export const personApi = {
  list: (scenarioId: number): Promise<Person[]> =>
    api.get(`/scenarios/${scenarioId}/persons`).then(r => r.data),

  create: (scenarioId: number, body: PersonCreate): Promise<Person> =>
    api.post(`/scenarios/${scenarioId}/persons`, body).then(r => r.data),

  update: (personId: number, body: Partial<PersonCreate>): Promise<Person> =>
    api.patch(`/persons/${personId}`, body).then(r => r.data),

  delete: (personId: number): Promise<{ message: string }> =>
    api.delete(`/persons/${personId}`).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------

export const assumptionsApi = {
  get: (scenarioId: number): Promise<Assumptions> =>
    api.get(`/scenarios/${scenarioId}/assumptions`).then(r => r.data),

  upsert: (scenarioId: number, body: AssumptionsCreate): Promise<Assumptions> =>
    api.put(`/scenarios/${scenarioId}/assumptions`, body).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const accountApi = {
  list: (scenarioId: number): Promise<Account[]> =>
    api.get(`/scenarios/${scenarioId}/accounts`).then(r => r.data),

  upsert: (scenarioId: number, body: AccountCreate): Promise<Account> =>
    api.put(`/scenarios/${scenarioId}/accounts`, body).then(r => r.data),

  upsertBulk: (scenarioId: number, body: AccountCreate[]): Promise<Account[]> =>
    api.put(`/scenarios/${scenarioId}/accounts/bulk`, body).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export const contributionApi = {
  upsert: (accountId: number, body: ContributionCreate): Promise<Contribution> =>
    api.put(`/accounts/${accountId}/contributions`, body).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Social Security
// ---------------------------------------------------------------------------

export const ssApi = {
  uploadEarnings: (personId: number, file: File): Promise<{ message: string }> => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post(`/social-security/earnings/${personId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },

  getEarnings: (personId: number): Promise<{ year: number; earnings: number }[]> =>
    api.get(`/social-security/earnings/${personId}`).then(r => r.data),

  upsertClaiming: (personId: number, body: SSClaimingCreate): Promise<SSClaiming> =>
    api.put(`/social-security/claiming/${personId}`, body).then(r => r.data),

  getEstimate: (
    personId: number,
    claimAgeYears: number,
    claimAgeMonths = 0
  ): Promise<SSBenefitEstimate> =>
    api
      .get(`/social-security/estimate/${personId}`, {
        params: { claim_age_years: claimAgeYears, claim_age_months: claimAgeMonths },
      })
      .then(r => r.data),

  getComparison: (personId: number): Promise<SSClaimingComparison> =>
    api.get(`/social-security/comparison/${personId}`).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Roth Conversions
// ---------------------------------------------------------------------------

export const rothApi = {
  list: (scenarioId: number): Promise<RothConversion[]> =>
    api.get(`/scenarios/${scenarioId}/roth-conversions`).then(r => r.data),

  upsert: (scenarioId: number, body: RothConversionOverride): Promise<RothConversion> =>
    api.put(`/scenarios/${scenarioId}/roth-conversions`, body).then(r => r.data),

  delete: (scenarioId: number, planYear: number): Promise<{ message: string }> =>
    api.delete(`/scenarios/${scenarioId}/roth-conversions/${planYear}`).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export const projectionApi = {
  run: (
    scenarioId: number,
    returnScenario: 'conservative' | 'base' | 'optimistic' = 'base',
    forceRecompute = false
  ): Promise<ProjectionResult> =>
    api
      .post('/projection/run', {
        scenario_id: scenarioId,
        return_scenario: returnScenario,
        force_recompute: forceRecompute,
      })
      .then(r => r.data),

  invalidateCache: (scenarioId: number): Promise<{ message: string }> =>
    api.delete(`/projection/${scenarioId}/cache`).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Optimizer
// ---------------------------------------------------------------------------

export const optimizerApi = {
  run: (params: {
    scenarioId: number
    primarySSClaimingAges?: number[]
    spouseSSClaimingAges?: number[]
    rothLadderCeilings?: number[]
    optimizeAgainstScenario?: 'conservative' | 'base' | 'optimistic'
  }): Promise<OptimizedStrategy> =>
    api
      .post('/optimizer/run', {
        scenario_id: params.scenarioId,
        primary_ss_claiming_ages: params.primarySSClaimingAges ?? [62, 67, 70],
        spouse_ss_claiming_ages: params.spouseSSClaimingAges ?? [62, 67, 70],
        roth_ladder_ceilings: params.rothLadderCeilings ?? [0.12, 0.22, 0.24],
        optimize_against_scenario: params.optimizeAgainstScenario ?? 'base',
      })
      .then(r => r.data),
}

// ---------------------------------------------------------------------------
// Tax
// ---------------------------------------------------------------------------

export const taxApi = {
  getBrackets: (taxYear?: number): Promise<TaxBracketsResponse> =>
    api.get('/tax/brackets', { params: taxYear ? { tax_year: taxYear } : {} }).then(r => r.data),

  estimate: (params: {
    ordinaryIncome: number
    ltcgIncome?: number
    ssBenefits?: number
  }): Promise<Record<string, number>> =>
    api
      .post('/tax/estimate', {
        ordinary_income: params.ordinaryIncome,
        ltcg_income: params.ltcgIncome ?? 0,
        ss_benefits: params.ssBenefits ?? 0,
      })
      .then(r => r.data),

  rothConversionCost: (params: {
    existingIncome: number
    conversionAmount: number
  }): Promise<Record<string, number>> =>
    api
      .post('/tax/roth-conversion-cost', {
        existing_income: params.existingIncome,
        conversion_amount: params.conversionAmount,
      })
      .then(r => r.data),
}

// ---------------------------------------------------------------------------
// Contribution Planner
// ---------------------------------------------------------------------------

export const contributionPlannerApi = {
  solve: (params: ContributionPlanRequest): Promise<ContributionPlanResult> =>
    api.post('/contribution-planner/solve', params).then(r => r.data),
}

export default api
