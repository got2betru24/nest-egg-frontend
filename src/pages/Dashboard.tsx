// =============================================================================
// NestEgg - src/pages/Dashboard.tsx
// Overview dashboard: key metrics, portfolio summary, readiness indicator,
// and quick-access cards for each section.
// =============================================================================

import {
  AccountBalance as AccountIcon,
  ArrowForward as ArrowIcon,
  AttachMoney as SpendIcon,
  AutoFixHigh as OptimizeIcon,
  BeachAccess as RetireIcon,
  CheckCircleOutline as CheckIcon,
  TrendingUp as TrendingUpIcon,
  WarningAmber as WarnIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid2,
  LinearProgress,
  Typography,
} from "@mui/material";
import { useInputStore } from "../store/inputStore";
import { useResultStore } from "../store/resultStore";
import { useUIStore } from "../store/uiStore";
import type { ProjectionResult } from "../types";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { ACCOUNT_COLORS as COLORS } from "../constants/colors";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, sub, accent, warn, onClick }: StatCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: "var(--radius-lg)",
        bgcolor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        cursor: onClick ? "pointer" : "default",
        transition:
          "border-color var(--transition-fast), background var(--transition-fast)",
        "&:hover": onClick
          ? {
              borderColor: "var(--border-strong)",
              bgcolor: "var(--bg-elevated)",
            }
          : {},
      }}
    >
      <Typography
        sx={{
          fontSize: "0.6875rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          mb: 1,
          fontFamily: "var(--font-body)",
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
      <Typography
        className="num"
        sx={{
          fontSize: "1.5rem",
          fontFamily: "var(--font-mono)",
          color: accent
            ? "var(--color-accent)"
            : warn
            ? "var(--color-warning)"
            : "var(--text-primary)",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          mb: sub ? 0.75 : 0,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          sx={{ fontSize: "0.75rem", color: "var(--text-secondary)", mt: 0.5 }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Account breakdown bar
// ---------------------------------------------------------------------------

interface AccountBarProps {
  result: ProjectionResult;
}

function AccountBar({ result }: AccountBarProps) {
  const retireYear = result.years.find((y) => y.phase !== "accumulation");
  const balances =
    retireYear?.balances_start ??
    result.years[result.years.length - 1]?.balances_end;
  if (!balances) return null;

  const total = balances.total;
  if (total === 0) return null;

  const segments = [
    { label: "HYSA", value: balances.hysa, color: COLORS.hysa },
    {
      label: "Brokerage",
      value: balances.brokerage,
      color: COLORS.brokerage,
    },
    {
      label: "Roth IRA",
      value: balances.roth_ira,
      color: COLORS.roth_ira,
    },
    {
      label: "Trad 401k",
      value: balances.traditional_401k,
      color: COLORS.traditional_401k,
    },
    {
      label: "Roth 401k",
      value: balances.roth_401k,
      color: COLORS.roth_401k,
    },
  ].filter((s) => s.value > 0);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          mb: 1.5,
        }}
      >
        {segments.map((seg) => (
          <Box
            key={seg.label}
            sx={{
              width: `${(seg.value / total) * 100}%`,
              bgcolor: seg.color,
              transition: "width var(--transition-slow)",
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {segments.map((seg) => (
          <Box
            key={seg.label}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: seg.color,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              {seg.label}
            </Typography>
            <Typography
              className="num"
              sx={{ fontSize: "0.75rem", color: "var(--text-primary)" }}
            >
              {formatCurrency(seg.value, { compact: true })}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Income coverage bar — shows % of retirement years meeting income target
// ---------------------------------------------------------------------------

interface IncomeCoverageBarProps {
  result: ProjectionResult;
}

function IncomeCoverageBar({ result }: IncomeCoverageBarProps) {
  const distYears = result.years.filter((y) => y.phase !== "accumulation");
  if (distYears.length === 0) return null;

  const metYears = distYears.filter((y) => y.income_gap >= -100).length; // within $100 tolerance
  const coveragePct = Math.round((metYears / distYears.length) * 100);

  const avgNetIncome =
    distYears.reduce((s, y) => s + y.net_income, 0) / distYears.length;
  const avgTarget =
    distYears.reduce((s, y) => s + y.income_target, 0) / distYears.length;

  const shortfallYears = distYears.filter((y) => y.income_gap < -100);
  const avgShortfall =
    shortfallYears.length > 0
      ? shortfallYears.reduce((s, y) => s + y.income_gap, 0) /
        shortfallYears.length
      : 0;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: "var(--radius-lg)",
        bgcolor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        mb: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SpendIcon sx={{ fontSize: 16, color: "var(--color-accent)" }} />
          <Typography sx={{ fontWeight: 500, fontSize: "0.875rem" }}>
            Income Target Coverage
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            className="num"
            sx={{
              fontSize: "1.25rem",
              color:
                coveragePct >= 100
                  ? "var(--color-positive)"
                  : coveragePct >= 85
                  ? "var(--color-warning)"
                  : "var(--color-negative)",
            }}
          >
            {coveragePct}%
          </Typography>
          <Chip
            label={
              coveragePct >= 100
                ? "Full Coverage"
                : coveragePct >= 85
                ? "Mostly Met"
                : "Shortfall"
            }
            size="small"
            sx={{
              bgcolor:
                coveragePct >= 100
                  ? "rgba(45,212,170,0.12)"
                  : coveragePct >= 85
                  ? "rgba(245,158,11,0.12)"
                  : "rgba(248,113,113,0.12)",
              color:
                coveragePct >= 100
                  ? "var(--color-positive)"
                  : coveragePct >= 85
                  ? "var(--color-warning)"
                  : "var(--color-negative)",
              border: "none",
            }}
          />
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={Math.min(coveragePct, 100)}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: "rgba(255,255,255,0.06)",
          mb: 1.5,
          "& .MuiLinearProgress-bar": {
            bgcolor:
              coveragePct >= 100
                ? "var(--color-positive)"
                : coveragePct >= 85
                ? "var(--color-warning)"
                : "var(--color-negative)",
          },
        }}
      />

      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <Box>
          <Typography
            sx={{
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Avg Net Spend/yr
          </Typography>
          <Typography
            className="num"
            sx={{ fontSize: "1rem", color: "var(--text-primary)" }}
          >
            {formatCurrency(avgNetIncome, { compact: true })}
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Avg Target/yr
          </Typography>
          <Typography
            className="num"
            sx={{ fontSize: "1rem", color: "var(--text-primary)" }}
          >
            {formatCurrency(avgTarget, { compact: true })}
          </Typography>
        </Box>
        {shortfallYears.length > 0 && (
          <Box>
            <Typography
              sx={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Shortfall Years
            </Typography>
            <Typography
              className="num"
              sx={{ fontSize: "1rem", color: "var(--color-negative)" }}
            >
              {shortfallYears.length} yrs (avg{" "}
              {formatCurrency(avgShortfall, { compact: true })})
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------

interface QuickCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  view: import("../store/uiStore").AppView;
  accent?: boolean;
}

function QuickCard({ icon, title, description, view, accent }: QuickCardProps) {
  const { setActiveView } = useUIStore();
  return (
    <Box
      onClick={() => setActiveView(view)}
      sx={{
        p: 2,
        borderRadius: "var(--radius-lg)",
        bgcolor: "var(--bg-surface)",
        border: `1px solid ${
          accent ? "rgba(45,212,170,0.2)" : "var(--border-subtle)"
        }`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        transition: "all var(--transition-fast)",
        "&:hover": {
          borderColor: "var(--color-accent)",
          bgcolor: "var(--bg-elevated)",
          transform: "translateY(-1px)",
          boxShadow: "0 4px 20px rgba(45,212,170,0.08)",
        },
      }}
    >
      <Box
        sx={{ color: accent ? "var(--color-accent)" : "var(--text-secondary)" }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: "0.875rem",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          lineHeight: 1.4,
        }}
      >
        {description}
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard() {
  const { scenarioId, assumptions, primary } = useInputStore();
  const { getActiveProjection, optimizedStrategy, isRunningProjection } =
    useResultStore();
  const { setActiveView } = useUIStore();

  const projection = getActiveProjection();

  const retirementYear = primary
    ? new Date().getFullYear() +
      (primary.planned_retirement_age -
        (new Date().getFullYear() - primary.birth_year))
    : null;

  const retirementRow = projection?.years.find(
    (y) => y.phase !== "accumulation"
  );
  const balanceAtRetirement = retirementRow?.balances_start.total ?? null;

  const lastRow = projection?.years[projection.years.length - 1];
  const finalBalance = lastRow?.balances_end.total ?? null;

  const yearsToRetirement = retirementYear
    ? retirementYear - new Date().getFullYear()
    : null;

  const planToAge = assumptions?.plan_to_age ?? 90;
  const retirementAge = primary?.planned_retirement_age ?? 55;
  const retirementDuration = planToAge - retirementAge;

  const survives = projection?.success ?? null;
  const depletionAge = projection?.depletion_age ?? null;

  const readinessPct = survives
    ? 100
    : depletionAge
    ? Math.round(((depletionAge - retirementAge) / retirementDuration) * 100)
    : null;

  // Compute effective tax rate on spending (total tax / total gross withdrawals)
  const distYears =
    projection?.years.filter((y) => y.phase !== "accumulation") ?? [];
  const totalGrossWithdrawals = distYears.reduce(
    (s, y) =>
      s +
      y.withdrawals.hysa +
      y.withdrawals.brokerage +
      y.withdrawals.roth_ira +
      y.withdrawals.traditional_401k +
      y.withdrawals.roth_401k,
    0
  );
  const totalTax = distYears.reduce((s, y) => s + (y.tax?.total_tax ?? 0), 0);
  const effectiveTaxOnSpending =
    totalGrossWithdrawals > 0 ? totalTax / totalGrossWithdrawals : null;

  return (
    <Box className="page-enter" sx={{ maxWidth: 1100 }}>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: "2rem", mb: 0.5 }}>
          Retirement Overview
        </Typography>
        <Typography
          sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
        >
          {scenarioId
            ? "Your retirement projection at a glance."
            : "Load or create a scenario to get started."}
        </Typography>
      </Box>

      {/* No scenario state */}
      {!scenarioId && (
        <Box
          sx={{
            p: 4,
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-default)",
            textAlign: "center",
            mb: 4,
          }}
        >
          <Typography variant="h3" sx={{ fontSize: "1.25rem", mb: 1 }}>
            No scenario loaded
          </Typography>
          <Typography
            sx={{ color: "var(--text-secondary)", mb: 3, fontSize: "0.875rem" }}
          >
            Create a new scenario or load an existing one to begin planning.
          </Typography>
          <Button
            variant="contained"
            startIcon={<OptimizeIcon />}
            onClick={() => setActiveView("inputs")}
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
          sx={{ mb: 3, alignItems: "center" }}
          action={
            <Button
              size="small"
              color="inherit"
              endIcon={<ArrowIcon fontSize="small" />}
              onClick={() => setActiveView("optimizer")}
            >
              View strategy
            </Button>
          }
        >
          <strong>Optimized strategy ready.</strong>{" "}
          {optimizedStrategy.rationale[0]}
        </Alert>
      )}

      {projection && !projection.success && (
        <Alert
          icon={<WarnIcon fontSize="small" />}
          severity="warning"
          sx={{ mb: 3 }}
        >
          <strong>Portfolio shortfall detected.</strong> Portfolio depletes at
          age {projection.depletion_age}. Run the optimizer for recommendations.
        </Alert>
      )}

      {scenarioId && (
        <Box className="stagger">
          {/* Stat cards row */}
          <Grid2 container spacing={2} sx={{ mb: 3 }}>
            <Grid2 size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Years to Retirement"
                value={
                  yearsToRetirement !== null ? `${yearsToRetirement}` : "—"
                }
                sub={retirementYear ? `Target: ${retirementYear}` : undefined}
              />
            </Grid2>
            <Grid2 size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Balance at Retirement"
                value={
                  balanceAtRetirement !== null
                    ? formatCurrency(balanceAtRetirement, { compact: true })
                    : "—"
                }
                sub={`Age ${retirementAge}`}
                accent={!!balanceAtRetirement}
              />
            </Grid2>
            <Grid2 size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Final Balance"
                value={
                  finalBalance !== null
                    ? formatCurrency(finalBalance, { compact: true })
                    : "—"
                }
                sub={`Age ${planToAge}`}
                accent={!!finalBalance && finalBalance > 0}
                warn={!!finalBalance && finalBalance <= 0}
              />
            </Grid2>
            <Grid2 size={{ xs: 6, md: 3 }}>
              <StatCard
                label="Tax Rate on Spending"
                value={
                  effectiveTaxOnSpending !== null
                    ? formatPercent(effectiveTaxOnSpending)
                    : "—"
                }
                sub="Lifetime effective rate"
              />
            </Grid2>
          </Grid2>

          {/* Income coverage — new primary readiness indicator */}
          {projection && <IncomeCoverageBar result={projection} />}

          {/* Portfolio readiness (portfolio survival) */}
          {readinessPct !== null && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: "var(--radius-lg)",
                bgcolor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 500, fontSize: "0.875rem" }}>
                  Portfolio Longevity
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    className="num"
                    sx={{
                      fontSize: "1.25rem",
                      color:
                        readinessPct >= 100
                          ? "var(--color-positive)"
                          : readinessPct >= 70
                          ? "var(--color-warning)"
                          : "var(--color-negative)",
                    }}
                  >
                    {readinessPct}%
                  </Typography>
                  <Chip
                    label={
                      readinessPct >= 100
                        ? "On Track"
                        : readinessPct >= 70
                        ? "At Risk"
                        : "Shortfall"
                    }
                    size="small"
                    sx={{
                      bgcolor:
                        readinessPct >= 100
                          ? "rgba(45,212,170,0.12)"
                          : readinessPct >= 70
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(248,113,113,0.12)",
                      color:
                        readinessPct >= 100
                          ? "var(--color-positive)"
                          : readinessPct >= 70
                          ? "var(--color-warning)"
                          : "var(--color-negative)",
                      border: "none",
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
                  bgcolor: "rgba(255,255,255,0.06)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor:
                      readinessPct >= 100
                        ? "var(--color-positive)"
                        : readinessPct >= 70
                        ? "var(--color-warning)"
                        : "var(--color-negative)",
                  },
                }}
              />
              {!survives && depletionAge && (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    mt: 1,
                  }}
                >
                  Portfolio runs out at age {depletionAge} —{" "}
                  {depletionAge - retirementAge} years into retirement
                </Typography>
              )}
            </Box>
          )}

          {/* Account breakdown at retirement */}
          {projection && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: "var(--radius-lg)",
                bgcolor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                mb: 3,
              }}
            >
              <Typography sx={{ fontWeight: 500, fontSize: "0.875rem", mb: 2 }}>
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
                borderRadius: "var(--radius-lg)",
                bgcolor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                mb: 3,
              }}
            >
              <Typography
                sx={{ fontWeight: 500, fontSize: "0.875rem", mb: 1.5 }}
              >
                Social Security
              </Typography>
              <Box sx={{ display: "flex", gap: 4 }}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      mb: 0.5,
                    }}
                  >
                    Total SS Received
                  </Typography>
                  <Typography
                    className="num"
                    sx={{ fontSize: "1.25rem", color: "var(--color-accent)" }}
                  >
                    {formatCurrency(projection.total_ss_received, {
                      compact: true,
                    })}
                  </Typography>
                </Box>
                {optimizedStrategy && (
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        mb: 0.5,
                      }}
                    >
                      Recommended Claiming
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        color: "var(--text-primary)",
                      }}
                    >
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
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              mb: 1.5,
              fontWeight: 500,
            }}
          >
            Quick Access
          </Typography>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<AccountIcon fontSize="small" />}
                title="Inputs"
                description="Update accounts, contributions, and personal details"
                view="inputs"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<TrendingUpIcon fontSize="small" />}
                title="Projection"
                description="Year-by-year account growth and income coverage"
                view="projection"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<OptimizeIcon fontSize="small" />}
                title="Withdrawal Planner"
                description="Optimal withdrawal order, Roth ladder, and SS timing"
                view="optimizer"
                accent
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
              <QuickCard
                icon={<RetireIcon fontSize="small" />}
                title="Retirement"
                description="Bridge strategy and retirement income waterfall"
                view="retirement"
              />
            </Grid2>
          </Grid2>
        </Box>
      )}

      {/* Loading overlay */}
      {isRunningProjection && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress />
          <Typography
            sx={{ fontSize: "0.75rem", color: "var(--text-muted)", mt: 1 }}
          >
            Running projection…
          </Typography>
        </Box>
      )}
    </Box>
  );
}
