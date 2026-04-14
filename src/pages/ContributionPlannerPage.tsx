// =============================================================================
// NestEgg - src/pages/ContributionPlannerPage.tsx
// Solves for the minimum annual contributions across enabled account types
// needed to survive to plan_to_age. Results can be applied directly to
// the Inputs page via the contribution store.
// =============================================================================

import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Switch,
  Button,
  Alert,
  Divider,
  Chip,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  AutoMode as SolveIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
  ArrowForward as ApplyIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import { useInputStore } from "../store/inputStore";
import { useUIStore } from "../store/uiStore";
import { contributionPlannerApi, contributionApi } from "../api";
import { formatCurrency } from "../utils/formatters";
import type { ContributionPlanResult, AccountType } from "../types";

// ---------------------------------------------------------------------------
// Account config
// ---------------------------------------------------------------------------

interface AccountConfig {
  type: AccountType;
  label: string;
  color: string;
  hasIrsLimit: boolean;
  limitKey?: "limit_traditional_401k" | "limit_roth_401k" | "limit_roth_ira";
  includeKey: keyof InclusionState;
  resultKey: keyof ContributionPlanResult;
  info: string;
}

const ACCOUNT_CONFIGS: AccountConfig[] = [
  {
    type: "traditional_401k",
    label: "Traditional 401(k)",
    color: "var(--color-trad-401k)",
    hasIrsLimit: true,
    limitKey: "limit_traditional_401k",
    includeKey: "traditional_401k",
    resultKey: "traditional_401k_annual",
    info: "Pre-tax contributions reduce current taxable income. Filled first in the waterfall for maximum near-term tax leverage.",
  },
  {
    type: "roth_401k",
    label: "Roth 401(k)",
    color: "var(--color-roth-401k)",
    hasIrsLimit: true,
    limitKey: "limit_roth_401k",
    includeKey: "roth_401k",
    resultKey: "roth_401k_annual",
    info: "After-tax contributions that grow tax-free. Shares the same IRS employee limit pool as the traditional 401(k).",
  },
  {
    type: "roth_ira",
    label: "Roth IRA (Combined Couple)",
    color: "var(--color-roth-ira)",
    hasIrsLimit: true,
    limitKey: "limit_roth_ira",
    includeKey: "roth_ira",
    resultKey: "roth_ira_annual",
    info: "Combined backdoor Roth IRA for both spouses. Tax-free growth with flexible withdrawal rules.",
  },
  {
    type: "hysa",
    label: "High-Yield Savings (HYSA)",
    color: "var(--color-hysa)",
    hasIrsLimit: false,
    includeKey: "hysa",
    resultKey: "hysa_annual",
    info: "Liquid bridge savings. No IRS cap. Used as the first drawdown source in early retirement.",
  },
  {
    type: "brokerage",
    label: "Brokerage",
    color: "var(--color-brokerage)",
    hasIrsLimit: false,
    includeKey: "brokerage",
    resultKey: "brokerage_annual",
    info: "Taxable brokerage account. No IRS cap. Gains taxed at LTCG rates in retirement.",
  },
];

// ---------------------------------------------------------------------------
// Inclusion state
// ---------------------------------------------------------------------------

interface InclusionState {
  traditional_401k: boolean;
  roth_401k: boolean;
  roth_ira: boolean;
  hysa: boolean;
  brokerage: boolean;
}

// ---------------------------------------------------------------------------
// Result bar
// ---------------------------------------------------------------------------

interface ResultBarProps {
  config: AccountConfig;
  annual: number;
  limit?: number;
  employerMatch?: number;
}

function ResultBar({ config, annual, limit, employerMatch }: ResultBarProps) {
  const pct = limit && limit > 0 ? Math.min(100, (annual / limit) * 100) : null;
  const atLimit = pct !== null && pct >= 99.5;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        bgcolor: "var(--bg-elevated)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: config.color,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>
            {config.label}
          </Typography>
          {atLimit && (
            <Chip
              label="IRS MAX"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.625rem",
                fontWeight: 700,
                bgcolor: "rgba(245,158,11,0.15)",
                color: "var(--color-warning)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            />
          )}
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            className="num"
            sx={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--color-accent)",
            }}
          >
            {formatCurrency(annual)}
          </Typography>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
          >
            /year
          </Typography>
        </Box>
      </Box>

      {pct !== null && (
        <Box sx={{ mb: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.06)",
              "& .MuiLinearProgress-bar": {
                bgcolor: atLimit ? "var(--color-warning)" : config.color,
                borderRadius: 2,
              },
            }}
          />
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)", mt: 0.5 }}
          >
            {pct.toFixed(0)}% of {formatCurrency(limit!)} IRS limit
          </Typography>
        </Box>
      )}

      {employerMatch !== undefined && employerMatch > 0 && (
        <Typography
          sx={{
            fontSize: "0.6875rem",
            color: "var(--text-secondary)",
            mt: 0.5,
          }}
        >
          + {formatCurrency(employerMatch)}/yr employer match (not included in
          total)
        </Typography>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({ result }: { result: ContributionPlanResult }) {
  const totalWithMatch =
    result.total_annual_contribution + result.employer_match_annual;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: "var(--radius-lg)",
        border: result.solved
          ? "1px solid rgba(45,212,170,0.3)"
          : "1px solid rgba(248,113,113,0.3)",
        bgcolor: result.solved
          ? "rgba(45,212,170,0.05)"
          : "rgba(248,113,113,0.05)",
        mb: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        {result.solved ? (
          <CheckIcon sx={{ color: "var(--color-accent)", fontSize: 22 }} />
        ) : (
          <ErrorIcon sx={{ color: "var(--color-negative)", fontSize: 22 }} />
        )}
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: "0.9375rem" }}>
            {result.solved
              ? "Solution found"
              : "Infeasible at maximum contributions"}
          </Typography>
          <Typography
            sx={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
          >
            {result.solved
              ? "These contributions will sustain your portfolio to your target age."
              : "Even at IRS maximums, the portfolio does not survive to the target age."}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)", mb: 0.25 }}
          >
            Your contributions
          </Typography>
          <Typography
            className="num"
            sx={{
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "var(--color-accent)",
            }}
          >
            {formatCurrency(result.total_annual_contribution)}
          </Typography>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
          >
            /year
          </Typography>
        </Grid>
        {result.employer_match_annual > 0 && (
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography
              sx={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                mb: 0.25,
              }}
            >
              Employer match
            </Typography>
            <Typography
              className="num"
              sx={{ fontSize: "1.375rem", fontWeight: 700 }}
            >
              {formatCurrency(result.employer_match_annual)}
            </Typography>
            <Typography
              sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
            >
              /year
            </Typography>
          </Grid>
        )}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)", mb: 0.25 }}
          >
            Total household savings
          </Typography>
          <Typography
            className="num"
            sx={{ fontSize: "1.375rem", fontWeight: 700 }}
          >
            {formatCurrency(totalWithMatch)}
          </Typography>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
          >
            /year
          </Typography>
        </Grid>
        {result.projection && (
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography
              sx={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                mb: 0.25,
              }}
            >
              Final balance
            </Typography>
            <Typography
              className="num"
              sx={{
                fontSize: "1.375rem",
                fontWeight: 700,
                color:
                  result.projection.final_balance > 0
                    ? "inherit"
                    : "var(--color-negative)",
              }}
            >
              {formatCurrency(result.projection.final_balance)}
            </Typography>
            <Typography
              sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
            >
              at age {result.projection.years.at(-1)?.age_primary ?? "—"}
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ContributionPlannerPage() {
  const {
    scenarioId,
    accounts,
    contributions,
    assumptions,
    setContribution,
    markDirty,
  } = useInputStore();

  const { setActiveView, setOptimizerAlert } = useUIStore();

  const [inclusion, setInclusion] = useState<InclusionState>({
    traditional_401k: true,
    roth_401k: true,
    roth_ira: true,
    hysa: true,
    brokerage: true,
  });
  const [returnScenario, setReturnScenario] = useState<
    "conservative" | "base" | "optimistic"
  >("base");
  const [solving, setSolving] = useState(false);
  const [result, setResult] = useState<ContributionPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

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

  const handleSolve = async () => {
    setSolving(true);
    setError(null);
    setResult(null);
    try {
      const plan = await contributionPlannerApi.solve({
        scenario_id: scenarioId,
        return_scenario: returnScenario,
        include_traditional_401k: inclusion.traditional_401k,
        include_roth_401k: inclusion.roth_401k,
        include_roth_ira: inclusion.roth_ira,
        include_hysa: inclusion.hysa,
        include_brokerage: inclusion.brokerage,
      });
      setResult(plan);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Solver failed — check the console."
      );
    } finally {
      setSolving(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const updates: {
        accountType: string;
        field: "annual_amount";
        value: number;
      }[] = [
        {
          accountType: "traditional_401k",
          field: "annual_amount",
          value: result.traditional_401k_annual,
        },
        {
          accountType: "roth_401k",
          field: "annual_amount",
          value: result.roth_401k_annual,
        },
        {
          accountType: "roth_ira",
          field: "annual_amount",
          value: result.roth_ira_annual,
        },
        {
          accountType: "hysa",
          field: "annual_amount",
          value: result.hysa_annual,
        },
        {
          accountType: "brokerage",
          field: "annual_amount",
          value: result.brokerage_annual,
        },
      ];

      for (const { accountType, value } of updates) {
        const account = accounts[accountType];
        if (!account) continue;
        const existing = contributions[account.id];
        const body = {
          annual_amount: value,
          employer_match_amount: existing?.employer_match_amount ?? 0,
          enforce_irs_limits: existing?.enforce_irs_limits ?? true,
          solve_mode: "fixed" as const,
        };
        const saved = await contributionApi.upsert(account.id, body);
        setContribution(saved);
      }

      markDirty();
      setOptimizerAlert(true);
      setActiveView("inputs");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Apply failed — check the console."
      );
    } finally {
      setApplying(false);
    }
  };

  const anyEnabled = Object.values(inclusion).some(Boolean);

  return (
    <Box className="page-enter" sx={{ maxWidth: 800 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontSize: "1.75rem", mb: 0.5 }}>
          Contribution Planner
        </Typography>
        <Typography
          sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
        >
          Find the minimum annual contributions needed to reach your retirement
          goals. The solver freely allocates across your enabled accounts in
          tax-efficient order, respecting IRS limits.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Configuration */}
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
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
            Configure
          </Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          {/* Account toggles */}
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              mb: 1.5,
              fontWeight: 500,
            }}
          >
            Accounts to optimize
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2.5 }}>
            {ACCOUNT_CONFIGS.map((cfg) => (
              <Grid key={cfg.type} size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.25,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    bgcolor: inclusion[cfg.includeKey]
                      ? "rgba(255,255,255,0.03)"
                      : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: cfg.color,
                      }}
                    />
                    <Typography sx={{ fontSize: "0.8125rem" }}>
                      {cfg.label}
                    </Typography>
                    {cfg.hasIrsLimit && (
                      <Chip
                        label="IRS limit"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.5625rem",
                          bgcolor: "rgba(255,255,255,0.06)",
                          color: "var(--text-muted)",
                        }}
                      />
                    )}
                    <Tooltip title={cfg.info} placement="top">
                      <InfoIcon
                        sx={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          cursor: "help",
                        }}
                      />
                    </Tooltip>
                  </Box>
                  <Switch
                    checked={inclusion[cfg.includeKey]}
                    onChange={(e) =>
                      setInclusion((prev) => ({
                        ...prev,
                        [cfg.includeKey]: e.target.checked,
                      }))
                    }
                    size="small"
                  />
                </Box>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ borderColor: "var(--border-subtle)", mb: 2 }} />

          {/* Return scenario */}
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              mb: 1,
              fontWeight: 500,
            }}
          >
            Optimize against return scenario
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
            {(["conservative", "base", "optimistic"] as const).map((s) => (
              <Button
                key={s}
                variant={returnScenario === s ? "contained" : "outlined"}
                size="small"
                onClick={() => setReturnScenario(s)}
                sx={{ textTransform: "capitalize", minWidth: 100 }}
              >
                {s}
              </Button>
            ))}
          </Box>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)", mt: 0.75 }}
          >
            Using "conservative" finds contributions that survive even in poor
            market conditions.
          </Typography>
        </Box>
      </Box>

      {/* Solve button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={<SolveIcon />}
        onClick={handleSolve}
        disabled={solving || !anyEnabled}
        sx={{ mb: 3, height: 48 }}
      >
        {solving ? "Solving…" : "Find Optimal Contributions"}
      </Button>

      {solving && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            sx={{
              borderRadius: 1,
              bgcolor: "rgba(255,255,255,0.06)",
              "& .MuiLinearProgress-bar": { bgcolor: "var(--color-accent)" },
            }}
          />
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              mt: 1,
              textAlign: "center",
            }}
          >
            Running binary search across projection years…
          </Typography>
        </Box>
      )}

      {/* Results */}
      {result && (
        <>
          <SummaryCard result={result} />

          {/* Per-account breakdown */}
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              fontWeight: 500,
              mb: 1.5,
            }}
          >
            Per-account breakdown
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {ACCOUNT_CONFIGS.filter((cfg) => inclusion[cfg.includeKey]).map(
              (cfg) => {
                const annual = result[cfg.resultKey] as number;
                const limit = cfg.limitKey
                  ? (result[cfg.limitKey] as number)
                  : undefined;
                const empMatch =
                  cfg.type === "traditional_401k"
                    ? result.employer_match_annual
                    : undefined;
                return (
                  <Grid key={cfg.type} size={{ xs: 12, sm: 6 }}>
                    <ResultBar
                      config={cfg}
                      annual={annual}
                      limit={limit}
                      employerMatch={empMatch}
                    />
                  </Grid>
                );
              }
            )}
          </Grid>

          {/* Notes */}
          {result.notes.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {result.notes.map((note, i) => (
                <Alert
                  key={i}
                  severity={result.solved ? "info" : "warning"}
                  sx={{ mb: 1, fontSize: "0.8125rem" }}
                >
                  {note}
                </Alert>
              ))}
            </Box>
          )}

          {/* Apply button */}
          {result.solved && (
            <Box
              sx={{
                p: 2,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-subtle)",
                bgcolor: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Apply these contributions
                </Typography>
                <Typography
                  sx={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
                >
                  Writes the recommended amounts to the Inputs page. You can
                  review and adjust them there before saving.
                </Typography>
              </Box>
              <Button
                variant="contained"
                endIcon={<ApplyIcon />}
                onClick={handleApply}
                disabled={applying}
                sx={{ flexShrink: 0 }}
              >
                {applying ? "Applying…" : "Apply to Inputs"}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
