// =============================================================================
// NestEgg - src/pages/ProjectionPage.tsx
// Year-by-year projection charts: portfolio growth, income waterfall,
// tax breakdown. Scenario toggle (conservative / base / optimistic).
// =============================================================================

import { useState } from "react";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import Plot from "react-plotly.js";
import { useResultStore } from "../store/resultStore";
import { useInputStore } from "../store/inputStore";
import { formatCurrency, formatPercent } from "../utils/formatters";
import type { ProjectionYear, ReturnScenario } from "../types";

// ---------------------------------------------------------------------------
// Chart color palette (consistent with CSS vars)
// ---------------------------------------------------------------------------

const COLORS = {
  hysa: "#60a5fa",
  brokerage: "#a78bfa",
  roth_ira: "#2dd4aa",
  trad_401k: "#f59e0b",
  roth_401k: "#34d399",
  ss: "#fb923c",
  withdrawal: "#f87171",
  tax: "#94a3b8",
  total: "#f0ede8",
  income: "#2dd4aa",
  target: "rgba(240,237,232,0.3)",
};

const PLOTLY_LAYOUT_BASE: Partial<Plotly.Layout> = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "IBM Plex Mono, monospace", color: "#9aa0b4", size: 11 },
  margin: { t: 16, r: 16, b: 48, l: 72 },
  legend: {
    bgcolor: "transparent",
    font: { size: 11, color: "#9aa0b4" },
    orientation: "h",
    y: -0.18,
  },
  xaxis: {
    gridcolor: "rgba(255,255,255,0.04)",
    linecolor: "rgba(255,255,255,0.08)",
    tickfont: { size: 10 },
    zeroline: false,
  },
  yaxis: {
    gridcolor: "rgba(255,255,255,0.04)",
    linecolor: "rgba(255,255,255,0.08)",
    tickfont: { size: 10 },
    zeroline: false,
  },
  hovermode: "x unified",
  hoverlabel: {
    bgcolor: "#252d42",
    bordercolor: "rgba(255,255,255,0.10)",
    font: { family: "IBM Plex Mono, monospace", size: 11, color: "#f0ede8" },
  },
};

// ---------------------------------------------------------------------------
// Chart: Portfolio growth by account
// ---------------------------------------------------------------------------

function PortfolioGrowthChart({ years }: { years: ProjectionYear[] }) {
  const makeTrace = (
    key: keyof ProjectionYear["balances_end"],
    name: string,
    color: string
  ) => ({
    x: years.map((y) => y.calendar_year),
    y: years.map((y) => (y.balances_end[key] as number) / 1000),
    name,
    type: "scatter" as const,
    mode: "lines" as const,
    stackgroup: "one",
    line: { width: 0 },
    fillcolor: color + "cc",
    hovertemplate: `<b>${name}</b>: $%{y:.0f}K<extra></extra>`,
  });

  const retirementYear = years.find(
    (y) => y.phase !== "accumulation"
  )?.calendar_year;

  const shapes: Partial<Plotly.Shape>[] = retirementYear
    ? [
        {
          type: "line",
          x0: retirementYear,
          x1: retirementYear,
          y0: 0,
          y1: 1,
          yref: "paper",
          line: { color: "rgba(255,255,255,0.20)", width: 1, dash: "dot" },
        },
      ]
    : [];

  const annotations: Partial<Plotly.Annotations>[] = retirementYear
    ? [
        {
          x: retirementYear,
          y: 1,
          yref: "paper",
          text: "Retire",
          showarrow: false,
          font: { size: 10, color: "rgba(255,255,255,0.40)" },
          xanchor: "left",
          xshift: 4,
        },
      ]
    : [];

  return (
    <Plot
      data={[
        makeTrace("hysa", "HYSA", COLORS.hysa),
        makeTrace("brokerage", "Brokerage", COLORS.brokerage),
        makeTrace("roth_ira", "Roth IRA", COLORS.roth_ira),
        makeTrace("traditional_401k", "Trad 401k", COLORS.trad_401k),
        makeTrace("roth_401k", "Roth 401k", COLORS.roth_401k),
      ]}
      layout={{
        ...PLOTLY_LAYOUT_BASE,
        shapes,
        annotations,
        yaxis: {
          ...PLOTLY_LAYOUT_BASE.yaxis,
          tickprefix: "$",
          ticksuffix: "K",
        },
        height: 340,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Chart: Pre-tax vs Post-tax total
// ---------------------------------------------------------------------------

function PrePostTaxChart({ years }: { years: ProjectionYear[] }) {
  return (
    <Plot
      data={[
        {
          x: years.map((y) => y.calendar_year),
          y: years.map((y) => y.balances_end.total_posttax / 1000),
          name: "Post-Tax",
          type: "scatter",
          mode: "lines",
          stackgroup: "one",
          fillcolor: COLORS.roth_ira + "cc",
          line: { width: 0 },
          hovertemplate: "<b>Post-Tax</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: years.map((y) => y.calendar_year),
          y: years.map((y) => y.balances_end.total_pretax / 1000),
          name: "Pre-Tax",
          type: "scatter",
          mode: "lines",
          stackgroup: "one",
          fillcolor: COLORS.trad_401k + "cc",
          line: { width: 0 },
          hovertemplate: "<b>Pre-Tax</b>: $%{y:.0f}K<extra></extra>",
        },
      ]}
      layout={{
        ...PLOTLY_LAYOUT_BASE,
        yaxis: {
          ...PLOTLY_LAYOUT_BASE.yaxis,
          tickprefix: "$",
          ticksuffix: "K",
        },
        height: 340,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Chart: Annual income vs target (distribution phase only)
// ---------------------------------------------------------------------------

function IncomeChart({ years }: { years: ProjectionYear[] }) {
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
          y: distYears.map((y) => y.ss_primary / 1000),
          name: "Social Security",
          type: "bar",
          marker: { color: COLORS.ss + "cc" },
          hovertemplate: "<b>SS</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map(
            (y) => (y.withdrawals.hysa + y.withdrawals.brokerage) / 1000
          ),
          name: "Taxable Accts",
          type: "bar",
          marker: { color: COLORS.brokerage + "cc" },
          hovertemplate: "<b>Taxable</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.withdrawals.traditional_401k / 1000),
          name: "Trad 401k",
          type: "bar",
          marker: { color: COLORS.trad_401k + "cc" },
          hovertemplate: "<b>Trad 401k</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map(
            (y) => (y.withdrawals.roth_ira + y.withdrawals.roth_401k) / 1000
          ),
          name: "Roth",
          type: "bar",
          marker: { color: COLORS.roth_ira + "cc" },
          hovertemplate: "<b>Roth</b>: $%{y:.0f}K<extra></extra>",
        },
      ]}
      layout={{
        ...PLOTLY_LAYOUT_BASE,
        barmode: "stack",
        yaxis: {
          ...PLOTLY_LAYOUT_BASE.yaxis,
          tickprefix: "$",
          ticksuffix: "K",
        },
        height: 340,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Chart: Annual tax burden
// ---------------------------------------------------------------------------

function TaxChart({ years }: { years: ProjectionYear[] }) {
  const distYears = years.filter((y) => y.phase !== "accumulation" && y.tax);

  return (
    <Plot
      data={[
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => y.tax?.tax_owed ?? 0).map((v) => v / 1000),
          name: "Ordinary Tax",
          type: "bar",
          marker: { color: COLORS.tax + "cc" },
          hovertemplate: "<b>Ordinary</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears
            .map((y) => (y.tax?.ltcg_tax ?? 0) + (y.tax?.niit ?? 0))
            .map((v) => v / 1000),
          name: "LTCG / NIIT",
          type: "bar",
          marker: { color: COLORS.brokerage + "cc" },
          hovertemplate: "<b>LTCG/NIIT</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.tax?.effective_rate ?? 0) * 100),
          name: "Effective Rate",
          type: "scatter",
          mode: "lines",
          yaxis: "y2",
          line: { color: COLORS.income, width: 1.5 },
          hovertemplate: "<b>Effective</b>: %{y:.1f}%<extra></extra>",
        },
      ]}
      layout={{
        ...PLOTLY_LAYOUT_BASE,
        barmode: "stack",
        yaxis: {
          ...PLOTLY_LAYOUT_BASE.yaxis,
          tickprefix: "$",
          ticksuffix: "K",
        },
        yaxis2: {
          overlaying: "y",
          side: "right",
          ticksuffix: "%",
          gridcolor: "transparent",
          tickfont: { size: 10, color: "#5c6480" },
        },
        height: 340,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Chart panel wrapper
// ---------------------------------------------------------------------------

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: "var(--radius-lg)",
        bgcolor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
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
        {title}
      </Typography>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Summary stat strip
// ---------------------------------------------------------------------------

function SummaryStrip({ years }: { years: ProjectionYear[] }) {
  const retireYear = years.find((y) => y.phase !== "accumulation");
  const lastYear = years[years.length - 1];
  const totalSS = years.reduce((s, y) => s + y.ss_primary + y.ss_spouse, 0);
  const totalTax = years.reduce((s, y) => s + (y.tax?.total_tax ?? 0), 0);
  const totalRothConv = years.reduce((s, y) => s + y.roth_ladder_conversion, 0);

  const stats = [
    {
      label: "Balance at Retirement",
      value: formatCurrency(retireYear?.balances_start.total ?? 0, {
        compact: true,
      }),
    },
    {
      label: "Final Balance",
      value: formatCurrency(lastYear?.balances_end.total ?? 0, {
        compact: true,
      }),
    },
    {
      label: "Total SS Received",
      value: formatCurrency(totalSS, { compact: true }),
    },
    {
      label: "Lifetime Tax Paid",
      value: formatCurrency(totalTax, { compact: true }),
    },
    {
      label: "Roth Conversions",
      value: formatCurrency(totalRothConv, { compact: true }),
    },
  ];

  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
      {stats.map((s) => (
        <Box key={s.label} sx={{ flex: "1 1 140px" }}>
          <Typography
            sx={{
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              mb: 0.25,
            }}
          >
            {s.label}
          </Typography>
          <Typography
            className="num"
            sx={{ fontSize: "1.125rem", color: "var(--text-primary)" }}
          >
            {s.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main ProjectionPage
// ---------------------------------------------------------------------------

export function ProjectionPage() {
  const {
    projections,
    activeScenario,
    setActiveScenario,
    isRunningProjection,
  } = useResultStore();
  const { scenarioId } = useInputStore();
  const [chartTab, setChartTab] = useState<
    "portfolio" | "pretax" | "income" | "tax"
  >("portfolio");

  const projection = projections[activeScenario];
  const years = projection?.years ?? [];

  if (!scenarioId) {
    return <Alert severity="info">No scenario loaded.</Alert>;
  }

  if (isRunningProjection) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 4 }}>
        <CircularProgress size={20} sx={{ color: "var(--color-accent)" }} />
        <Typography sx={{ color: "var(--text-secondary)" }}>
          Running projection…
        </Typography>
      </Box>
    );
  }

  if (!projection) {
    return (
      <Box sx={{ maxWidth: 500 }}>
        <Alert severity="info">
          No projection data yet. Click <strong>Run</strong> in the top bar to
          compute your projection.
        </Alert>
      </Box>
    );
  }

  return (
    <Box className="page-enter" sx={{ maxWidth: 1100 }}>
      {/* Header */}
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
            Projection
          </Typography>
          <Typography
            sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
          >
            Year-by-year portfolio growth and retirement income.
          </Typography>
        </Box>

        {/* Scenario toggle */}
        <ToggleButtonGroup
          value={activeScenario}
          exclusive
          onChange={(_, v) => v && setActiveScenario(v as ReturnScenario)}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              fontSize: "0.75rem",
              px: 1.5,
              py: 0.5,
              color: "var(--text-muted)",
              borderColor: "var(--border-default)",
              textTransform: "none",
              "&.Mui-selected": {
                color: "var(--color-accent)",
                bgcolor: "var(--color-accent-dim)",
                borderColor: "rgba(45,212,170,0.3)",
              },
            },
          }}
        >
          <ToggleButton value="conservative">Conservative</ToggleButton>
          <ToggleButton value="base">Base</ToggleButton>
          <ToggleButton value="optimistic">Optimistic</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Status chips */}
      <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
        <Chip
          label={
            projection.success
              ? "✓ Portfolio Survives"
              : "⚠ Portfolio Shortfall"
          }
          size="small"
          sx={{
            bgcolor: projection.success
              ? "rgba(45,212,170,0.12)"
              : "rgba(248,113,113,0.12)",
            color: projection.success
              ? "var(--color-positive)"
              : "var(--color-negative)",
          }}
        />
        {!projection.success && (
          <Chip
            label={`Depletes age ${projection.depletion_age}`}
            size="small"
            sx={{
              bgcolor: "rgba(248,113,113,0.12)",
              color: "var(--color-negative)",
            }}
          />
        )}
        <Chip
          label={`${years.length} years modeled`}
          size="small"
          sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
        />
      </Box>

      {/* Summary stats */}
      <SummaryStrip years={years} />

      {/* Chart tab selector */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        {[
          { key: "portfolio", label: "Portfolio by Account" },
          { key: "pretax", label: "Pre vs Post-Tax" },
          { key: "income", label: "Income Waterfall" },
          { key: "tax", label: "Tax Burden" },
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

      {/* Main chart */}
      <ChartPanel
        title={
          chartTab === "portfolio"
            ? "Portfolio Balance by Account (000s)"
            : chartTab === "pretax"
            ? "Pre-Tax vs Post-Tax Balance (000s)"
            : chartTab === "income"
            ? "Annual Income Sources vs Target (000s)"
            : "Annual Tax Burden (000s)"
        }
      >
        {chartTab === "portfolio" && <PortfolioGrowthChart years={years} />}
        {chartTab === "pretax" && <PrePostTaxChart years={years} />}
        {chartTab === "income" && <IncomeChart years={years} />}
        {chartTab === "tax" && <TaxChart years={years} />}
      </ChartPanel>

      {/* Year-by-year table (distribution phase) */}
      <Box sx={{ mt: 3 }}>
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: "0.875rem",
            mb: 1.5,
            color: "var(--text-secondary)",
          }}
        >
          Distribution Phase Detail
        </Typography>
        <Box
          sx={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            overflow: "auto",
          }}
        >
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
            }}
          >
            <Box component="thead">
              <Box
                component="tr"
                sx={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                {[
                  "Year",
                  "Age",
                  "Phase",
                  "Balance",
                  "Gross Income",
                  "Tax",
                  "Eff. Rate",
                  "Gap",
                ].map((h) => (
                  <Box
                    component="th"
                    key={h}
                    sx={{
                      px: 2,
                      py: 1.25,
                      textAlign: "right",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-body)",
                      fontWeight: 500,
                      fontSize: "0.6875rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      "&:first-of-type": { textAlign: "left" },
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {years
                .filter((y) => y.phase !== "accumulation")
                .map((y) => (
                  <Box
                    component="tr"
                    key={y.calendar_year}
                    sx={{
                      borderBottom: "1px solid var(--border-subtle)",
                      "&:last-child": { borderBottom: "none" },
                      "&:hover": { bgcolor: "rgba(255,255,255,0.02)" },
                      bgcolor: y.is_depleted
                        ? "rgba(248,113,113,0.04)"
                        : "transparent",
                    }}
                  >
                    {[
                      { val: y.calendar_year, left: true },
                      { val: y.age_primary },
                      { val: y.phase },
                      {
                        val: formatCurrency(y.balances_end.total, {
                          compact: true,
                        }),
                      },
                      {
                        val: formatCurrency(y.gross_income, { compact: true }),
                      },
                      {
                        val: formatCurrency(y.tax?.total_tax ?? 0, {
                          compact: true,
                        }),
                      },
                      { val: formatPercent(y.tax?.total_effective_rate ?? 0) },
                      {
                        val: formatCurrency(y.income_gap, { compact: true }),
                        color:
                          y.income_gap >= 0
                            ? "var(--color-positive)"
                            : "var(--color-negative)",
                      },
                    ].map((cell, i) => (
                      <Box
                        component="td"
                        key={i}
                        sx={{
                          px: 2,
                          py: 1,
                          textAlign: cell.left ? "left" : "right",
                          color: cell.color ?? "var(--text-primary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cell.val}
                      </Box>
                    ))}
                  </Box>
                ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
