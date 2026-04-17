// =============================================================================
// NestEgg - src/store/resultStore.ts
// Zustand store for computed projection results and optimizer output.
// =============================================================================

import { create } from 'zustand'
import { projectionApi, optimizerApi } from '../api'
import type { OptimizedStrategy, ProjectionResult, ReturnScenario } from '../types'

interface ResultState {
  // Projection results keyed by return scenario
  projections: Partial<Record<ReturnScenario, ProjectionResult>>

  // Active scenario being displayed
  activeScenario: ReturnScenario

  // Optimizer output
  optimizedStrategy: OptimizedStrategy | null

  // Loading states
  isRunning: boolean

  // Error states
  projectionError: string | null
  optimizerError: string | null

  // Actions
  setProjection: (scenario: ReturnScenario, result: ProjectionResult) => void
  setActiveScenario: (scenario: ReturnScenario) => void
  setOptimizedStrategy: (strategy: OptimizedStrategy | null) => void
  setProjectionError: (error: string | null) => void
  setOptimizerError: (error: string | null) => void
  clearResults: () => void

  // Combined run — fires projection + optimizer in parallel
  runAll: (scenarioId: number, returnScenario: ReturnScenario) => Promise<void>

  // Derived helpers
  getActiveProjection: () => ProjectionResult | null
}

export const useResultStore = create<ResultState>()((set, get) => ({
  projections: {},
  activeScenario: 'base',
  optimizedStrategy: null,
  isRunning: false,
  projectionError: null,
  optimizerError: null,

  setProjection: (scenario, result) =>
    set((state) => ({
      projections: { ...state.projections, [scenario]: result },
      projectionError: null,
    })),

  setActiveScenario: (scenario) => set({ activeScenario: scenario }),

  setOptimizedStrategy: (strategy) =>
    set({ optimizedStrategy: strategy, optimizerError: null }),

  setProjectionError: (error) => set({ projectionError: error }),
  setOptimizerError: (error) => set({ optimizerError: error }),

  clearResults: () =>
    set({
      projections: {},
      optimizedStrategy: null,
      projectionError: null,
      optimizerError: null,
    }),

  runAll: async (scenarioId, returnScenario) => {
    set({ isRunning: true, projectionError: null, optimizerError: null })
    try {
      const [projResult, optResult] = await Promise.all([
        projectionApi.run(scenarioId, returnScenario, true),
        optimizerApi.run({ scenarioId }),
      ])
      set((state) => ({
        projections: { ...state.projections, [returnScenario]: projResult },
        optimizedStrategy: optResult,
      }))
    } catch (err: unknown) {
      // Distinguish which call failed by checking the message — in practice
      // both use the same scenarioId so a DB/input error will affect both.
      // We surface a single error message; individual setters can be called
      // directly for more granular recovery if needed.
      const msg = err instanceof Error ? err.message : 'Run failed'
      set({ projectionError: msg, optimizerError: msg })
    } finally {
      set({ isRunning: false })
    }
  },

  getActiveProjection: () => {
    const { projections, activeScenario } = get()
    return projections[activeScenario] ?? null
  },
}))
