// =============================================================================
// NestEgg - src/pages/SocialSecurityPage.tsx
// SS earnings upload, benefit estimates, and claiming comparison.
// =============================================================================

import { useState, useRef, useEffect } from 'react'
import {
  Box, Typography, Button, Alert, Grid, Chip, CircularProgress,
} from '@mui/material'
import { Upload as UploadIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import { ssApi } from '../api'
import { useInputStore } from '../store/inputStore'
import { formatCurrency } from '../utils/formatters'
import type { SSClaimingComparison } from '../types'

export function SocialSecurityPage() {
  const { primary, spouse, scenarioId, setSSEarningsUploaded, ssEarningsUploaded } = useInputStore()
  const [comparison, setComparison] = useState<SSClaimingComparison | null>(null)
  const [spouseComparison, setSpouseComparison] = useState<SSClaimingComparison | null>(null)
  const [uploadStatus, setUploadStatus] = useState<Record<number, 'idle' | 'uploading' | 'done' | 'error'>>({})
  const [fetchingComparison, setFetchingComparison] = useState<Record<number, boolean>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const spouseFileRef = useRef<HTMLInputElement>(null)

  // -------------------------------------------------------------------------
  // On mount (or when person IDs change): if earnings were previously uploaded,
  // fetch the comparison automatically so the benefit cards show without
  // requiring a re-upload. This is the key fix — comparison state was being
  // lost on navigation because it only lived in useState.
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function fetchIfUploaded(
      personId: number,
      isSpouse: boolean,
    ) {
      if (!ssEarningsUploaded[personId]) return
      setFetchingComparison(s => ({ ...s, [personId]: true }))
      try {
        const comp = await ssApi.getComparison(personId)
        if (isSpouse) setSpouseComparison(comp)
        else setComparison(comp)
      } catch {
        // Earnings may have been flagged uploaded but actual rows are missing
        // (e.g. fresh DB). Clear the flag so the user sees the upload prompt.
        setSSEarningsUploaded(personId, false)
      } finally {
        setFetchingComparison(s => ({ ...s, [personId]: false }))
      }
    }

    if (primary) fetchIfUploaded(primary.id, false)
    if (spouse)  fetchIfUploaded(spouse.id,  true)
  }, [primary?.id, spouse?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!scenarioId) return <Alert severity="info">No scenario loaded.</Alert>

  const handleUpload = async (personId: number, file: File, isSpouse = false) => {
    setUploadStatus(s => ({ ...s, [personId]: 'uploading' }))
    try {
      await ssApi.uploadEarnings(personId, file)
      setSSEarningsUploaded(personId, true)
      setUploadStatus(s => ({ ...s, [personId]: 'done' }))
      const comp = await ssApi.getComparison(personId)
      if (isSpouse) setSpouseComparison(comp)
      else setComparison(comp)
    } catch {
      setUploadStatus(s => ({ ...s, [personId]: 'error' }))
    }
  }

  const handleRefreshComparison = async (personId: number, isSpouse: boolean) => {
    setFetchingComparison(s => ({ ...s, [personId]: true }))
    try {
      const comp = await ssApi.getComparison(personId)
      if (isSpouse) setSpouseComparison(comp)
      else setComparison(comp)
    } finally {
      setFetchingComparison(s => ({ ...s, [personId]: false }))
    }
  }

  const BenefitCard = ({ label, benefit, recommended = false }: {
    label: string
    benefit: import('../types').SSBenefitEstimate
    recommended?: boolean
  }) => (
    <Box
      sx={{
        p: 2,
        borderRadius: 'var(--radius-lg)',
        bgcolor: recommended ? 'var(--color-accent-dim)' : 'var(--bg-surface)',
        border: `1px solid ${recommended ? 'rgba(45,212,170,0.3)' : 'var(--border-subtle)'}`,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</Typography>
        {recommended && (
          <Chip
            label="Recommended"
            size="small"
            sx={{ bgcolor: 'var(--color-accent)', color: '#0f1117', fontSize: '0.6875rem' }}
          />
        )}
      </Box>
      <Typography className="num" sx={{ fontSize: '1.5rem', color: recommended ? 'var(--color-accent)' : 'var(--text-primary)', mb: 0.5 }}>
        {formatCurrency(benefit.monthly_benefit)}/mo
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {formatCurrency(benefit.annual_benefit)}/yr · PIA: {formatCurrency(benefit.pia)}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mt: 0.5 }}>
        AIME: {formatCurrency(benefit.aime)} · FRA: {benefit.fra_years}y {benefit.fra_months}m
      </Typography>
    </Box>
  )

  const PersonSSPanel = ({
    person,
    comp,
    isSpouse,
    fileInputRef,
  }: {
    person: typeof primary
    comp: SSClaimingComparison | null
    isSpouse: boolean
    fileInputRef: React.RefObject<HTMLInputElement>
  }) => {
    if (!person) return null
    const status = uploadStatus[person.id] ?? 'idle'
    const uploaded = ssEarningsUploaded[person.id]
    const fetching = fetchingComparison[person.id] ?? false

    return (
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 2 }}>
          {isSpouse ? 'Spouse' : 'Primary'} — born {person.birth_year}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(person.id, f, isSpouse)
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadIcon fontSize="small" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={status === 'uploading'}
          >
            {status === 'uploading'
              ? 'Uploading…'
              : uploaded
              ? 'Re-upload Earnings CSV'
              : 'Upload Earnings CSV'}
          </Button>

          {uploaded && (
            <Button
              variant="text"
              size="small"
              startIcon={
                fetching
                  ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                  : <RefreshIcon fontSize="small" />
              }
              onClick={() => handleRefreshComparison(person.id, isSpouse)}
              disabled={fetching}
              sx={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
            >
              Recalculate
            </Button>
          )}

          {status === 'done' && (
            <Chip label="Uploaded ✓" size="small" sx={{ bgcolor: 'rgba(45,212,170,0.12)', color: 'var(--color-positive)' }} />
          )}
          {status === 'error' && (
            <Chip label="Upload failed" size="small" sx={{ bgcolor: 'rgba(248,113,113,0.12)', color: 'var(--color-negative)' }} />
          )}
        </Box>

        {fetching && !comp && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={16} sx={{ color: 'var(--color-accent)' }} />
            <Typography sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Calculating benefit estimates…
            </Typography>
          </Box>
        )}

        {comp && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <BenefitCard label="Early (Age 62)" benefit={comp.early} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <BenefitCard label="Full Retirement Age" benefit={comp.fra} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <BenefitCard label="Late (Age 70)" benefit={comp.late} recommended />
            </Grid>
          </Grid>
        )}

        {!comp && !fetching && uploaded && (
          <Alert severity="warning" sx={{ fontSize: '0.8125rem' }}>
            Earnings are uploaded but no estimates are available. Click Recalculate or ensure
            your birth year is saved in Inputs.
          </Alert>
        )}

        {!uploaded && (
          <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
            Upload your SSA earnings history CSV to see benefit estimates. Use the template at{' '}
            <code>backend/database/ss_earnings_template.csv</code> — fill in your annual
            earnings from your SSA statement at mysocialsecurity.gov.
          </Alert>
        )}
      </Box>
    )
  }

  return (
    <Box className="page-enter" sx={{ maxWidth: 900 }}>
      <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 0.5 }}>Social Security</Typography>
      <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem', mb: 3 }}>
        Upload earnings history and compare claiming strategies. Benefit estimates persist
        across sessions — re-upload only if your earnings history changes.
      </Typography>
      <PersonSSPanel person={primary} comp={comparison} isSpouse={false} fileInputRef={fileRef} />
      {spouse && <PersonSSPanel person={spouse} comp={spouseComparison} isSpouse fileInputRef={spouseFileRef} />}
    </Box>
  )
}


// =============================================================================
// NestEgg - src/pages/RetirementPage.tsx
// Bridge strategy display and retirement income waterfall.
// =============================================================================

import { Box as RBox, Typography as RTyp, Alert as RAlert, Grid as RGrid } from '@mui/material'
import { useResultStore as useRS } from '../store/resultStore'
import { useInputStore as useIS } from '../store/inputStore'
import { formatCurrency as fC } from '../utils/formatters'

export function RetirementPage() {
  const { getActiveProjection } = useRS()
  const { scenarioId, primary, assumptions } = useIS()
  const projection = getActiveProjection()

  if (!scenarioId) return <RAlert severity="info">No scenario loaded.</RAlert>
  if (!projection) return <RAlert severity="info">Run a projection first to see retirement detail.</RAlert>

  const bridgeYears = projection.years.filter(y => y.phase === 'bridge')
  const distYears = projection.years.filter(y => y.phase === 'distribution')

  return (
    <RBox className="page-enter" sx={{ maxWidth: 900 }}>
      <RTyp variant="h2" sx={{ fontSize: '1.75rem', mb: 0.5 }}>Retirement</RTyp>
      <RTyp sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem', mb: 3 }}>
        Bridge strategy and distribution phase overview.
      </RTyp>

      {/* Bridge period */}
      {bridgeYears.length > 0 && (
        <RBox sx={{ mb: 4 }}>
          <RTyp sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 2 }}>
            Bridge Period (Age {primary?.planned_retirement_age}–59½)
          </RTyp>
          <RBox sx={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'auto' }}>
            <RBox component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <RBox component="thead">
                <RBox component="tr" sx={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Year', 'Age', 'HYSA', 'Brokerage', 'Trad 401k', 'SS', 'Total Income', 'Tax'].map(h => (
                    <RBox component="th" key={h} sx={{ px: 2, py: 1.25, textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase', '&:first-of-type': { textAlign: 'left' } }}>{h}</RBox>
                  ))}
                </RBox>
              </RBox>
              <RBox component="tbody">
                {bridgeYears.map(y => (
                  <RBox component="tr" key={y.calendar_year} sx={{ borderBottom: '1px solid var(--border-subtle)', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    {[
                      { val: y.calendar_year, left: true },
                      { val: y.age_primary },
                      { val: fC(y.withdrawals.hysa, { compact: true }) },
                      { val: fC(y.withdrawals.brokerage, { compact: true }) },
                      { val: fC(y.withdrawals.traditional_401k, { compact: true }) },
                      { val: fC(y.ss_primary + y.ss_spouse, { compact: true }) },
                      { val: fC(y.gross_income, { compact: true }) },
                      { val: fC(y.tax?.total_tax ?? 0, { compact: true }) },
                    ].map((cell, i) => (
                      <RBox component="td" key={i} sx={{ px: 2, py: 1, textAlign: cell.left ? 'left' : 'right', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{cell.val}</RBox>
                    ))}
                  </RBox>
                ))}
              </RBox>
            </RBox>
          </RBox>
        </RBox>
      )}

      {/* Healthcare summary */}
      {(assumptions?.healthcare_annual_cost ?? 0) > 0 && (
        <RBox sx={{ p: 2.5, borderRadius: 'var(--radius-lg)', bgcolor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', mb: 4 }}>
          <RTyp sx={{ fontWeight: 500, fontSize: '0.875rem', mb: 1 }}>Healthcare (Pre-Medicare)</RTyp>
          <RTyp sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Annual cost: <span className="num" style={{ color: 'var(--color-warning)' }}>{fC(assumptions!.healthcare_annual_cost)}</span> today's dollars ·
            Applied to ages {primary?.planned_retirement_age}–64, inflated annually.
          </RTyp>
        </RBox>
      )}

      {/* Distribution summary */}
      <RBox sx={{ p: 2.5, borderRadius: 'var(--radius-lg)', bgcolor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <RTyp sx={{ fontWeight: 500, fontSize: '0.875rem', mb: 2 }}>Distribution Phase Summary</RTyp>
        <RGrid container spacing={2}>
          {[
            { label: 'Distribution Years', value: distYears.length },
            { label: 'Avg Annual Tax', value: fC(distYears.reduce((s, y) => s + (y.tax?.total_tax ?? 0), 0) / Math.max(distYears.length, 1), { compact: true }) },
            { label: 'Total Roth Conversions', value: fC(distYears.reduce((s, y) => s + y.roth_ladder_conversion, 0), { compact: true }) },
            { label: 'Total SS Income', value: fC(distYears.reduce((s, y) => s + y.ss_primary + y.ss_spouse, 0), { compact: true }) },
          ].map(m => (
            <RGrid key={m.label} size={{ xs: 6, sm: 3 }}>
              <RTyp sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>{m.label}</RTyp>
              <RTyp className="num" sx={{ fontSize: '1.125rem' }}>{m.value}</RTyp>
            </RGrid>
          ))}
        </RGrid>
      </RBox>
    </RBox>
  )
}


// =============================================================================
// NestEgg - src/pages/TaxPage.tsx
// Tax bracket viewer and Roth conversion cost estimator.
// =============================================================================

import { useState as useTState, useEffect as useTEffect } from 'react'
import {
  Box as TBox, Typography as TTyp, Alert as TAlert,
  TextField as TTextField, Grid as TGrid,
  InputAdornment as TInputAdorn,
} from '@mui/material'
import { taxApi } from '../api'
import { formatCurrency as tfC, formatPercent as tfP } from '../utils/formatters'
import type { TaxBracketsResponse } from '../types'

export function TaxPage() {
  const [brackets, setBrackets] = useTState<TaxBracketsResponse | null>(null)
  const [income, setIncome] = useTState(150000)
  const [conversion, setConversion] = useTState(50000)
  const [conversionResult, setConversionResult] = useTState<Record<string, number> | null>(null)
  const [taxEstimate, setTaxEstimate] = useTState<Record<string, number> | null>(null)

  useTEffect(() => {
    taxApi.getBrackets().then(setBrackets)
  }, [])

  useTEffect(() => {
    if (income > 0) {
      taxApi.estimate({ ordinaryIncome: income }).then(setTaxEstimate)
    }
  }, [income])

  useTEffect(() => {
    if (income > 0 && conversion > 0) {
      taxApi.rothConversionCost({ existingIncome: income, conversionAmount: conversion }).then(setConversionResult)
    }
  }, [income, conversion])

  return (
    <TBox className="page-enter" sx={{ maxWidth: 900 }}>
      <TTyp variant="h2" sx={{ fontSize: '1.75rem', mb: 0.5 }}>Tax</TTyp>
      <TTyp sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem', mb: 3 }}>
        Federal tax brackets and Roth conversion cost estimator.
      </TTyp>

      {/* Bracket table */}
      {brackets && (
        <TBox sx={{ mb: 4, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <TBox sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid var(--border-subtle)' }}>
            <TTyp sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {brackets.tax_year} Federal Tax Brackets — MFJ
            </TTyp>
            <TTyp sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Standard deduction: {tfC(brackets.standard_deduction)}
            </TTyp>
          </TBox>
          <TBox component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
            <TBox component="thead">
              <TBox component="tr" sx={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Rate', 'Income Min', 'Income Max', 'Bracket Width'].map(h => (
                  <TBox component="th" key={h} sx={{ px: 2.5, py: 1.25, textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase', '&:first-of-type': { textAlign: 'left' } }}>{h}</TBox>
                ))}
              </TBox>
            </TBox>
            <TBox component="tbody">
              {brackets.brackets.map((b, i) => {
                const width = b.income_max ? b.income_max - b.income_min : null
                const isCurrentBracket = taxEstimate && income - brackets.standard_deduction >= b.income_min && (b.income_max === null || income - brackets.standard_deduction < b.income_max)
                return (
                  <TBox component="tr" key={i} sx={{ borderBottom: '1px solid var(--border-subtle)', '&:last-child': { borderBottom: 'none' }, bgcolor: isCurrentBracket ? 'rgba(45,212,170,0.06)' : 'transparent' }}>
                    <TBox component="td" sx={{ px: 2.5, py: 1.25, color: isCurrentBracket ? 'var(--color-accent)' : 'var(--text-primary)', fontWeight: isCurrentBracket ? 600 : 400 }}>{tfP(b.rate, 0)}</TBox>
                    <TBox component="td" sx={{ px: 2.5, py: 1.25, textAlign: 'right', color: 'var(--text-secondary)' }}>{tfC(b.income_min)}</TBox>
                    <TBox component="td" sx={{ px: 2.5, py: 1.25, textAlign: 'right', color: 'var(--text-secondary)' }}>{b.income_max ? tfC(b.income_max) : 'No limit'}</TBox>
                    <TBox component="td" sx={{ px: 2.5, py: 1.25, textAlign: 'right', color: 'var(--text-muted)' }}>{width ? tfC(width, { compact: true }) : '—'}</TBox>
                  </TBox>
                )
              })}
            </TBox>
          </TBox>
        </TBox>
      )}

      {/* Tax estimator */}
      <TBox sx={{ p: 2.5, borderRadius: 'var(--radius-lg)', bgcolor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', mb: 3 }}>
        <TTyp sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 2 }}>Tax Estimator</TTyp>
        <TGrid container spacing={2} alignItems="center">
          <TGrid size={{ xs: 12, sm: 4 }}>
            <TTextField
              fullWidth
              label="Ordinary Income"
              type="number"
              value={income}
              onChange={e => setIncome(Number(e.target.value))}
              InputProps={{ startAdornment: <TInputAdorn position="start">$</TInputAdorn> }}
            />
          </TGrid>
          {taxEstimate && (
            <>
              <TGrid size={{ xs: 6, sm: 2 }}>
                <TTyp sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>Tax Owed</TTyp>
                <TTyp className="num" sx={{ fontSize: '1.125rem', color: 'var(--color-negative)' }}>{tfC(taxEstimate.ordinary_tax ?? taxEstimate.total_tax, { compact: true })}</TTyp>
              </TGrid>
              <TGrid size={{ xs: 6, sm: 2 }}>
                <TTyp sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>Effective Rate</TTyp>
                <TTyp className="num" sx={{ fontSize: '1.125rem' }}>{tfP(taxEstimate.effective_rate ?? 0)}</TTyp>
              </TGrid>
              <TGrid size={{ xs: 6, sm: 2 }}>
                <TTyp sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>Marginal Rate</TTyp>
                <TTyp className="num" sx={{ fontSize: '1.125rem' }}>{tfP(taxEstimate.marginal_rate ?? 0)}</TTyp>
              </TGrid>
            </>
          )}
        </TGrid>
      </TBox>

      {/* Roth conversion cost */}
      <TBox sx={{ p: 2.5, borderRadius: 'var(--radius-lg)', bgcolor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <TTyp sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 2 }}>Roth Conversion Cost Estimator</TTyp>
        <TGrid container spacing={2} alignItems="center">
          <TGrid size={{ xs: 12, sm: 4 }}>
            <TTextField
              fullWidth
              label="Conversion Amount"
              type="number"
              value={conversion}
              onChange={e => setConversion(Number(e.target.value))}
              InputProps={{ startAdornment: <TInputAdorn position="start">$</TInputAdorn> }}
            />
          </TGrid>
          {conversionResult && (
            <>
              <TGrid size={{ xs: 6, sm: 2 }}>
                <TTyp sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>Tax Cost</TTyp>
                <TTyp className="num" sx={{ fontSize: '1.125rem', color: 'var(--color-negative)' }}>{tfC(conversionResult.incremental_tax_cost, { compact: true })}</TTyp>
              </TGrid>
              <TGrid size={{ xs: 6, sm: 2 }}>
                <TTyp sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>Conversion Rate</TTyp>
                <TTyp className="num" sx={{ fontSize: '1.125rem' }}>{tfP(conversionResult.effective_conversion_rate)}</TTyp>
              </TGrid>
              <TGrid size={{ xs: 6, sm: 2 }}>
                <TTyp sx={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>Bracket Room Left</TTyp>
                <TTyp className="num" sx={{ fontSize: '1.125rem', color: 'var(--color-accent)' }}>{tfC(conversionResult.bracket_room_remaining, { compact: true })}</TTyp>
              </TGrid>
            </>
          )}
        </TGrid>
      </TBox>
    </TBox>
  )
}
