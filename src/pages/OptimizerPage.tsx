// =============================================================================
// NestEgg - src/pages/OptimizerPage.tsx
// Withdrawal Planner: recommended strategy, bracket-aware withdrawal order,
// Roth conversion ladder, withdrawal source mix, and SS claiming comparison.
// =============================================================================

import {
    AutoFixHigh as OptimizeIcon,
    InfoOutlined as InfoIcon
} from "@mui/icons-material";
import {
    Alert, Box, Button, Chip, CircularProgress, Grid2, Tooltip, Typography
} from "@mui/material";
import { useState } from "react";
import Plot from "react-plotly.js";
import { optimizerApi } from "../api";
import { useInputStore } from "../store/inputStore";
import { useResultStore } from "../store/resultStore";
import type { ProjectionYear } from "../types";
import { formatCurrency, formatPercent } from "../utils/formatters";

const LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "IBM Plex Mono, monospace", color: "#9aa0b4", size: 11 },
  margin: { t: 16, r: 16, b: 48, l: 72 },
  legend: {
    bgcolor: "transparent",
    font: { size: 11, color: "#9aa0b4" },
    orientation: "h" as const,
    y: -0.18,
  },
  xaxis: {
    Grid2color: "rgba(255,255,255,0.04)",
    linecolor: "rgba(255,255,255,0.08)",
    tickfont: { size: 10 },
    zeroline: false,
  },
  yaxis: {
    Grid2color: "rgba(255,255,255,0.04)",
    linecolor: "rgba(255,255,255,0.08)",
    tickfont: { size: 10 },
    zeroline: false,
  },
  hovermode: "x unified" as const,
  hoverlabel: {
    bgcolor: "#252d42",
    bordercolor: "rgba(255,255,255,0.10)",
    font: { family: "IBM Plex Mono, monospace", size: 11, color: "#f0ede8" },
  },
};

const COLORS = {
  hysa: "#60a5fa",
  brokerage: "#a78bfa",
  roth_ira: "#2dd4aa",
  trad_401k: "#f59e0b",
  roth_401k: "#34d399",
  ss: "#fb923c",
  target: "rgba(240,237,232,0.3)",
  net_income: "#2dd4aa",
};

// ---------------------------------------------------------------------------
// Rationale card
// ---------------------------------------------------------------------------

function RationaleCard({ rationale }: { rationale: string[] }) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: "var(--radius-lg)",
        bgcolor: "var(--color-accent-dim)",
        border: "1px solid rgba(45,212,170,0.2)",
        mb: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <OptimizeIcon sx={{ color: "var(--color-accent)", fontSize: 18 }} />
        <Typography
          sx={{
            fontWeight: 600,
            color: "var(--color-accent)",
            fontSize: "0.875rem",
          }}
        >
          Recommended Strategy
        </Typography>
      </Box>
      {rationale.map((line, i) => (
        <Typography
          key={i}
          sx={{
            fontSize: "0.8125rem",
            color: "var(--text-primary)",
            mb: 0.5,
            lineHeight: 1.5,
          }}
        >
          {i === 0 ? <strong>{line}</strong> : `• ${line}`}
        </Typography>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// SS comparison panel
// ---------------------------------------------------------------------------

function SSComparisonPanel({
  strategy,
}: {
  strategy: import("../types").OptimizedStrategy;
}) {
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
      <Typography sx={{ fontWeight: 500, fontSize: "0.875rem", mb: 2 }}>
        Social Security Claiming
      </Typography>
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Box>
          <Typography
            sx={{ fontSize: "0.75rem", color: "var(--text-muted)", mb: 0.5 }}
          >
            Primary — Recommended
          </Typography>
          <Chip
            label={strategy.primary_ss_claim_label}
            size="small"
            sx={{
              bgcolor: "var(--color-accent-dim)",
              color: "var(--color-accent)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </Box>
        {strategy.spouse_ss_claim_label && (
          <Box>
            <Typography
              sx={{ fontSize: "0.75rem", color: "var(--text-muted)", mb: 0.5 }}
            >
              Spouse — Recommended
            </Typography>
            <Chip
              label={strategy.spouse_ss_claim_label}
              size="small"
              sx={{
                bgcolor: "var(--color-accent-dim)",
                color: "var(--color-accent)",
                fontFamily: "var(--font-mono)",
              }}
            />
          </Box>
        )}
        {strategy.total_tax_saved_vs_no_ladder !== null &&
          strategy.roth_ladder_enabled && (
            <Box>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  mb: 0.5,
                }}
              >
                Roth Ladder Tax Savings
              </Typography>
              <Typography
                className="num"
                sx={{ fontSize: "1.125rem", color: "var(--color-positive)" }}
              >
                {formatCurrency(strategy.total_tax_saved_vs_no_ladder, {
                  compact: true,
                })}
              </Typography>
            </Box>
          )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Withdrawal source mix chart — visualizes the optimizer's year-by-year decisions
// ---------------------------------------------------------------------------

function WithdrawalMixChart({ years }: { years: ProjectionYear[] }) {
  const distYears = years.filter((y) => y.phase !== "accumulation");
  if (distYears.length === 0) return null;

  return (
    <Plot
      data={[
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.ss_primary + y.ss_spouse) / 1000),
          name: "Social Security",
          type: "bar",
          marker: { color: COLORS.ss + "cc" },
          hovertemplate: "<b>SS</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.withdrawals.hysa / 1000),
          name: "HYSA (tax-free)",
          type: "bar",
          marker: { color: COLORS.hysa + "cc" },
          hovertemplate: "<b>HYSA</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.withdrawals.brokerage / 1000),
          name: "Brokerage (LTCG)",
          type: "bar",
          marker: { color: COLORS.brokerage + "cc" },
          hovertemplate: "<b>Brokerage</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.withdrawals.traditional_401k / 1000),
          name: "Trad 401k (ordinary)",
          type: "bar",
          marker: { color: COLORS.trad_401k + "cc" },
          hovertemplate: "<b>Trad 401k</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map(
            (y) => (y.withdrawals.roth_ira + y.withdrawals.roth_401k) / 1000
          ),
          name: "Roth (last resort)",
          type: "bar",
          marker: { color: COLORS.roth_ira + "cc" },
          hovertemplate: "<b>Roth</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.income_target / 1000),
          name: "Income Target",
          type: "scatter",
          mode: "lines",
          line: { color: COLORS.target, width: 1.5, dash: "dot" },
          hovertemplate: "<b>Target</b>: $%{y:.0f}K<extra></extra>",
        },
      ]}
      layout={{
        ...LAYOUT,
        barmode: "stack",
        yaxis: { ...LAYOUT.yaxis, tickprefix: "$", ticksuffix: "K" },
        height: 300,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Net income vs target chart
// ---------------------------------------------------------------------------

function SpendCoverageChart({ years }: { years: ProjectionYear[] }) {
  const distYears = years.filter((y) => y.phase !== "accumulation");
  if (distYears.length === 0) return null;

  return (
    <Plot
      data={[
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.income_target / 1000),
          name: "Income Target",
          type: "scatter",
          mode: "lines",
          line: { color: COLORS.target, width: 1.5, dash: "dot" },
          hovertemplate: "<b>Target</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.net_income / 1000),
          name: "Net Spendable",
          type: "scatter",
          mode: "lines",
          line: { color: COLORS.net_income, width: 2 },
          fill: "tonexty",
          fillcolor: "rgba(45,212,170,0.08)",
          hovertemplate: "<b>Net Spend</b>: $%{y:.0f}K<extra></extra>",
        },
      ]}
      layout={{
        ...LAYOUT,
        yaxis: { ...LAYOUT.yaxis, tickprefix: "$", ticksuffix: "K" },
        height: 260,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Roth ladder chart
// ---------------------------------------------------------------------------

function RothLadderChart({
  strategy,
}: {
  strategy: import("../types").OptimizedStrategy;
}) {
  const years = strategy.projection.years.filter(
    (y) => y.roth_ladder_conversion > 0
  );
  if (years.length === 0)
    return (
      <Typography
        sx={{ color: "var(--text-muted)", fontSize: "0.875rem", py: 2 }}
      >
        No Roth conversions in this strategy.
      </Typography>
    );

  return (
    <Plot
      data={[
        {
          x: years.map((y) => y.calendar_year),
          y: years.map((y) => y.roth_ladder_conversion / 1000),
          name: "Conversion Amount",
          type: "bar",
          marker: { color: "#2dd4aacc" },
          hovertemplate: "<b>Conversion</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: years.map((y) => y.calendar_year),
          y: years.map((y) => (y.tax?.total_tax ?? 0) / 1000),
          name: "Tax Owed",
          type: "scatter",
          mode: "lines+markers",
          yaxis: "y2",
          line: { color: "#f87171", width: 1.5 },
          marker: { size: 4 },
          hovertemplate: "<b>Tax</b>: $%{y:.0f}K<extra></extra>",
        },
      ]}
      layout={{
        ...LAYOUT,
        barmode: "group",
        yaxis: { ...LAYOUT.yaxis, tickprefix: "$", ticksuffix: "K" },
        yaxis2: {
          overlaying: "y",
          side: "right",
          tickprefix: "$",
          ticksuffix: "K",
          Grid2color: "transparent",
          tickfont: { size: 10, color: "#5c6480" },
        },
        height: 260,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Dynamic withdrawal order explainer — replaces the old static list
// ---------------------------------------------------------------------------

function WithdrawalOrderPanel() {
  const steps = [
    {
      step: "1",
      label: "Brokerage",
      sub: "When ordinary income stays in 0% LTCG zone",
      color: "var(--color-brokerage)",
      detail:
        "Gains are tax-free when total income is below ~$96.7K (MFJ). Pulled first to capture this window before ordinary income fills the bracket.",
    },
    {
      step: "2",
      label: "Traditional 401(k)",
      sub: "Up to target bracket ceiling",
      color: "var(--color-trad-401k)",
      detail:
        'Ordinary income up to the Roth ladder ceiling (e.g. 22%). Only the "cheap" portion — bracket spill only as last resort.',
    },
    {
      step: "3",
      label: "HYSA",
      sub: "Tax-free cash — no bracket cost",
      color: "var(--color-hysa)",
      detail:
        "Already-taxed cash. No tax on withdrawal. Used to fill remaining need before touching Roth.",
    },
    {
      step: "4",
      label: "Roth IRA / 401(k)",
      sub: "Last resort — preserve tax-free growth",
      color: "var(--color-roth-ira)",
      detail:
        "Genuinely the last source. Roth grows tax-free indefinitely — every dollar not withdrawn today compounds without future tax.",
    },
    {
      step: "5",
      label: "Roth Conversion",
      sub: "After need is met — leftover bracket room",
      color: "#c4b5fd",
      detail:
        "Conversions run after all withdrawals are resolved, using only the bracket room that wasn't consumed by income needs. Conversions never displace spending.",
    },
    {
      step: "↔",
      label: "Brokerage vs. Traditional",
      sub: "Dynamic — depends on bracket position",
      color: "var(--text-muted)",
      detail:
        "If ordinary income is already above the LTCG stacking threshold, brokerage is pulled after traditional. The optimizer checks bracket position each year rather than following a fixed order.",
    },
  ];

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography sx={{ fontWeight: 500, fontSize: "0.875rem" }}>
          Dynamic Withdrawal Order
        </Typography>
        <Tooltip title="Unlike a fixed waterfall, the optimizer re-evaluates bracket position each year and picks the cheapest after-tax dollar available. Order changes based on SS taxability, LTCG thresholds, and remaining balances.">
          <InfoIcon
            sx={{ fontSize: 14, color: "var(--text-muted)", cursor: "help" }}
          />
        </Tooltip>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {steps.map((s) => (
          <Tooltip key={s.step} title={s.detail} placement="right">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1,
                borderRadius: "var(--radius-sm)",
                bgcolor: "var(--bg-elevated)",
                cursor: "help",
                "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
              }}
            >
              <Typography
                className="num"
                sx={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  width: 20,
                  flexShrink: 0,
                }}
              >
                {s.step}
              </Typography>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: s.color,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.3,
                  }}
                >
                  {s.sub}
                </Typography>
              </Box>
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Typography
        sx={{
          fontSize: "0.6875rem",
          color: "var(--text-muted)",
          mt: 1.5,
          lineHeight: 1.5,
        }}
      >
        Hover each step for detail. Brokerage placement and bracket spill
        decisions are re-evaluated every year based on actual income, SS
        taxability, and LTCG stacking thresholds.
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main OptimizerPage
// ---------------------------------------------------------------------------

export function OptimizerPage() {
  const {
    optimizedStrategy,
    isRunningOptimizer,
    setOptimizedStrategy,
    setRunningOptimizer,
    setOptimizerError,
  } = useResultStore();
  const { scenarioId } = useInputStore();
  const [chartTab, setChartTab] = useState<"mix" | "coverage" | "ladder">(
    "mix"
  );

  const handleRunOptimizer = async () => {
    if (!scenarioId) return;
    setRunningOptimizer(true);
    try {
      const result = await optimizerApi.run({ scenarioId });
      setOptimizedStrategy(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Optimizer failed";
      setOptimizerError(msg);
    } finally {
      setRunningOptimizer(false);
    }
  };

  if (!scenarioId) return <Alert severity="info">No scenario loaded.</Alert>;

  if (isRunningOptimizer) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 4 }}>
        <CircularProgress size={20} sx={{ color: "var(--color-accent)" }} />
        <Typography sx={{ color: "var(--text-secondary)" }}>
          Running optimizer — testing SS claiming ages, Roth ladder ceilings…
        </Typography>
      </Box>
    );
  }

  if (!optimizedStrategy) {
    return (
      <Box sx={{ maxWidth: 500 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h2" sx={{ fontSize: "1.75rem", mb: 0.5 }}>
            Withdrawal Planner
          </Typography>
          <Typography
            sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
          >
            Find the strategy that maximizes your spendable income in
            retirement.
          </Typography>
        </Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          The optimizer tests all combinations of Social Security claiming ages
          and Roth conversion ceilings, selecting the strategy that maximizes
          net spendable income across your retirement — not just tax savings.
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
    );
  }

  const projectionYears = optimizedStrategy.projection.years;

  // Compute income coverage % from optimized projection
  const distYears = projectionYears.filter((y) => y.phase !== "accumulation");
  const coveragePct =
    distYears.length > 0
      ? Math.round(
          (distYears.filter((y) => y.income_gap >= -100).length /
            distYears.length) *
            100
        )
      : null;

  // Effective tax rate on spending
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
  const totalTax = optimizedStrategy.projection.total_tax_paid;
  const effectiveTaxOnSpending =
    totalGrossWithdrawals > 0 ? totalTax / totalGrossWithdrawals : null;

  // Count bracket spill years and brokerage-at-zero years
  const spillYears = distYears.filter((y) =>
    y.notes.some((n) => n.includes("Bracket spill"))
  ).length;
  const zeroLtcgYears = distYears.filter((y) =>
    y.notes.some((n) => n.includes("0% LTCG"))
  ).length;

  return (
    <Box className="page-enter" sx={{ maxWidth: 1000 }}>
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
            Withdrawal Planner
          </Typography>
          <Typography
            sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
          >
            Spend-maximizing retirement strategy.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<OptimizeIcon fontSize="small" />}
          onClick={handleRunOptimizer}
        >
          Re-run
        </Button>
      </Box>

      {/* Rationale */}
      <RationaleCard rationale={optimizedStrategy.rationale} />

      {/* Key metrics */}
      <Grid2 container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: "Portfolio Survives?",
            value: optimizedStrategy.portfolio_survives ? "Yes ✓" : "No ✗",
            positive: optimizedStrategy.portfolio_survives,
          },
          {
            label: "Income Coverage",
            value: coveragePct !== null ? `${coveragePct}%` : "—",
            positive: coveragePct !== null && coveragePct >= 100,
          },
          {
            label: "Tax Rate on Spending",
            value:
              effectiveTaxOnSpending !== null
                ? formatPercent(effectiveTaxOnSpending)
                : "—",
          },
          {
            label: "Residual Balance",
            value: formatCurrency(optimizedStrategy.residual_balance, {
              compact: true,
            }),
            positive: optimizedStrategy.residual_balance > 0,
          },
        ].map((m) => (
          <Grid2 key={m.label} size={{ xs: 6, md: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: "var(--radius-lg)",
                bgcolor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  mb: 0.5,
                }}
              >
                {m.label}
              </Typography>
              <Typography
                className="num"
                sx={{
                  fontSize: "1.25rem",
                  color:
                    m.positive === true
                      ? "var(--color-positive)"
                      : m.positive === false
                      ? "var(--color-negative)"
                      : "var(--text-primary)",
                }}
              >
                {m.value}
              </Typography>
            </Box>
          </Grid2>
        ))}
      </Grid2>

      {/* Efficiency insight chips */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
        {zeroLtcgYears > 0 && (
          <Chip
            label={`${zeroLtcgYears} yrs brokerage at 0% LTCG`}
            size="small"
            sx={{
              bgcolor: "rgba(45,212,170,0.10)",
              color: "var(--color-accent)",
              fontSize: "0.75rem",
            }}
          />
        )}
        {spillYears > 0 && (
          <Chip
            label={`${spillYears} yrs bracket spill`}
            size="small"
            sx={{
              bgcolor: "rgba(248,113,113,0.10)",
              color: "var(--color-negative)",
              fontSize: "0.75rem",
            }}
          />
        )}
        <Chip
          label={`${formatCurrency(
            optimizedStrategy.projection.total_ss_received,
            { compact: true }
          )} SS lifetime`}
          size="small"
          sx={{
            bgcolor: "rgba(251,146,60,0.10)",
            color: "#fb923c",
            fontSize: "0.75rem",
          }}
        />
        <Chip
          label={`${formatCurrency(totalTax, { compact: true })} lifetime tax`}
          size="small"
          sx={{
            bgcolor: "rgba(255,255,255,0.06)",
            color: "var(--text-muted)",
            fontSize: "0.75rem",
          }}
        />
      </Box>

      {/* Chart tabs */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        {[
          { key: "mix", label: "Withdrawal Source Mix" },
          { key: "coverage", label: "Spend Coverage" },
          { key: "ladder", label: "Roth Ladder" },
        ].map((t) => (
          <Box
            key={t.key}
            onClick={() => setChartTab(t.key as typeof chartTab)}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: "var(--radius-md)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              bgcolor:
                chartTab === t.key ? "var(--color-accent-dim)" : "transparent",
              color:
                chartTab === t.key
                  ? "var(--color-accent)"
                  : "var(--text-muted)",
              border: `1px solid ${
                chartTab === t.key ? "rgba(45,212,170,0.3)" : "transparent"
              }`,
              "&:hover": { color: "var(--text-primary)" },
            }}
          >
            {t.label}
          </Box>
        ))}
      </Box>

      {/* Chart */}
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
          sx={{
            fontWeight: 500,
            fontSize: "0.875rem",
            mb: 2,
            color: "var(--text-secondary)",
          }}
        >
          {chartTab === "mix"
            ? "Annual Income by Source (000s)"
            : chartTab === "coverage"
            ? "Net Spendable vs Target (000s)"
            : "Roth Conversion Schedule"}
        </Typography>
        {chartTab === "mix" && <WithdrawalMixChart years={projectionYears} />}
        {chartTab === "coverage" && (
          <SpendCoverageChart years={projectionYears} />
        )}
        {chartTab === "ladder" && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box />
              <Chip
                label={
                  optimizedStrategy.roth_ladder_enabled
                    ? `≤ ${formatPercent(
                        optimizedStrategy.roth_ladder_target_bracket
                      )} bracket ceiling`
                    : "Disabled"
                }
                size="small"
                sx={{
                  bgcolor: optimizedStrategy.roth_ladder_enabled
                    ? "var(--color-accent-dim)"
                    : "rgba(255,255,255,0.06)",
                  color: optimizedStrategy.roth_ladder_enabled
                    ? "var(--color-accent)"
                    : "var(--text-muted)",
                }}
              />
            </Box>
            <RothLadderChart strategy={optimizedStrategy} />
            <Typography
              sx={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                mt: 1.5,
                lineHeight: 1.5,
              }}
            >
              Conversions run after all withdrawal needs are resolved — only
              leftover bracket room is used. Roth conversion never displaces
              spending.
            </Typography>
          </Box>
        )}
      </Box>

      {/* SS claiming */}
      <SSComparisonPanel strategy={optimizedStrategy} />

      {/* Dynamic withdrawal order */}
      <WithdrawalOrderPanel />
    </Box>
  );
}
