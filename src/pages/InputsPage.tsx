// =============================================================================
// NestEgg - src/pages/InputsPage.tsx
// All user inputs: personal details, income, accounts, contributions,
// healthcare, and Roth ladder settings.
// =============================================================================

import {
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
  InfoOutlined as InfoIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  Grid2,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import { accountApi, assumptionsApi, contributionApi, personApi } from "../api";
import { useInputStore } from "../store/inputStore";
import { useUIStore } from "../store/uiStore";
import type { AccountType, AssumptionsCreate } from "../types";
import { ACCOUNT_COLORS as HEX_COLORS } from "../constants/colors";

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ id, title, children, defaultOpen = true }: SectionProps) {
  const { expandedSections, toggleSection } = useUIStore();
  const isOpen = expandedSections[id] ?? defaultOpen;

  return (
    <Box
      sx={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        bgcolor: "var(--bg-surface)",
        overflow: "hidden",
        mb: 2,
      }}
    >
      <Box
        onClick={() => toggleSection(id)}
        sx={{
          px: 2.5,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          "&:hover": { bgcolor: "rgba(255,255,255,0.02)" },
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
          {title}
        </Typography>
        <IconButton size="small" sx={{ color: "var(--text-muted)" }}>
          {isOpen ? (
            <CollapseIcon fontSize="small" />
          ) : (
            <ExpandIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
      <Collapse in={isOpen}>
        <Divider sx={{ borderColor: "var(--border-subtle)" }} />
        <Box sx={{ p: 2.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Field label with optional info tooltip
// ---------------------------------------------------------------------------

function FieldLabel({ label, info }: { label: string; info?: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
      <Typography sx={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
        {label}
      </Typography>
      {info && (
        <Tooltip title={info} placement="top">
          <InfoIcon
            sx={{ fontSize: 13, color: "var(--text-muted)", cursor: "help" }}
          />
        </Tooltip>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Currency input
// ---------------------------------------------------------------------------

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  info?: string;
  min?: number;
  max?: number;
}

function CurrencyInput({
  label,
  value,
  onChange,
  info,
  min = 0,
}: CurrencyInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  return (
    <Box>
      <FieldLabel label={label} info={info} />
      <TextField
        fullWidth
        value={focused ? raw : value.toLocaleString("en-US")}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9.]/g, "");
          setRaw(cleaned);
        }}
        onFocus={() => {
          setFocused(true);
          setRaw(String(value));
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseFloat(raw) || 0;
          onChange(Math.max(min, parsed));
        }}
        InputProps={{
          startAdornment: <InputAdornment position="start">$</InputAdornment>,
          sx: { fontFamily: "var(--font-mono)" },
        }}
        size="small"
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Percent input
// ---------------------------------------------------------------------------

interface PercentInputProps {
  label: string;
  value: number; // 0–1
  onChange: (val: number) => void;
  info?: string;
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
          const pct = parseFloat(e.target.value) || 0;
          onChange(Math.max(0, Math.min(100, pct)) / 100);
        }}
        InputProps={{
          endAdornment: <InputAdornment position="end">%</InputAdornment>,
          inputProps: { step: 0.1, min: 0, max: 30 },
          sx: { fontFamily: "var(--font-mono)" },
        }}
        size="small"
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Account row
// ---------------------------------------------------------------------------

const ACCOUNT_LABELS: Record<AccountType, string> = {
  hysa: "High-Yield Savings (HYSA)",
  brokerage: "Brokerage",
  roth_ira: "Roth IRA (Combined)",
  traditional_401k: "Traditional 401(k)",
  roth_401k: "Roth 401(k)",
};

const ACCOUNT_COLORS: Record<AccountType, string> = {
  hysa: HEX_COLORS.hysa,
  brokerage: HEX_COLORS.brokerage,
  roth_ira: HEX_COLORS.roth_ira,
  traditional_401k: HEX_COLORS.traditional_401k,
  roth_401k: HEX_COLORS.roth_401k,
};

const ACCOUNT_TYPES: AccountType[] = [
  "hysa",
  "brokerage",
  "roth_ira",
  "traditional_401k",
  "roth_401k",
];

// Default base returns by account type and return scenario.
// Conservative/optimistic are always ±3% from base (mirrors handleReturnChange).
const SCENARIO_BASE_RETURNS: Record<string, Record<AccountType, number>> = {
  conservative: {
    hysa: 0.03,
    brokerage: 0.05,
    roth_ira: 0.05,
    traditional_401k: 0.05,
    roth_401k: 0.05,
  },
  base: {
    hysa: 0.04,
    brokerage: 0.07,
    roth_ira: 0.07,
    traditional_401k: 0.07,
    roth_401k: 0.07,
  },
  optimistic: {
    hysa: 0.05,
    brokerage: 0.10,
    roth_ira: 0.10,
    traditional_401k: 0.10,
    roth_401k: 0.10,
  },
};

interface AccountRowProps {
  accountType: AccountType;
}

function AccountRow({ accountType }: AccountRowProps) {
  const { accounts, setAccount, scenarioId } = useInputStore();
  const account = accounts[accountType];
  const balance = account?.current_balance ?? 0;
  const returnBase = account?.return_base ?? 0.07;

  const handleBalanceChange = (val: number) => {
    if (!account || !scenarioId) return;
    const updated = { ...account, current_balance: val };
    setAccount(updated);
  };

  const handleReturnChange = (val: number) => {
    if (!account || !scenarioId) return;
    const updated = {
      ...account,
      return_conservative: Math.max(0, val - 0.03),
      return_base: val,
      return_optimistic: val + 0.03,
    };
    setAccount(updated);
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        bgcolor: "var(--bg-elevated)",
        mb: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: ACCOUNT_COLORS[accountType],
            flexShrink: 0,
          }}
        />
        <Typography sx={{ fontWeight: 500, fontSize: "0.8125rem" }}>
          {ACCOUNT_LABELS[accountType]}
        </Typography>
      </Box>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <CurrencyInput
            label="Current Balance"
            value={balance}
            onChange={handleBalanceChange}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <PercentInput
            label="Expected Return (base)"
            value={returnBase}
            onChange={handleReturnChange}
            info="Conservative/optimistic automatically set ±3%. Adjust in advanced settings."
          />
        </Grid2>
      </Grid2>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main InputsPage
// ---------------------------------------------------------------------------

export function InputsPage() {
  const {
    scenarioId,
    primary,
    spouse,
    assumptions,
    accounts,
    contributions,
    setPrimary,
    setSpouse,
    setAssumptions,
    setAccount,
    setContribution,
    markDirty,
    markClean,
  } = useInputStore();
  const { optimizerAlert, setOptimizerAlert } = useUIStore();

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [snackMsg, setSnackMsg] = useState<string | null>(null);

  // Local person fields (birth years, retirement ages, individual incomes)
  const [primaryBirthYear, setPrimaryBirthYear] = useState(
    primary?.birth_year ?? new Date().getFullYear() - 45
  );
  const [primaryRetireAge, setPrimaryRetireAge] = useState(
    primary?.planned_retirement_age ?? 55
  );
  const [primaryIncome, setPrimaryIncome] = useState(
    primary?.current_income ?? 0
  );
  const [spouseBirthYear, setSpouseBirthYear] = useState(
    spouse?.birth_year ?? new Date().getFullYear() - 41
  );
  const [spouseRetireAge, setSpouseRetireAge] = useState(
    spouse?.planned_retirement_age ?? 55
  );
  const [spouseIncome, setSpouseIncome] = useState(
    spouse?.current_income ?? 0
  );

  // Sync local person fields when store hydrates (scenario load/duplicate/switch)
  useEffect(() => {
    setPrimaryBirthYear(primary?.birth_year ?? new Date().getFullYear() - 45);
    setPrimaryRetireAge(primary?.planned_retirement_age ?? 55);
    setPrimaryIncome(primary?.current_income ?? 0);
  }, [primary]);

  useEffect(() => {
    setSpouseBirthYear(spouse?.birth_year ?? new Date().getFullYear() - 41);
    setSpouseRetireAge(spouse?.planned_retirement_age ?? 55);
    setSpouseIncome(spouse?.current_income ?? 0);
  }, [spouse]);

  // Contribution field helpers
  const trad401kAccount = accounts["traditional_401k"];
  const roth401kAccount = accounts["roth_401k"];
  const rothIraAccount = accounts["roth_ira"];
  const hysaAccount = accounts["hysa"];
  const brokerageAccount = accounts["brokerage"];
  const trad401kContrib = trad401kAccount
    ? contributions[trad401kAccount.id]
    : null;
  const roth401kContrib = roth401kAccount
    ? contributions[roth401kAccount.id]
    : null;
  const rothIraContrib = rothIraAccount
    ? contributions[rothIraAccount.id]
    : null;
  const hysaContrib = hysaAccount ? contributions[hysaAccount.id] : null;
  const brokerageContrib = brokerageAccount
    ? contributions[brokerageAccount.id]
    : null;

  if (!scenarioId) {
    return (
      <Box sx={{ maxWidth: 600 }}>
        <Alert severity="info">
          No scenario loaded. Use the scenario menu in the top bar to create or
          load one.
        </Alert>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Save persons
  // ---------------------------------------------------------------------------
  const savePersons = async () => {
    // Primary
    if (primary) {
      const updated = await personApi.update(primary.id, {
        role: "primary",
        birth_year: primaryBirthYear,
        planned_retirement_age: primaryRetireAge,
        current_income: primaryIncome,
      });
      setPrimary(updated);
    } else {
      const created = await personApi.create(scenarioId, {
        role: "primary",
        birth_year: primaryBirthYear,
        planned_retirement_age: primaryRetireAge,
        current_income: primaryIncome,
      });
      setPrimary(created);
    }

    // Spouse
    if (spouse) {
      const updated = await personApi.update(spouse.id, {
        role: "spouse",
        birth_year: spouseBirthYear,
        planned_retirement_age: spouseRetireAge,
        current_income: spouseIncome,
      });
      setSpouse(updated);
    } else {
      // Always create spouse for MFJ planning
      const created = await personApi.create(scenarioId, {
        role: "spouse",
        birth_year: spouseBirthYear,
        planned_retirement_age: spouseRetireAge,
        current_income: spouseIncome,
      });
      setSpouse(created);
    }
  };

  // ---------------------------------------------------------------------------
  // Save assumptions
  // ---------------------------------------------------------------------------
  const saveAssumptions = async () => {
    if (!assumptions) return;
    const body: AssumptionsCreate = {
      inflation_rate: assumptions.inflation_rate,
      plan_to_age: assumptions.plan_to_age,
      filing_status: "married_filing_jointly",
      current_income: assumptions.current_income,
      desired_retirement_income: assumptions.desired_retirement_income,
      healthcare_annual_cost: assumptions.healthcare_annual_cost,
      enable_catchup_contributions: assumptions.enable_catchup_contributions,
      enable_roth_ladder: assumptions.enable_roth_ladder,
      return_scenario: assumptions.return_scenario,
    };
    const saved = await assumptionsApi.upsert(scenarioId, body);
    setAssumptions(saved);
  };

  // ---------------------------------------------------------------------------
  // Save all accounts + contributions
  // ---------------------------------------------------------------------------
  const saveAccounts = async () => {
    const allTypes: AccountType[] = [
      "hysa",
      "brokerage",
      "roth_ira",
      "traditional_401k",
      "roth_401k",
    ];
    for (const type of allTypes) {
      const acct = accounts[type];
      if (!acct) continue;
      const saved = await accountApi.upsert(scenarioId, {
        account_type: type,
        label: acct.label ?? undefined,
        current_balance: acct.current_balance,
        return_conservative: acct.return_conservative,
        return_base: acct.return_base,
        return_optimistic: acct.return_optimistic,
      });
      setAccount(saved);

      // Save contribution if it exists for this account
      const contrib = contributions[acct.id];
      if (contrib) {
        const savedContrib = await contributionApi.upsert(saved.id, {
          annual_amount: contrib.annual_amount,
          employer_match_amount: contrib.employer_match_amount,
          enforce_irs_limits: contrib.enforce_irs_limits,
          solve_mode: contrib.solve_mode,
        });
        setContribution(savedContrib);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Save everything
  // ---------------------------------------------------------------------------
  const handleSaveAll = async () => {
    setSaveStatus("saving");
    try {
      await savePersons();
      await saveAssumptions();
      await saveAccounts();
      markClean();
      setSaveStatus("saved");
      setOptimizerAlert(false);
      setSnackMsg("All inputs saved.");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setSaveStatus("error");
      setSnackMsg(
        err instanceof Error ? err.message : "Save failed — check the console."
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const updateAssumption = <K extends keyof NonNullable<typeof assumptions>>(
    key: K,
    value: NonNullable<typeof assumptions>[K]
  ) => {
    if (!assumptions) return;
    setAssumptions({ ...assumptions, [key]: value });
    markDirty();

    // When the return scenario changes, update all account base returns to
    // their defaults for that scenario. Users can still override per-account.
    if (key === "return_scenario") {
      const scenario = value as string;
      const defaults = SCENARIO_BASE_RETURNS[scenario];
      if (defaults) {
        ACCOUNT_TYPES.forEach((type) => {
          const account = accounts[type];
          if (!account) return;
          const base = defaults[type];
          setAccount({
            ...account,
            return_conservative: Math.max(0, base - 0.03),
            return_base: base,
            return_optimistic: base + 0.03,
          });
        });
      }
    }
  };

  const updateContrib = async (
    account: typeof trad401kAccount,
    field: "annual_amount" | "employer_match_amount",
    value: number
  ) => {
    if (!account) return;
    const existing = contributions[account.id];
    const updated = {
      annual_amount: existing?.annual_amount ?? 0,
      employer_match_amount: existing?.employer_match_amount ?? 0,
      enforce_irs_limits: existing?.enforce_irs_limits ?? true,
      solve_mode: (existing?.solve_mode ?? "fixed") as "fixed" | "solve_for",
      [field]: value,
    };
    try {
      const saved = await contributionApi.upsert(account.id, updated);
      setContribution(saved);
      markDirty();
    } catch {
      setContribution({
        ...updated,
        id: existing?.id ?? 0,
        account_id: account.id,
      });
      markDirty();
    }
  };

  const currentAge = new Date().getFullYear() - primaryBirthYear;

  return (
    <Box className="page-enter" sx={{ maxWidth: 800 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h2" sx={{ fontSize: "1.75rem", mb: 0.5 }}>
            Inputs
          </Typography>
          <Typography
            sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
          >
            Configure your retirement planning parameters.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon fontSize="small" />}
          onClick={handleSaveAll}
          disabled={saveStatus === "saving"}
          sx={{ height: 32 }}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? "Saved ✓"
              : "Save All"}
        </Button>
      </Box>

      {saveStatus === "error" && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setSaveStatus("idle")}
        >
          {snackMsg}
        </Alert>
      )}

      {optimizerAlert && (
        <Alert
          severity="info"
          sx={{ mb: 2, border: "1px solid var(--color-accent)" }}
        >
          Optimal contribution suggestions have been applied to your accounts
          below. Please Save All to avoid losing these changes.
        </Alert>
      )}

      {/* ----------------------------------------------------------------
          Personal
          ---------------------------------------------------------------- */}
      <Section id="personal" title="Personal Details">
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FieldLabel label="Your Birth Year" />
            <TextField
              fullWidth
              type="number"
              value={primaryBirthYear}
              onChange={(e) => {
                setPrimaryBirthYear(Number(e.target.value));
                markDirty();
              }}
              InputProps={{ inputProps: { min: 1940, max: 2000 } }}
              size="small"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FieldLabel label="Spouse Birth Year" />
            <TextField
              fullWidth
              type="number"
              value={spouseBirthYear}
              onChange={(e) => {
                setSpouseBirthYear(Number(e.target.value));
                markDirty();
              }}
              InputProps={{ inputProps: { min: 1940, max: 2000 } }}
              size="small"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FieldLabel
              label={`Your Retirement Age: ${primaryRetireAge}`}
              info="Age at which you plan to stop working."
            />
            <Slider
              value={primaryRetireAge}
              onChange={(_, v) => {
                setPrimaryRetireAge(v as number);
                markDirty();
              }}
              min={50}
              max={70}
              step={1}
              marks={[50, 55, 60, 65, 70].map((v) => ({
                value: v,
                label: String(v),
              }))}
              valueLabelDisplay="auto"
            />
            <Typography
              sx={{ fontSize: "0.75rem", color: "var(--text-muted)", mt: 0.5 }}
            >
              Current age: {currentAge} · Years until retirement:{" "}
              {Math.max(0, primaryRetireAge - currentAge)}
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FieldLabel
              label={`Spouse Retirement Age: ${spouseRetireAge}`}
              info="Spouse's planned retirement age. Can differ from yours."
            />
            <Slider
              value={spouseRetireAge}
              onChange={(_, v) => {
                setSpouseRetireAge(v as number);
                markDirty();
              }}
              min={50}
              max={70}
              step={1}
              marks={[50, 55, 60, 65, 70].map((v) => ({
                value: v,
                label: String(v),
              }))}
              valueLabelDisplay="auto"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FieldLabel
              label={`Plan Through Age: ${assumptions?.plan_to_age ?? 90}`}
              info="Portfolio longevity target. 90–95 is a common conservative choice."
            />
            <Slider
              value={assumptions?.plan_to_age ?? 90}
              onChange={(_, v) => updateAssumption("plan_to_age", v as number)}
              min={80}
              max={100}
              step={1}
              marks={[80, 85, 90, 95, 100].map((v) => ({
                value: v,
                label: String(v),
              }))}
              valueLabelDisplay="auto"
            />
          </Grid2>
        </Grid2>
      </Section>

      {/* ----------------------------------------------------------------
          Income
          ---------------------------------------------------------------- */}
      <Section id="income" title="Income & Retirement Goals">
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Your Income"
              value={primaryIncome}
              onChange={(v) => { setPrimaryIncome(v); markDirty(); }}
              info="Your individual earned income. Used to project your future Social Security earnings through retirement."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Spouse Income"
              value={spouseIncome}
              onChange={(v) => { setSpouseIncome(v); markDirty(); }}
              info="Spouse's individual earned income. Used to project their future Social Security earnings independently."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Desired Retirement Income (today's $)"
              value={assumptions?.desired_retirement_income ?? 0}
              onChange={(v) => updateAssumption("desired_retirement_income", v)}
              info="Annual spending target in retirement, in today's dollars. The model inflates this to nominal future dollars."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <PercentInput
              label="Inflation Rate"
              value={assumptions?.inflation_rate ?? 0.03}
              onChange={(v) => updateAssumption("inflation_rate", v)}
              info="Annual inflation assumption. 2.5–3.5% is typical."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Return Scenario</InputLabel>
              <Select
                value={assumptions?.return_scenario ?? "base"}
                label="Return Scenario"
                onChange={(e) =>
                  updateAssumption(
                    "return_scenario",
                    e.target.value as "conservative" | "base" | "optimistic"
                  )
                }
              >
                <MenuItem value="conservative">Conservative</MenuItem>
                <MenuItem value="base">Base (Recommended)</MenuItem>
                <MenuItem value="optimistic">Optimistic</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
        </Grid2>
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
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Traditional 401(k) — Employee"
              value={trad401kContrib?.annual_amount ?? 0}
              onChange={(v) =>
                updateContrib(trad401kAccount, "annual_amount", v)
              }
              info="Your annual employee contribution. IRS limit enforced."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Roth 401(k) — Employee"
              value={roth401kContrib?.annual_amount ?? 0}
              onChange={(v) =>
                updateContrib(roth401kAccount, "annual_amount", v)
              }
              info="Combined with traditional 401(k) cannot exceed IRS employee limit."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Employer Match"
              value={trad401kContrib?.employer_match_amount ?? 0}
              onChange={(v) =>
                updateContrib(trad401kAccount, "employer_match_amount", v)
              }
              info="Annual employer 401(k) match. Does not count toward employee limits."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Roth IRA (Combined Couple)"
              value={rothIraContrib?.annual_amount ?? 0}
              onChange={(v) =>
                updateContrib(rothIraAccount, "annual_amount", v)
              }
              info="Combined backdoor Roth IRA contributions for both spouses. Limit is 2× the individual IRS limit."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="High-Yield Savings (HYSA)"
              value={hysaContrib?.annual_amount ?? 0}
              onChange={(v) => updateContrib(hysaAccount, "annual_amount", v)}
              info="Annual cash savings added to your HYSA. Used as the first bridge drawdown source in early retirement."
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Brokerage"
              value={brokerageContrib?.annual_amount ?? 0}
              onChange={(v) =>
                updateContrib(brokerageAccount, "annual_amount", v)
              }
              info="Annual contributions to your taxable brokerage account. Gains taxed at LTCG rates in retirement."
            />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={assumptions?.enable_catchup_contributions ?? false}
                  onChange={(e) =>
                    updateAssumption(
                      "enable_catchup_contributions",
                      e.target.checked
                    )
                  }
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.875rem" }}>
                    Enable catch-up contributions
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    Activates age 50+ IRS catch-up limits. SECURE 2.0 enhanced
                    catch-up (ages 60–63) applied automatically.
                  </Typography>
                </Box>
              }
            />
          </Grid2>
        </Grid2>
      </Section>

      {/* ----------------------------------------------------------------
          Healthcare
          ---------------------------------------------------------------- */}
      <Section
        id="healthcare"
        title="Healthcare (Pre-Medicare)"
        defaultOpen={false}
      >
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <CurrencyInput
              label="Annual Healthcare Cost (today's $)"
              value={assumptions?.healthcare_annual_cost ?? 0}
              onChange={(v) => updateAssumption("healthcare_annual_cost", v)}
              info="Estimated annual out-of-pocket healthcare cost from retirement until Medicare at 65. Inflated each year in the model."
            />
          </Grid2>
        </Grid2>
        <Typography
          sx={{ fontSize: "0.75rem", color: "var(--text-muted)", mt: 1.5 }}
        >
          Applied to years between your retirement age and age 65. Removed after
          Medicare eligibility.
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
              onChange={(e) =>
                updateAssumption("enable_roth_ladder", e.target.checked)
              }
              size="small"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: "0.875rem" }}>
                Enable Roth conversion ladder
              </Typography>
              <Typography
                sx={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
              >
                Converts traditional 401(k) to Roth during low-income retirement
                years to minimize lifetime taxes. The optimizer determines the
                optimal amount and bracket ceiling.
              </Typography>
            </Box>
          }
          sx={{ mb: 2 }}
        />
        {assumptions?.enable_roth_ladder && (
          <Alert severity="info" sx={{ fontSize: "0.8125rem" }}>
            Run the Optimizer after saving to get the recommended conversion
            schedule. You can then override per-year amounts in the Optimizer
            view.
          </Alert>
        )}
      </Section>

      <Snackbar
        open={snackMsg !== null && saveStatus === "saved"}
        autoHideDuration={3000}
        onClose={() => setSnackMsg(null)}
        message={snackMsg}
      />
    </Box>
  );
}
