// =============================================================================
// NestEgg - App.tsx
// Shell and view routing. Uses Zustand UIStore for active view.
// useScenarioLoader hydrates all stores from DB whenever scenarioId changes
// (including on page refresh from localStorage-persisted scenarioId).
// =============================================================================

import { Box, CircularProgress, Typography } from '@mui/material'
import { AppShell } from './components/layout/AppShell'
import { useUIStore } from './store/uiStore'
import { useScenarioLoader } from './hooks/useScenarioLoader'
import { Dashboard } from './pages/Dashboard'
import { InputsPage } from './pages/InputsPage'
import { ProjectionPage } from './pages/ProjectionPage'
import { OptimizerPage } from './pages/OptimizerPage'
import { SocialSecurityPage } from './pages/SocialSecurityPage'
import { RetirementPage } from './pages/RetirementPage'
import { ContributionPlannerPage } from './pages/ContributionPlannerPage'
import { TaxPage } from './pages/TaxPage'

function ActiveView() {
  const { activeView } = useUIStore()
  switch (activeView) {
    case 'dashboard':             return <Dashboard />
    case 'inputs':                return <InputsPage />
    case 'projection':            return <ProjectionPage />
    case 'optimizer':             return <OptimizerPage />
    case 'contribution-planner':  return <ContributionPlannerPage />
    case 'social-security':       return <SocialSecurityPage />
    case 'retirement':            return <RetirementPage />
    case 'tax':                   return <TaxPage />
    default:                      return <Dashboard />
  }
}

export default function App() {
  const { loading, error } = useScenarioLoader()

  return (
    <AppShell>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 6 }}>
          <CircularProgress size={20} sx={{ color: 'var(--color-accent)' }} />
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Loading scenario…
          </Typography>
        </Box>
      ) : error ? (
        <Box
          sx={{
            mt: 4,
            p: 2.5,
            borderRadius: 'var(--radius-lg)',
            bgcolor: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            maxWidth: 500,
          }}
        >
          <Typography sx={{ color: 'var(--color-negative)', fontWeight: 600, mb: 0.5 }}>
            Failed to load scenario
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {error}
          </Typography>
        </Box>
      ) : (
        <ActiveView />
      )}
    </AppShell>
  )
}
