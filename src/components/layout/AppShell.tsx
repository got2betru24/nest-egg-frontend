// =============================================================================
// NestEgg - src/components/layout/AppShell.tsx
// Top-level layout: sidebar + topbar + main content area.
// =============================================================================

import { Box, IconButton, Tooltip } from '@mui/material'
import {
  Dashboard as DashboardIcon,
  TuneRounded as InputsIcon,
  ShowChart as ProjectionIcon,
  EventRepeat as PlannerIcon,
  AutoFixHigh as OptimizerIcon,
  SavingsRounded as SSIcon,
  BeachAccess as RetirementIcon,
  ReceiptLong as TaxIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material'
import { useUIStore, type AppView } from '../../store/uiStore'
import { ScenarioBar } from './ScenarioBar'

interface NavItem {
  view: AppView
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard',            label: 'Dashboard',            icon: <DashboardIcon fontSize="small" /> },
  { view: 'inputs',               label: 'Inputs',               icon: <InputsIcon fontSize="small" /> },
  { view: 'projection',           label: 'Projection',           icon: <ProjectionIcon fontSize="small" /> },
  { view: 'contribution-planner', label: 'Contribution Planner', icon: <PlannerIcon fontSize="small" /> },
  { view: 'optimizer',            label: 'Withdrawal Planner',   icon: <OptimizerIcon fontSize="small" /> },
  { view: 'social-security',      label: 'Social Security',      icon: <SSIcon fontSize="small" /> },
  { view: 'retirement',           label: 'Retirement',           icon: <RetirementIcon fontSize="small" /> },
  { view: 'tax',                  label: 'Tax',                  icon: <TaxIcon fontSize="small" /> },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { activeView, sidebarCollapsed, setActiveView, toggleSidebar } = useUIStore()

  const sidebarWidth = sidebarCollapsed
    ? 'var(--sidebar-collapsed-width)'
    : 'var(--sidebar-width)'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'var(--bg-base)' }}>

      {/* ----------------------------------------------------------------
          Sidebar
          ---------------------------------------------------------------- */}
      <Box
        component="nav"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          transition: 'width var(--transition-slow)',
          overflow: 'hidden',
          zIndex: 100,
        }}
      >
        {/* Logo / wordmark */}
        <Box
          sx={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            px: sidebarCollapsed ? 1.5 : 2.5,
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
            gap: 1.5,
          }}
        >
          {/* Egg icon */}
          <Box
            sx={{
              width: 23,
              height: 28,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #1a9e7f 100%)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'var(--text-inverse)',
              fontFamily: 'var(--font-display)',
            }}
          >
            N
          </Box>
          {!sidebarCollapsed && (
            <Box
              sx={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              NestEgg
            </Box>
          )}
        </Box>

        {/* Nav items */}
        <Box sx={{ flex: 1, py: 1.5, px: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.view
            return (
              <Tooltip
                key={item.view}
                title={sidebarCollapsed ? item.label : ''}
                placement="right"
                arrow
              >
                <Box
                  onClick={() => setActiveView(item.view)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: sidebarCollapsed ? 1.5 : 1.5,
                    py: 1,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                    bgcolor: isActive ? 'var(--color-accent-dim)' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)',
                    '&:hover': {
                      bgcolor: isActive
                        ? 'var(--color-accent-dim)'
                        : 'rgba(255,255,255,0.04)',
                      color: isActive ? 'var(--color-accent)' : 'var(--text-primary)',
                    },
                  }}
                >
                  <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </Box>
                  {!sidebarCollapsed && (
                    <Box
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 500 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {item.label}
                    </Box>
                  )}
                </Box>
              </Tooltip>
            )
          })}
        </Box>

        {/* Collapse toggle */}
        <Box
          sx={{
            p: 1,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
          }}
        >
          <IconButton
            size="small"
            onClick={toggleSidebar}
            sx={{ color: 'var(--text-muted)', '&:hover': { color: 'var(--text-secondary)' } }}
          >
            {sidebarCollapsed ? (
              <ChevronRight fontSize="small" />
            ) : (
              <ChevronLeft fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Box>

      {/* ----------------------------------------------------------------
          Main content
          ---------------------------------------------------------------- */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            height: 'var(--topbar-height)',
            borderBottom: '1px solid var(--border-subtle)',
            bgcolor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            px: 3,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <ScenarioBar />
        </Box>

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
