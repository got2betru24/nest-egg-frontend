// =============================================================================
// NestEgg - src/pages/Dashboard.tsx
// Overview dashboard: key metrics, portfolio summary, readiness indicator,
// and quick-access cards for each section.
// =============================================================================

import { useEffect } from 'react'
import { Box, Button, Grid, Typography, LinearProgress, Chip, Alert } from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountIcon,
  BeachAccess as RetireIcon,
  AutoFixHigh as OptimizeIcon,
  ArrowForward as ArrowIcon,
  WarningAmber as WarnIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material'
import { useInputStore } from '../store/inputStore'
import { useResultStore } from '../store/resultStore'
import { useUIStore } from '../store/uiStore'
import { formatCurrency, formatPercent } from '../utils/formatters'
import type { ProjectionResult } from '../types'

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
  warn?: boolean
  onClick?: () => void
}

function StatCard({ label, value, sub, accent, warn, onClick }: StatCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 'var(--radius-lg)',
        bgcolor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--transition-fast), background var(--transition-fast)',
        '&:hover': onClick ? {
          borderColor: 'var(--border-strong)',
          bgcolor: 'var(--bg-elevated)',
        } : {},
      }}
    >
      <Typography
        sx={{
          fontSize: '0.6875rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          mb: 1,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
      <Typography
        className="num"
        sx={{
          fontSize: '1.5rem',
          fontFamily: 'var(--font-mono)',
          color: accent
            ? 'var(--color-accent)'
            : warn
            ? 'var(--color-warning)'
            : 'var(--text-primary)',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          mb: sub ? 0.75 : 0,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
          {sub}
        </Typography>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Account breakdown bar
// ---------------------------------------------------------------------------

interface AccountBarProps {
  result: ProjectionResult
}

function AccountBar({ result }: AccountBarProps) {
  const retireYear = result.years.find(y => y.phase !== 'accumulation')
  const balances = retireYear?.balances_start ?? result.years[result.years.length - 1]?.balances_end
  if (!balances) return null

  const total = balances.total
  if (total === 0) return null

  const segments = [
    { label: 'HYSA',       value: balances.hysa,             color: 'var(--color-hysa)' },
    { label: 'Brokerage',  value: balances.brokerage,         color: 'var(--color-brokerage)' },
    { label: 'Roth IRA',   value: balances.roth_ira,          color: 'var(--color-roth-ira)' },
    { label: 'Trad 401k',  value: balances.traditional_401k,  color: 'var(--color-trad-401k)' },
    { label: 'Roth 401k',  value: balances.roth_401k,         color: 'var(--color-roth-401k)' },
  ].filter(s => s.value > 0)

  return (
    <Box>
      {/* Bar */}
      <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', mb: 1.5 }}>
        {segments.map((seg) => (
          <Box
            key={seg.label}
            sx={{
              width: `${(seg.value / total) * 100}%`,
              bgcolor: seg.color,
              transition: 'width var(--transition-slow)',
            }}
          />
        ))}
      </Box>
      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {segments.map((seg) => (
          <Box key={seg.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {seg.label}
            </Typography>
            <Typography className="num" sx={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
              {formatCurrency(seg.value, { compact: true })}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------

interface QuickCardProps {
  icon: React.ReactNode
  title: string
  description: string
  view: import('../store/uiStore').AppView
  accent?: boolean
}

function QuickCard({ icon, title, description, view, accent }: QuickCardProps) {
  const { setActiveView } = useUIStore()
  return (
    <Box
      onClick={() => setActiveView(view)}
      sx={{
        p: 2,
        borderRadius: 'var(--radius-lg)',
        bgcolor: 'var(--bg-surface)',
        border: `1px solid ${accent ? 'rgba(45,212,170,0.2)' : 'var(--border-subtle)'}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        transition: 'all var(--transition-fast)',
        '&:hover': {
          borderColor: 'var(--color-accent)',
          bgcolor: 'var(--bg-elevated)',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 20px rgba(45,212,170,0.08)',
        },
      }}
    >
      <Box sx={{ color: accent ? 'var(--color-accent)' : 'var(--text-secondary)' }}>
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {description}
      </Typography>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard() {
  const { scenarioId, assumptions, primary } = useInputStore()
  const { getActiveProjection, optimizedStrategy, isRunningProjection } = useResultStore()
  const { setActiveView } = useUIStore()

  const projection = getActiveProjection()

  // Key metrics derived from projection
  const retirementYear = primary
    ? new Date().getFullYear() + (primary.planned_retirement_age - (new Date().getFullYear() - primary.birth_year))
    : null

  const retirementRow = projection?.years.find(y => y.phase !== 'accumulation')
  const balanceAtRetirement = retirementRow?.balances_start.total ?? null

  const lastRow = projection?.years[projection.years.length - 1]
  const finalBalance = lastRow?.balances_end.total ?? null

  const yearsToRetirement = retirementYear
    ? retirementYear - new Date().getFullYear()
    : null

  const planToAge = assumptions?.plan_to_age ?? 90
  const retirementAge = primary?.planned_retirement_age ?? 55
  const retirementDuration = planToAge - retirementAge

  // Readiness score (simplified: does portfolio survive?)
  const survives = projection?.success ?? null
  const depletionAge = projection?.depletion_age ?? null

  const readinessPct = survives
    ? 100
    : depletionAge
    ? Math.round(((depletionAge - retirementAge) / retirementDuration) * 100)
    : null

  return (
    <Box className="page-enter" sx={{ maxWidth: 1100 }}>

      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '2rem', mb: 0.5 }}>
          Retirement Overview
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {scenarioId
            ? 'Your retirement projection at a glance.'
            : 'Load or create a scenario to get started.'}
        </Typography>
      </Box>

      {/* No scenario state */}
      {!scenarioId && (
        <Box
          sx={{
            p: 4,
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-default)',
            textAlign: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h3" sx={{ fontSize: '1.25rem', mb: 1 }}>
            No scenario loaded
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)', mb: 3, fontSize: '0.875rem' }}>
            Create a new scenario or load an existing one to begin planning.
          </Typography>
          <Button
            variant="contained"
            startIcon={<OptimizeIcon />}
            onClick={() => setActiveView('inputs')}
          >
            Set up your scenario
          </Button>
        </Box>
      )}

      {/* Optimizer recommendation banner */}
      {optimizedStrategy && (
        <Alert
          icon={<CheckIcon fontSize="small" />}
          severity="success"
          sx={{ mb: 3, alignItems: 'center' }}
          action={
            <Button
              size="small"
              color="inherit"
              endIcon={<ArrowIcon fontSize="small" />}
              onClick={() => setActiveView('optimizer')}
            >
              View strategy
            </Button>
          }
        >
          <strong>Optimized strategy ready.</strong>{' '}
          {optimizedStrategy.rationale[0]}
        </Alert>
      )}

      {projection && !projection.success && (
        <Alert
          icon={<WarnIcon fontSize="small" />}
          severity="warning"
          sx={{ mb: 3 }}
        >
          <strong>Portfolio shortfall detected.</strong>{' '}
          Portfolio depletes at age {projection.depletion_age}. Run the optimizer for recommendations.
        </Alert>
      )}

      {/* ----------------------------------------------------------------
          Key metrics
          ---------------------------------------------------------------- */}
      {scenarioId && (
        <Box className="stagger">

          {/* Stat cards row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Years to Retirement"
                value={yearsToRetirement !== null ? `${yearsToRetirement}` : '—'}
                sub={retirementYear ? `Target: ${retirementYear}` : undefined}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Balance at Retirement"
                value={balanceAtRetirement !== null ? formatCurrency(balanceAtRetirement, { compact: true }) : '—'}
                sub={`Age ${retirementAge}`}
                accent={!!balanceAtRetirement}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Final Balance"
                value={finalBalance !== null ? formatCurrency(finalBalance, { compact: true }) : '—'}
                sub={`Age ${planToAge}`}
                accent={!!finalBalance && finalBalance > 0}
                warn={!!finalBalance && finalBalance <= 0}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Total Tax Paid"
                value={projection ? formatCurrency(projection.total_tax_paid, { compact: true }) : '—'}
                sub="Lifetime estimate"
              />
            </Grid>
          </Grid>

          {/* Portfolio readiness */}
          {readinessPct !== null && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: 'var(--radius-lg)',
                bgcolor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                  Retirement Readiness
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    className="num"
                    sx={{
                      fontSize: '1.25rem',
                      color: readinessPct >= 100
                        ? 'var(--color-positive)'
                        : readinessPct >= 70
                        ? 'var(--color-warning)'
                        : 'var(--color-negative)',
                    }}
                  >
                    {readinessPct}%
                  </Typography>
                  <Chip
                    label={readinessPct >= 100 ? 'On Track' : readinessPct >= 70 ? 'At Risk' : 'Shortfall'}
                    size="small"
                    sx={{
                      bgcolor: readinessPct >= 100
                        ? 'rgba(45,212,170,0.12)'
                        : readinessPct >= 70
                        ? 'rgba(245,158,11,0.12)'
                        : 'rgba(248,113,113,0.12)',
                      color: readinessPct >= 100
                        ? 'var(--color-positive)'
                        : readinessPct >= 70
                        ? 'var(--color-warning)'
                        : 'var(--color-negative)',
                      border: 'none',
                    }}
                  />
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(readinessPct, 100)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.06)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: readinessPct >= 100
                      ? 'var(--color-positive)'
                      : readinessPct >= 70
                      ? 'var(--color-warning)'
                      : 'var(--color-negative)',
                  },
                }}
              />
              {!survives && depletionAge && (
                <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mt: 1 }}>
                  Portfolio runs out at age {depletionAge} — {depletionAge - retirementAge} years into retirement
                </Typography>
              )}
            </Box>
          )}

          {/* Account breakdown at retirement */}
          {projection && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: 'var(--radius-lg)',
                bgcolor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                mb: 3,
              }}
            >
              <Typography sx={{ fontWeight: 500, fontSize: '0.875rem', mb: 2 }}>
                Account Mix at Retirement
              </Typography>
              <AccountBar result={projection} />
            </Box>
          )}

          {/* SS summary */}
          {projection && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: 'var(--radius-lg)',
                bgcolor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                mb: 3,
              }}
            >
              <Typography sx={{ fontWeight: 500, fontSize: '0.875rem', mb: 1.5 }}>
                Social Security
              </Typography>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mb: 0.5 }}>
                    Total SS Received
                  </Typography>
                  <Typography className="num" sx={{ fontSize: '1.25rem', color: 'var(--color-accent)' }}>
                    {formatCurrency(projection.total_ss_received, { compact: true })}
                  </Typography>
                </Box>
                {optimizedStrategy && (
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mb: 0.5 }}>
                      Recommended Claiming
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {optimizedStrategy.primary_ss_claim_label}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Quick action cards */}
          <Typography
            sx={{
              fontSize: '0.6875rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              mb: 1.5,
              fontWeight: 500,
            }}
          >
            Quick Access
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<AccountIcon fontSize="small" />}
                title="Inputs"
                description="Update accounts, contributions, and personal details"
                view="inputs"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<TrendingUpIcon fontSize="small" />}
                title="Projection"
                description="Year-by-year account growth and income charts"
                view="projection"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<OptimizeIcon fontSize="small" />}
                title="Optimizer"
                description="Best withdrawal order, Roth ladder, and SS timing"
                view="optimizer"
                accent
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<RetireIcon fontSize="small" />}
                title="Retirement"
                description="Bridge strategy and retirement income waterfall"
                view="retirement"
              />
            </Grid>
          </Grid>

        </Box>
      )}

      {/* Loading overlay */}
      {isRunningProjection && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress />
          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mt: 1 }}>
            Running projection…
          </Typography>
        </Box>
      )}
    </Box>
  )
}
