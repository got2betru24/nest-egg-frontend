// =============================================================================
// NestEgg - App.tsx
// Shell and view routing. Uses Zustand UIStore for active view (no URL routing
// needed for a single-user local tool).
// =============================================================================

import { AppShell } from './components/layout/AppShell'
import { useUIStore } from './store/uiStore'
import { Dashboard } from './pages/Dashboard'
import { InputsPage } from './pages/InputsPage'
import { ProjectionPage } from './pages/ProjectionPage'
import { OptimizerPage } from './pages/OptimizerPage'
import { SocialSecurityPage } from './pages/SocialSecurityPage'
import { RetirementPage } from './pages/RetirementPage'
import { TaxPage } from './pages/TaxPage'

function ActiveView() {
  const { activeView } = useUIStore()

  switch (activeView) {
    case 'dashboard':       return <Dashboard />
    case 'inputs':          return <InputsPage />
    case 'projection':      return <ProjectionPage />
    case 'optimizer':       return <OptimizerPage />
    case 'social-security': return <SocialSecurityPage />
    case 'retirement':      return <RetirementPage />
    case 'tax':             return <TaxPage />
    default:                return <Dashboard />
  }
}

export default function App() {
  return (
    <AppShell>
      <ActiveView />
    </AppShell>
  )
}
