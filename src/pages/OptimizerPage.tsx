// =============================================================================
// NestEgg - src/pages/OptimizerPage.tsx
// Optimizer results: recommended strategy, Roth ladder schedule,
// SS claiming comparison, and manual override controls.
// =============================================================================

import { useState } from 'react'
import {
  Box, Typography, Grid, Chip, Alert, Button,
  CircularProgress, Tooltip,
} from '@mui/material'
import { AutoFixHigh as OptimizeIcon, InfoOutlined as InfoIcon } from '@mui/icons-material'
import Plot from 'react-plotly.js'
import { useResultStore } from '../store/resultStore'
import { useInputStore } from '../store/inputStore'
import { optimizerApi } from '../api'
import { formatCurrency, formatPercent } from '../utils/formatters'

// Re-export layout base for reuse (or inline it here)
const LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { family: 'IBM Plex Mono, monospace', color: '#9aa0b4', size: 11 },
  margin: { t: 16, r: 16, b: 48, l: 72 },
  legend: { bgcolor: 'transparent', font: { size: 11, color: '#9aa0b4' }, orientation: 'h' as const, y: -0.18 },
  xaxis: { gridcolor: 'rgba(255,255,255,0.04)', linecolor: 'rgba(255,255,255,0.08)', tickfont: { size: 10 }, zeroline: false },
  yaxis: { gridcolor: 'rgba(255,255,255,0.04)', linecolor: 'rgba(255,255,255,0.08)', tickfont: { size: 10 }, zeroline: false },
  hovermode: 'x unified' as const,
  hoverlabel: { bgcolor: '#252d42', bordercolor: 'rgba(255,255,255,0.10)', font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#f0ede8' } },
}

// ---------------------------------------------------------------------------
// Rationale card
// ---------------------------------------------------------------------------

function RationaleCard({ rationale }: { rationale: string[] }) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 'var(--radius-lg)',
        bgcolor: 'var(--color-accent-dim)',
        border: '1px solid rgba(45,212,170,0.2)',
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <OptimizeIcon sx={{ color: 'var(--color-accent)', fontSize: 18 }} />
        <Typography sx={{ fontWeight: 600, color: 'var(--color-accent)', fontSize: '0.875rem' }}>
          Recommended Strategy
        </Typography>
      </Box>
      {rationale.map((line, i) => (
        <Typography key={i} sx={{ fontSize: '0.8125rem', color: 'var(--text-primary)', mb: 0.5, lineHeight: 1.5 }}>
          {i === 0 ? <strong>{line}</strong> : `• ${line}`}
        </Typography>
      ))}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// SS comparison panel
// ---------------------------------------------------------------------------

function SSComparisonPanel({ strategy }: { strategy: import('../types').OptimizedStrategy }) {
  return (
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
        Social Security Claiming
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mb: 0.5 }}>
            Primary — Recommended
          </Typography>
          <Chip
            label={strategy.primary_ss_claim_label}
            size="small"
            sx={{
              bgcolor: 'var(--color-accent-dim)',
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </Box>
        {strategy.spouse_ss_claim_label && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mb: 0.5 }}>
              Spouse — Recommended
            </Typography>
            <Chip
              label={strategy.spouse_ss_claim_label}
              size="small"
              sx={{
                bgcolor: 'var(--color-accent-dim)',
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </Box>
        )}
        {strategy.total_tax_saved_vs_no_ladder !== null && strategy.roth_ladder_enabled && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mb: 0.5 }}>
              Roth Ladder Tax Savings
            </Typography>
            <Typography className="num" sx={{ fontSize: '1.125rem', color: 'var(--color-positive)' }}>
              {formatCurrency(strategy.total_tax_saved_vs_no_ladder, { compact: true })}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Roth ladder chart
// ---------------------------------------------------------------------------

function RothLadderChart({ strategy }: { strategy: import('../types').OptimizedStrategy }) {
  const years = strategy.projection.years.filter(y => y.roth_ladder_conversion > 0)
  if (years.length === 0) return (
    <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.875rem', py: 2 }}>
      No Roth conversions in this strategy.
    </Typography>
  )

  return (
    <Plot
      data={[
        {
          x: years.map(y => y.calendar_year),
          y: years.map(y => y.roth_ladder_conversion / 1000),
          name: 'Conversion Amount',
          type: 'bar',
          marker: { color: '#2dd4aacc' },
          hovertemplate: '<b>Conversion</b>: $%{y:.0f}K<extra></extra>',
        },
        {
          x: years.map(y => y.calendar_year),
          y: years.map(y => (y.tax?.total_tax ?? 0) / 1000),
          name: 'Tax Owed',
          type: 'scatter',
          mode: 'lines+markers',
          yaxis: 'y2',
          line: { color: '#f87171', width: 1.5 },
          marker: { size: 4 },
          hovertemplate: '<b>Tax</b>: $%{y:.0f}K<extra></extra>',
        },
      ]}
      layout={{
        ...LAYOUT,
        barmode: 'group',
        yaxis: { ...LAYOUT.yaxis, tickprefix: '$', ticksuffix: 'K' },
        yaxis2: {
          overlaying: 'y',
          side: 'right',
          tickprefix: '$',
          ticksuffix: 'K',
          gridcolor: 'transparent',
          tickfont: { size: 10, color: '#5c6480' },
        },
        height: 280,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}

// ---------------------------------------------------------------------------
// Withdrawal order display
// ---------------------------------------------------------------------------

function WithdrawalOrderPanel() {
  const order = ['hysa', 'brokerage', 'traditional_401k', 'roth_401k', 'roth_ira']
  const labels: Record<string, string> = {
    hysa: 'HYSA',
    brokerage: 'Brokerage (LTCG rates)',
    traditional_401k: 'Traditional 401(k)',
    roth_401k: 'Roth 401(k)',
    roth_ira: 'Roth IRA (last resort)',
  }
  const colors: Record<string, string> = {
    hysa: 'var(--color-hysa)',
    brokerage: 'var(--color-brokerage)',
    traditional_401k: 'var(--color-trad-401k)',
    roth_401k: 'var(--color-roth-401k)',
    roth_ira: 'var(--color-roth-ira)',
  }

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 'var(--radius-lg)',
        bgcolor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
          Withdrawal Order
        </Typography>
        <Tooltip title="Accounts are drawn down in this order to maximize tax efficiency. Roth accounts are preserved as long as possible for tax-free growth.">
          <InfoIcon sx={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {order.map((acct, i) => (
          <Box
            key={acct}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 'var(--radius-sm)',
              bgcolor: 'var(--bg-elevated)',
            }}
          >
            <Typography
              className="num"
              sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 20, flexShrink: 0 }}
            >
              {i + 1}
            </Typography>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: colors[acct],
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: '0.8125rem' }}>{labels[acct]}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Main OptimizerPage
// ---------------------------------------------------------------------------

export function OptimizerPage() {
  const { optimizedStrategy, isRunningOptimizer, setOptimizedStrategy, setRunningOptimizer, setOptimizerError } = useResultStore()
  const { scenarioId } = useInputStore()

  const handleRunOptimizer = async () => {
    if (!scenarioId) return
    setRunningOptimizer(true)
    try {
      const result = await optimizerApi.run({ scenarioId })
      setOptimizedStrategy(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Optimizer failed'
      setOptimizerError(msg)
    } finally {
      setRunningOptimizer(false)
    }
  }

  if (!scenarioId) {
    return <Alert severity="info">No scenario loaded.</Alert>
  }

  if (isRunningOptimizer) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4 }}>
        <CircularProgress size={20} sx={{ color: 'var(--color-accent)' }} />
        <Typography sx={{ color: 'var(--text-secondary)' }}>
          Running optimizer — testing SS claiming ages, Roth ladder ceilings…
        </Typography>
      </Box>
    )
  }

  if (!optimizedStrategy) {
    return (
      <Box sx={{ maxWidth: 500 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 0.5 }}>Optimizer</Typography>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Find the strategy that maximizes your portfolio longevity.
          </Typography>
        </Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          The optimizer tests all combinations of Social Security claiming ages and Roth conversion
          bracket ceilings to find the strategy that makes your portfolio last the longest.
        </Alert>
        <Button
          variant="contained"
          startIcon={<OptimizeIcon />}
          onClick={handleRunOptimizer}
          size="large"
        >
          Run Optimizer
        </Button>
      </Box>
    )
  }

  return (
    <Box className="page-enter" sx={{ maxWidth: 1000 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 0.5 }}>Optimizer</Typography>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Recommended retirement strategy.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<OptimizeIcon fontSize="small" />} onClick={handleRunOptimizer}>
          Re-run
        </Button>
      </Box>

      {/* Rationale */}
      <RationaleCard rationale={optimizedStrategy.rationale} />

      {/* SS + savings */}
      <SSComparisonPanel strategy={optimizedStrategy} />

      {/* Withdrawal order */}
      <WithdrawalOrderPanel />

      {/* Roth ladder */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 'var(--radius-lg)',
          bgcolor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
            Roth Conversion Ladder
          </Typography>
          <Chip
            label={optimizedStrategy.roth_ladder_enabled ? `≤ ${formatPercent(optimizedStrategy.roth_ladder_target_bracket)} bracket` : 'Disabled'}
            size="small"
            sx={{
              bgcolor: optimizedStrategy.roth_ladder_enabled ? 'var(--color-accent-dim)' : 'rgba(255,255,255,0.06)',
              color: optimizedStrategy.roth_ladder_enabled ? 'var(--color-accent)' : 'var(--text-muted)',
            }}
          />
        </Box>
        <RothLadderChart strategy={optimizedStrategy} />
      </Box>

      {/* Key metrics from optimized projection */}
      <Grid container spacing={2}>
        {[
          { label: 'Portfolio Survives?', value: optimizedStrategy.portfolio_survives ? 'Yes ✓' : 'No ✗', positive: optimizedStrategy.portfolio_survives },
          { label: 'Residual Balance', value: formatCurrency(optimizedStrategy.residual_balance, { compact: true }), positive: optimizedStrategy.residual_balance > 0 },
          { label: 'Total Tax Paid', value: formatCurrency(optimizedStrategy.projection.total_tax_paid, { compact: true }) },
          { label: 'Total SS Received', value: formatCurrency(optimizedStrategy.projection.total_ss_received, { compact: true }) },
        ].map((m) => (
          <Grid key={m.label} size={{ xs: 6, md: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 'var(--radius-lg)',
                bgcolor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                {m.label}
              </Typography>
              <Typography
                className="num"
                sx={{
                  fontSize: '1.25rem',
                  color: m.positive === true
                    ? 'var(--color-positive)'
                    : m.positive === false
                    ? 'var(--color-negative)'
                    : 'var(--text-primary)',
                }}
              >
                {m.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
