// =============================================================================
// NestEgg - src/pages/InputsPage.tsx
// All user inputs: personal details, income, accounts, contributions,
// healthcare, and Roth ladder settings.
// =============================================================================

import { useState } from 'react'
import {
  Box, Typography, Grid, TextField, Switch, FormControlLabel,
  Slider, Divider, Collapse, IconButton, Tooltip, Button,
  InputAdornment, Select, MenuItem, FormControl, InputLabel, Alert,
} from '@mui/material'
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Save as SaveIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material'
import { useInputStore } from '../store/inputStore'
import { useUIStore } from '../store/uiStore'
import { assumptionsApi, accountApi, contributionApi } from '../api'
import type { AccountType } from '../types'

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

interface SectionProps {
  id: string
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ id, title, children, defaultOpen = true }: SectionProps) {
  const { expandedSections, toggleSection } = useUIStore()
  const isOpen = expandedSections[id] ?? defaultOpen

  return (
    <Box
      sx={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        bgcolor: 'var(--bg-surface)',
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box
        onClick={() => toggleSection(id)}
        sx={{
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</Typography>
        <IconButton size="small" sx={{ color: 'var(--text-muted)' }}>
          {isOpen ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={isOpen}>
        <Divider sx={{ borderColor: 'var(--border-subtle)' }} />
        <Box sx={{ p: 2.5 }}>{children}</Box>
      </Collapse>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Field label with optional info tooltip
// ---------------------------------------------------------------------------

function FieldLabel({ label, info }: { label: string; info?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
      <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {label}
      </Typography>
      {info && (
        <Tooltip title={info} placement="top">
          <InfoIcon sx={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'help' }} />
        </Tooltip>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Currency input
// ---------------------------------------------------------------------------

interface CurrencyInputProps {
  label: string
  value: number
  onChange: (val: number) => void
  info?: string
  min?: number
  max?: number
}

function CurrencyInput({ label, value, onChange, info, min = 0 }: CurrencyInputProps) {
  const [raw, setRaw] = useState(String(value))
  const [focused, setFocused] = useState(false)

  return (
    <Box>
      <FieldLabel label={label} info={info} />
      <TextField
        fullWidth
        value={focused ? raw : value.toLocaleString('en-US')}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9.]/g, '')
          setRaw(cleaned)
        }}
        onFocus={() => { setFocused(true); setRaw(String(value)) }}
        onBlur={() => {
          setFocused(false)
          const parsed = parseFloat(raw) || 0
          onChange(Math.max(min, parsed))
        }}
        InputProps={{
          startAdornment: <InputAdornment position="start">$</InputAdornment>,
          sx: { fontFamily: 'var(--font-mono)' },
        }}
        size="small"
      />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Percent input
// ---------------------------------------------------------------------------

interface PercentInputProps {
  label: string
  value: number  // 0–1
  onChange: (val: number) => void
  info?: string
}

function PercentInput({ label, value, onChange, info }: PercentInputProps) {
  return (
    <Box>
      <FieldLabel label={label} info={info} />
      <TextField
        fullWidth
        type="number"
        value={(value * 100).toFixed(2)}
        onChange={(e) => {
          const pct = parseFloat(e.target.value) || 0
          onChange(Math.max(0, Math.min(100, pct)) / 100)
        }}
        InputProps={{
          endAdornment: <InputAdornment position="end">%</InputAdornment>,
          inputProps: { step: 0.1, min: 0, max: 30 },
          sx: { fontFamily: 'var(--font-mono)' },
        }}
        size="small"
      />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Account row
// ---------------------------------------------------------------------------

const ACCOUNT_LABELS: Record<AccountType, string> = {
  hysa: 'High-Yield Savings (HYSA)',
  brokerage: 'Brokerage',
  roth_ira: 'Roth IRA (Combined)',
  traditional_401k: 'Traditional 401(k)',
  roth_401k: 'Roth 401(k)',
}

const ACCOUNT_COLORS: Record<AccountType, string> = {
  hysa: 'var(--color-hysa)',
  brokerage: 'var(--color-brokerage)',
  roth_ira: 'var(--color-roth-ira)',
  traditional_401k: 'var(--color-trad-401k)',
  roth_401k: 'var(--color-roth-401k)',
}

const ACCOUNT_TYPES: AccountType[] = [
  'hysa', 'brokerage', 'roth_ira', 'traditional_401k', 'roth_401k'
]

interface AccountRowProps {
  accountType: AccountType
}

function AccountRow({ accountType }: AccountRowProps) {
  const { accounts, setAccount, scenarioId } = useInputStore()
  const account = accounts[accountType]
  const balance = account?.current_balance ?? 0
  const returnBase = account?.return_base ?? 0.07

  const handleBalanceChange = (val: number) => {
    if (!account || !scenarioId) return
    const updated = { ...account, current_balance: val }
    setAccount(updated)
  }

  const handleReturnChange = (val: number) => {
    if (!account || !scenarioId) return
    const updated = {
      ...account,
      return_conservative: Math.max(0, val - 0.03),
      return_base: val,
      return_optimistic: val + 0.03,
    }
    setAccount(updated)
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        bgcolor: 'var(--bg-elevated)',
        mb: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: ACCOUNT_COLORS[accountType],
            flexShrink: 0,
          }}
        />
        <Typography sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
          {ACCOUNT_LABELS[accountType]}
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <CurrencyInput
            label="Current Balance"
            value={balance}
            onChange={handleBalanceChange}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <PercentInput
            label="Expected Return (base)"
            value={returnBase}
            onChange={handleReturnChange}
            info="Conservative/optimistic automatically set ±3%. Adjust in advanced settings."
          />
        </Grid>
      </Grid>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Main InputsPage
// ---------------------------------------------------------------------------

export function InputsPage() {
  const {
    scenarioId, primary, spouse, assumptions,
    accounts, contributions,
    setAssumptions, setContribution, markDirty,
  } = useInputStore()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Derive contribution values from store (keyed by account_id)
  const trad401kAccount = accounts['traditional_401k']
  const roth401kAccount = accounts['roth_401k']
  const rothIraAccount  = accounts['roth_ira']

  const trad401kContrib  = trad401kAccount  ? contributions[trad401kAccount.id]  : null
  const roth401kContrib  = roth401kAccount  ? contributions[roth401kAccount.id]  : null
  const rothIraContrib   = rothIraAccount   ? contributions[rothIraAccount.id]   : null

  const updateContrib = async (
    account: typeof trad401kAccount,
    field: 'annual_amount' | 'employer_match_amount',
    value: number,
  ) => {
    if (!account) return
    const existing = contributions[account.id]
    const updated = {
      annual_amount: existing?.annual_amount ?? 0,
      employer_match_amount: existing?.employer_match_amount ?? 0,
      enforce_irs_limits: existing?.enforce_irs_limits ?? true,
      solve_mode: existing?.solve_mode ?? 'fixed' as const,
      [field]: value,
    }
    try {
      const saved = await contributionApi.upsert(account.id, updated)
      setContribution(saved)
      markDirty()
    } catch {
      // Optimistically update store even if save fails; user will retry on Run
      setContribution({ ...updated, id: existing?.id ?? 0, account_id: account.id })
      markDirty()
    }
  }

  if (!scenarioId) {
    return (
      <Box sx={{ maxWidth: 600 }}>
        <Alert severity="info">
          No scenario loaded. Use the scenario menu in the top bar to create or load one.
        </Alert>
      </Box>
    )
  }

  const handleSaveAssumptions = async () => {
    if (!assumptions || !scenarioId) return
    setSaveStatus('saving')
    try {
      await assumptionsApi.upsert(scenarioId, {
        inflation_rate: assumptions.inflation_rate,
        plan_to_age: assumptions.plan_to_age,
        filing_status: 'married_filing_jointly',
        current_income: assumptions.current_income,
        desired_retirement_income: assumptions.desired_retirement_income,
        healthcare_annual_cost: assumptions.healthcare_annual_cost,
        enable_catchup_contributions: assumptions.enable_catchup_contributions,
        enable_roth_ladder: assumptions.enable_roth_ladder,
        return_scenario: assumptions.return_scenario,
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  const updateAssumption = <K extends keyof typeof assumptions>(
    key: K,
    value: (typeof assumptions)[K]
  ) => {
    if (!assumptions) return
    setAssumptions({ ...assumptions, [key]: value })
    markDirty()
  }

  const currentAge = primary ? new Date().getFullYear() - primary.birth_year : 45
  const retirementAge = primary?.planned_retirement_age ?? 55

  return (
    <Box className="page-enter" sx={{ maxWidth: 800 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 0.5 }}>
            Inputs
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Configure your retirement planning parameters.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon fontSize="small" />}
          onClick={handleSaveAssumptions}
          disabled={saveStatus === 'saving'}
          sx={{ height: 32 }}
        >
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
        </Button>
      </Box>

      {/* ----------------------------------------------------------------
          Personal
          ---------------------------------------------------------------- */}
      <Section id="personal" title="Personal Details">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldLabel label="Your Birth Year" />
            <TextField
              fullWidth
              type="number"
              value={primary?.birth_year ?? ''}
              InputProps={{ inputProps: { min: 1940, max: 2000 } }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldLabel label="Spouse Birth Year" />
            <TextField
              fullWidth
              type="number"
              value={spouse?.birth_year ?? ''}
              InputProps={{ inputProps: { min: 1940, max: 2000 } }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FieldLabel
              label={`Target Retirement Age: ${retirementAge}`}
              info="The age at which you plan to stop working. Use the projection to test different ages."
            />
            <Slider
              value={retirementAge}
              min={50}
              max={70}
              step={1}
              marks={[
                { value: 50, label: '50' },
                { value: 55, label: '55' },
                { value: 60, label: '60' },
                { value: 65, label: '65' },
                { value: 70, label: '70' },
              ]}
              valueLabelDisplay="auto"
            />
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mt: 0.5 }}>
              Current age: {currentAge} · Years until retirement: {retirementAge - currentAge}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FieldLabel
              label={`Plan Through Age: ${assumptions?.plan_to_age ?? 90}`}
              info="The age to plan through for portfolio longevity. 90–95 is a common conservative choice."
            />
            <Slider
              value={assumptions?.plan_to_age ?? 90}
              onChange={(_, v) => updateAssumption('plan_to_age', v as number)}
              min={80}
              max={100}
              step={1}
              marks={[
                { value: 80, label: '80' },
                { value: 85, label: '85' },
                { value: 90, label: '90' },
                { value: 95, label: '95' },
                { value: 100, label: '100' },
              ]}
              valueLabelDisplay="auto"
            />
          </Grid>
        </Grid>
      </Section>

      {/* ----------------------------------------------------------------
          Income
          ---------------------------------------------------------------- */}
      <Section id="income" title="Income & Retirement Goals">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Current Household Income"
              value={assumptions?.current_income ?? 0}
              onChange={(v) => updateAssumption('current_income', v)}
              info="Combined household income. Used for Social Security projections and contribution context."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Desired Retirement Income (today's $)"
              value={assumptions?.desired_retirement_income ?? 0}
              onChange={(v) => updateAssumption('desired_retirement_income', v)}
              info="What you want to spend annually in retirement, in today's dollars. The model inflates this to future nominal dollars."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <PercentInput
              label="Inflation Rate"
              value={assumptions?.inflation_rate ?? 0.03}
              onChange={(v) => updateAssumption('inflation_rate', v)}
              info="Annual inflation assumption. Used to inflate your income target and nominal future values. 2.5–3.5% is typical."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Return Scenario</InputLabel>
              <Select
                value={assumptions?.return_scenario ?? 'base'}
                label="Return Scenario"
                onChange={(e) =>
                  updateAssumption('return_scenario', e.target.value as 'conservative' | 'base' | 'optimistic')
                }
              >
                <MenuItem value="conservative">Conservative</MenuItem>
                <MenuItem value="base">Base (Recommended)</MenuItem>
                <MenuItem value="optimistic">Optimistic</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Section>

      {/* ----------------------------------------------------------------
          Accounts
          ---------------------------------------------------------------- */}
      <Section id="accounts" title="Account Balances & Returns">
        {ACCOUNT_TYPES.map((type) => (
          <AccountRow key={type} accountType={type} />
        ))}
      </Section>

      {/* ----------------------------------------------------------------
          Contributions
          ---------------------------------------------------------------- */}
      <Section id="contributions" title="Annual Contributions">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Traditional 401(k) — Employee"
              value={trad401kContrib?.annual_amount ?? 0}
              onChange={(v) => updateContrib(trad401kAccount, 'annual_amount', v)}
              info="Your annual employee contribution to the traditional 401(k). IRS limit enforced."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Roth 401(k) — Employee"
              value={roth401kContrib?.annual_amount ?? 0}
              onChange={(v) => updateContrib(roth401kAccount, 'annual_amount', v)}
              info="Employee contributions to Roth 401(k). Combined with traditional 401(k) cannot exceed IRS limit."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Employer Match"
              value={trad401kContrib?.employer_match_amount ?? 0}
              onChange={(v) => updateContrib(trad401kAccount, 'employer_match_amount', v)}
              info="Annual employer 401(k) match. Does not count toward employee contribution limits."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Roth IRA (Combined Couple)"
              value={rothIraContrib?.annual_amount ?? 0}
              onChange={(v) => updateContrib(rothIraAccount, 'annual_amount', v)}
              info="Combined backdoor Roth IRA contributions for both spouses. Limit is 2× the IRS individual limit."
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={assumptions?.enable_catchup_contributions ?? false}
                  onChange={(e) =>
                    updateAssumption('enable_catchup_contributions', e.target.checked)
                  }
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: '0.875rem' }}>Enable catch-up contributions</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Activates age 50+ IRS catch-up limits automatically. SECURE 2.0 enhanced catch-up
                    (ages 60–63) applied when applicable.
                  </Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>
      </Section>

      {/* ----------------------------------------------------------------
          Healthcare bridge
          ---------------------------------------------------------------- */}
      <Section id="healthcare" title="Healthcare (Pre-Medicare)" defaultOpen={false}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Annual Healthcare Cost (today's $)"
              value={assumptions?.healthcare_annual_cost ?? 0}
              onChange={(v) => updateAssumption('healthcare_annual_cost', v)}
              info="Estimated annual out-of-pocket healthcare cost from retirement until Medicare eligibility at 65. Inflated each year in the model."
            />
          </Grid>
        </Grid>
        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)', mt: 1.5 }}>
          Applied to years between your retirement age and age 65. After 65, this cost is removed from the income target.
        </Typography>
      </Section>

      {/* ----------------------------------------------------------------
          Roth ladder
          ---------------------------------------------------------------- */}
      <Section id="roth" title="Roth Conversion Ladder" defaultOpen={false}>
        <FormControlLabel
          control={
            <Switch
              checked={assumptions?.enable_roth_ladder ?? false}
              onChange={(e) => updateAssumption('enable_roth_ladder', e.target.checked)}
              size="small"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: '0.875rem' }}>Enable Roth conversion ladder</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Systematically converts traditional 401(k) funds to Roth during low-income retirement
                years to minimize lifetime taxes. The optimizer determines the optimal amount and bracket ceiling.
              </Typography>
            </Box>
          }
          sx={{ mb: 2 }}
        />
        {assumptions?.enable_roth_ladder && (
          <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
            The optimizer will determine the optimal conversion amount and bracket ceiling. You can override
            per-year amounts in the Optimizer view after running it.
          </Alert>
        )}
      </Section>

    </Box>
  )
}
