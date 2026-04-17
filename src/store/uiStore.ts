// =============================================================================
// NestEgg - src/store/uiStore.ts
// Zustand store for UI state — active view, toggles, sidebar state.
// =============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppView =
  | "dashboard"
  | "inputs"
  | "projection"
  | "contribution-optimizer"
  | "withdrawal-strategy"
  | "social-security"
  | "retirement"
  | "tax";

export type ChartView = "combined" | "by-account" | "income" | "tax";
export type BalanceView = "total" | "pretax" | "posttax";

interface UIState {
  // Navigation
  activeView: AppView;
  sidebarCollapsed: boolean;

  // Chart controls
  chartView: ChartView;
  balanceView: BalanceView;
  showInflationAdjusted: boolean;

  // Scenario comparison overlay
  showAllScenarios: boolean;

  // Input panel expand states
  expandedSections: Record<string, boolean>;

  // Scenario management modal
  scenarioModalOpen: boolean;

  // Optimizer alert banner
  optimizerAlert: boolean;

  // Actions
  setActiveView: (view: AppView) => void;
  toggleSidebar: () => void;
  setChartView: (view: ChartView) => void;
  setBalanceView: (view: BalanceView) => void;
  toggleInflationAdjusted: () => void;
  toggleAllScenarios: () => void;
  toggleSection: (section: string) => void;
  setScenarioModalOpen: (open: boolean) => void;
  setOptimizerAlert: (show: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeView: "dashboard",
      showOptimizerAlert: false, //
      sidebarCollapsed: false,
      chartView: "combined",
      balanceView: "total",
      showInflationAdjusted: false,
      showAllScenarios: false,
      expandedSections: {
        personal: true,
        income: true,
        accounts: true,
        contributions: true,
        healthcare: false,
        roth: false,
      },
      scenarioModalOpen: false,
      optimizerAlert: false,

      setActiveView: (view) => set({ activeView: view }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setChartView: (view) => set({ chartView: view }),
      setBalanceView: (view) => set({ balanceView: view }),
      toggleInflationAdjusted: () =>
        set((s) => ({ showInflationAdjusted: !s.showInflationAdjusted })),
      toggleAllScenarios: () =>
        set((s) => ({ showAllScenarios: !s.showAllScenarios })),
      toggleSection: (section) =>
        set((s) => ({
          expandedSections: {
            ...s.expandedSections,
            [section]: !s.expandedSections[section],
          },
        })),
      setScenarioModalOpen: (open) => set({ scenarioModalOpen: open }),
      setOptimizerAlert: (show) => set({ optimizerAlert: show }),
    }),
    {
      name: "nestegg-ui",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        chartView: s.chartView,
        balanceView: s.balanceView,
        showInflationAdjusted: s.showInflationAdjusted,
        expandedSections: s.expandedSections,
      }),
    }
  )
);
