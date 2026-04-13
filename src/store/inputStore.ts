// =============================================================================
// NestEgg - src/store/inputStore.ts
// Zustand store for all user inputs. This is the single source of truth
// for everything the user has entered. Changes here trigger projection
// recomputes via the resultStore.
// =============================================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account,
  Assumptions,
  Contribution,
  Person,
  RothConversion,
  SSClaiming,
} from '../types'

interface InputState {
  // Active scenario
  scenarioId: number | null
  scenarioName: string

  // Persons
  primary: Person | null
  spouse: Person | null

  // Global assumptions
  assumptions: Assumptions | null

  // Accounts (keyed by account_type for easy lookup)
  accounts: Record<string, Account>

  // Contributions (keyed by account_id)
  contributions: Record<number, Contribution>

  // SS claiming strategies (keyed by person_id)
  ssClaiming: Record<number, SSClaiming>

  // Roth conversion overrides
  rothOverrides: RothConversion[]

  // Whether SS earnings have been uploaded per person
  ssEarningsUploaded: Record<number, boolean>

  // Dirty flag — true when inputs have changed since last projection run
  isDirty: boolean

  // Actions
  setScenario: (id: number | null, name: string) => void
  setPrimary: (person: Person) => void
  setSpouse: (person: Person | null) => void
  setAssumptions: (assumptions: Assumptions) => void
  setAccount: (account: Account) => void
  setContribution: (contribution: Contribution) => void
  setSSClaiming: (claiming: SSClaiming) => void
  setSSEarningsUploaded: (personId: number, uploaded: boolean) => void
  setRothOverrides: (overrides: RothConversion[]) => void
  addRothOverride: (override: RothConversion) => void
  removeRothOverride: (planYear: number) => void
  markClean: () => void
  markDirty: () => void
  reset: () => void
  resetInputs: () => void
}

const defaultState = {
  scenarioId: null,
  scenarioName: '',
  primary: null,
  spouse: null,
  assumptions: null,
  accounts: {},
  contributions: {},
  ssClaiming: {},
  rothOverrides: [],
  ssEarningsUploaded: {},
  isDirty: false,
}

export const useInputStore = create<InputState>()(
  persist(
    (set) => ({
      ...defaultState,

      setScenario: (id, name) =>
        set({ scenarioId: id, scenarioName: name, isDirty: false }),

      setPrimary: (person) =>
        set({ primary: person, isDirty: true }),

      setSpouse: (person) =>
        set({ spouse: person, isDirty: true }),

      setAssumptions: (assumptions) =>
        set({ assumptions, isDirty: true }),

      setAccount: (account) =>
        set((state) => ({
          accounts: { ...state.accounts, [account.account_type]: account },
          isDirty: true,
        })),

      setContribution: (contribution) =>
        set((state) => ({
          contributions: {
            ...state.contributions,
            [contribution.account_id]: contribution,
          },
          isDirty: true,
        })),

      setSSClaiming: (claiming) =>
        set((state) => ({
          ssClaiming: {
            ...state.ssClaiming,
            [claiming.person_id]: claiming,
          },
          isDirty: true,
        })),

      setSSEarningsUploaded: (personId, uploaded) =>
        set((state) => ({
          ssEarningsUploaded: {
            ...state.ssEarningsUploaded,
            [personId]: uploaded,
          },
        })),

      setRothOverrides: (overrides) =>
        set({ rothOverrides: overrides, isDirty: true }),

      addRothOverride: (override) =>
        set((state) => {
          const existing = state.rothOverrides.filter(
            (r) => r.plan_year !== override.plan_year
          )
          return { rothOverrides: [...existing, override], isDirty: true }
        }),

      removeRothOverride: (planYear) =>
        set((state) => ({
          rothOverrides: state.rothOverrides.filter((r) => r.plan_year !== planYear),
          isDirty: true,
        })),

      markClean: () => set({ isDirty: false }),
      markDirty: () => set({ isDirty: true }),

      reset: () => set(defaultState),

      // Clears all scenario-specific data but preserves scenarioId/name.
      // Called by useScenarioLoader before hydrating so stale data from a
      // previous scenario never bleeds through into the newly loaded one.
      resetInputs: () =>
        set((state) => ({
          primary: null,
          spouse: null,
          assumptions: null,
          accounts: {},
          contributions: {},
          ssClaiming: {},
          rothOverrides: [],
          ssEarningsUploaded: {},
          isDirty: false,
          scenarioId: state.scenarioId,
          scenarioName: state.scenarioName,
        })),
    }),
    {
      name: 'nestegg-inputs',
      // Only persist non-sensitive UI state; full data lives in MySQL
      partialize: (state) => ({
        scenarioId: state.scenarioId,
        scenarioName: state.scenarioName,
      }),
    }
  )
)
