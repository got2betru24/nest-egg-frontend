// =============================================================================
// NestEgg - src/store/resultStore.ts
// Zustand store for computed projection results and optimizer output.
// =============================================================================

import { create } from 'zustand'
import type { OptimizedStrategy, ProjectionResult, ReturnScenario } from '../types'

interface ResultState {
  // Projection results keyed by return scenario
  projections: Partial<Record<ReturnScenario, ProjectionResult>>

  // Active scenario being displayed
  activeScenario: ReturnScenario

  // Optimizer output
  optimizedStrategy: OptimizedStrategy | null

  // Loading states
  isRunningProjection: boolean
  isRunningOptimizer: boolean

  // Error states
  projectionError: string | null
  optimizerError: string | null

  // Actions
  setProjection: (scenario: ReturnScenario, result: ProjectionResult) => void
  setActiveScenario: (scenario: ReturnScenario) => void
  setOptimizedStrategy: (strategy: OptimizedStrategy | null) => void
  setRunningProjection: (running: boolean) => void
  setRunningOptimizer: (running: boolean) => void
  setProjectionError: (error: string | null) => void
  setOptimizerError: (error: string | null) => void
  clearResults: () => void

  // Derived helpers
  getActiveProjection: () => ProjectionResult | null
}

export const useResultStore = create<ResultState>()((set, get) => ({
  projections: {},
  activeScenario: 'base',
  optimizedStrategy: null,
  isRunningProjection: false,
  isRunningOptimizer: false,
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

  setRunningProjection: (running) => set({ isRunningProjection: running }),
  setRunningOptimizer: (running) => set({ isRunningOptimizer: running }),
  setProjectionError: (error) => set({ projectionError: error }),
  setOptimizerError: (error) => set({ optimizerError: error }),

  clearResults: () =>
    set({
      projections: {},
      optimizedStrategy: null,
      projectionError: null,
      optimizerError: null,
    }),

  getActiveProjection: () => {
    const { projections, activeScenario } = get()
    return projections[activeScenario] ?? null
  },
}))
