// =============================================================================
// NestEgg - src/hooks/useScenarioLoader.ts
// Hydrates all Zustand stores from the DB whenever scenarioId changes.
// Called once in App.tsx. Handles:
//   - Auto-reload on page refresh (scenarioId persisted in localStorage)
//   - Full hydration after New / Load / Duplicate in ScenarioBar
//
// Key design: calls resetInputs() and clearResults() BEFORE fetching so
// stale data from the previous scenario never bleeds into the new one.
// This is what ensures "No projection data yet" shows on a fresh scenario.
// =============================================================================

import { useEffect, useState } from 'react'
import { scenarioApi } from '../api'
import { useInputStore } from '../store/inputStore'
import { useResultStore } from '../store/resultStore'

export function useScenarioLoader() {
  const {
    scenarioId,
    setScenario,
    setPrimary,
    setSpouse,
    setAssumptions,
    setAccount,
    setContribution,
    setSSClaiming,
    setSSEarningsUploaded,
    setRothOverrides,
    resetInputs,
    markClean,
  } = useInputStore()

  const { clearResults } = useResultStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scenarioId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      // -----------------------------------------------------------------------
      // CRITICAL: Clear all stale data from the previous scenario immediately,
      // before the async fetch resolves. This guarantees the UI never shows
      // old projection charts, balances, or inputs for a newly selected scenario.
      // -----------------------------------------------------------------------
      resetInputs()
      clearResults()

      try {
        const full = await scenarioApi.getFull(scenarioId!)
        if (cancelled) return

        // Scenario identity (name may have been updated since last persist)
        setScenario(full.scenario.id, full.scenario.name)

        // Persons
        const primary = full.persons.find(p => p.role === 'primary') ?? null
        const spouse  = full.persons.find(p => p.role === 'spouse')  ?? null
        if (primary) setPrimary(primary)
        setSpouse(spouse)

        // Assumptions
        if (full.assumptions) setAssumptions(full.assumptions)

        // Accounts
        for (const acct of full.accounts) {
          setAccount(acct)
        }

        // Contributions
        for (const contrib of full.contributions) {
          setContribution(contrib)
        }

        // SS claiming
        for (const claiming of full.ss_claiming) {
          setSSClaiming(claiming)
        }

        // Infer SS earnings upload status from presence of claiming records
        for (const person of full.persons) {
          const hasClaiming = full.ss_claiming.some(c => c.person_id === person.id)
          if (hasClaiming) setSSEarningsUploaded(person.id, true)
        }

        // Roth overrides
        setRothOverrides(full.roth_overrides)

        // Mark clean — freshly loaded from DB
        markClean()

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load scenario')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [scenarioId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { loading, error }
}
