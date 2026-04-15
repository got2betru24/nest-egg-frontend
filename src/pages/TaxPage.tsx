// =============================================================================
// NestEgg - src/pages/TaxPage.tsx
// Tax analysis: effective rate on spending, LTCG vs ordinary breakdown,
// bracket spill events, and year-by-year tax detail table.
// =============================================================================

import { InfoOutlined as InfoIcon } from "@mui/icons-material";
import { Alert, Box, Chip, Grid2, Tooltip, Typography } from "@mui/material";
import Plot from "react-plotly.js";
import { useInputStore } from "../store/inputStore";
import { useResultStore } from "../store/resultStore";
import type { ProjectionYear } from "../types";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { ACCOUNT_COLORS as COLORS } from "../constants/colors";

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
// Chart: Tax composition (stacked bars + effective rate line)
// ---------------------------------------------------------------------------

function TaxCompositionChart({ years }: { years: ProjectionYear[] }) {
  const distYears = years.filter((y) => y.phase !== "accumulation" && y.tax);

  return (
    <Plot
      data={[
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.tax?.tax_owed ?? 0) / 1000),
          name: "Ordinary Tax",
          type: "bar",
          marker: { color: COLORS.ordinary + "cc" },
          hovertemplate: "<b>Ordinary</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.tax?.ltcg_tax ?? 0) / 1000),
          name: "LTCG Tax",
          type: "bar",
          marker: { color: COLORS.ltcg + "cc" },
          hovertemplate: "<b>LTCG</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.tax?.niit ?? 0) / 1000),
          name: "NIIT",
          type: "bar",
          marker: { color: COLORS.niit + "cc" },
          hovertemplate: "<b>NIIT</b>: $%{y:.0f}K<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.tax?.effective_rate ?? 0) * 100),
          name: "Eff. Rate (income)",
          type: "scatter",
          mode: "lines",
          yaxis: "y2",
          line: { color: COLORS.effective, width: 1.5 },
          hovertemplate: "<b>Eff Rate</b>: %{y:.1f}%<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.tax?.marginal_rate ?? 0) * 100),
          name: "Marginal Rate",
          type: "scatter",
          mode: "lines",
          yaxis: "y2",
          line: { color: COLORS.marginal, width: 1, dash: "dot" },
          hovertemplate: "<b>Marginal</b>: %{y:.1f}%<extra></extra>",
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
        height: 320,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Chart: Effective tax rate on spending (the new primary metric)
// ---------------------------------------------------------------------------

function TaxOnSpendingChart({ years }: { years: ProjectionYear[] }) {
  const distYears = years.filter((y) => y.phase !== "accumulation");

  const taxRateOnSpend = distYears.map((y) => {
    const grossWithdrawals =
      y.withdrawals.hysa +
      y.withdrawals.brokerage +
      y.withdrawals.roth_ira +
      y.withdrawals.traditional_401k +
      y.withdrawals.roth_401k;
    return grossWithdrawals > 0
      ? ((y.tax?.total_tax ?? 0) / grossWithdrawals) * 100
      : 0;
  });

  return (
    <Plot
      data={[
        {
          x: distYears.map((y) => y.calendar_year),
          y: taxRateOnSpend,
          name: "Tax Rate on Spending",
          type: "scatter",
          mode: "lines",
          fill: "tozeroy",
          fillcolor: "rgba(148,163,184,0.10)",
          line: { color: COLORS.ordinary, width: 2 },
          hovertemplate: "<b>Tax / Withdrawals</b>: %{y:.1f}%<extra></extra>",
        },
        {
          x: distYears.map((y) => y.calendar_year),
          y: distYears.map((y) => (y.tax?.effective_rate ?? 0) * 100),
          name: "Eff. Rate (on income)",
          type: "scatter",
          mode: "lines",
          line: { color: COLORS.effective, width: 1.5, dash: "dot" },
          hovertemplate: "<b>Eff Rate (income)</b>: %{y:.1f}%<extra></extra>",
        },
      ]}
      layout={{
        ...PLOTLY_LAYOUT_BASE,
        yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, ticksuffix: "%" },
        height: 280,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Chart: LTCG rate paid over time (shows 0% vs 15% decisions)
// ---------------------------------------------------------------------------

function LTCGRateChart({ years }: { years: ProjectionYear[] }) {
  const distYears = years.filter(
    (y) => y.phase !== "accumulation" && y.withdrawals.brokerage > 0
  );
  if (distYears.length === 0)
    return (
      <Typography
        sx={{ color: "var(--text-muted)", fontSize: "0.875rem", py: 2 }}
      >
        No brokerage withdrawals in the distribution phase.
      </Typography>
    );

  const ltcgRates = distYears.map((y) => {
    const brok = y.withdrawals.brokerage;
    if (brok <= 0) return 0;
    return ((y.tax?.ltcg_tax ?? 0) / brok) * 100;
  });

  const zeroYears = ltcgRates.filter((r) => r < 0.5).length;
  const fifteenYears = ltcgRates.filter((r) => r >= 0.5).length;

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Chip
          label={`${zeroYears} yrs at 0% LTCG`}
          size="small"
          sx={{
            bgcolor: "rgba(45,212,170,0.10)",
            color: "var(--color-accent)",
            fontSize: "0.75rem",
          }}
        />
        {fifteenYears > 0 && (
          <Chip
            label={`${fifteenYears} yrs at 15%+ LTCG`}
            size="small"
            sx={{
              bgcolor: "rgba(248,113,113,0.10)",
              color: "var(--color-negative)",
              fontSize: "0.75rem",
            }}
          />
        )}
      </Box>
      <Plot
        data={[
          {
            x: distYears.map((y) => y.calendar_year),
            y: distYears.map((y) => y.withdrawals.brokerage / 1000),
            name: "Brokerage Withdrawn",
            type: "bar",
            marker: {
              color: distYears.map((_, i) =>
                ltcgRates[i] < 0.5 ? "#2dd4aa66" : "#f8717166"
              ),
            },
            hovertemplate: "<b>Brokerage</b>: $%{y:.0f}K<extra></extra>",
          },
          {
            x: distYears.map((y) => y.calendar_year),
            y: ltcgRates,
            name: "LTCG Rate",
            type: "scatter",
            mode: "markers",
            yaxis: "y2",
            marker: {
              color: distYears.map((_, i) =>
                ltcgRates[i] < 0.5 ? "#2dd4aa" : "#f87171"
              ),
              size: 6,
            },
            hovertemplate: "<b>LTCG Rate</b>: %{y:.1f}%<extra></extra>",
          },
        ]}
        layout={{
          ...PLOTLY_LAYOUT_BASE,
          yaxis: {
            ...PLOTLY_LAYOUT_BASE.yaxis,
            tickprefix: "$",
            ticksuffix: "K",
          },
          yaxis2: {
            overlaying: "y",
            side: "right",
            ticksuffix: "%",
            range: [-1, 20],
            gridcolor: "transparent",
            tickfont: { size: 10, color: "#5c6480" },
          },
          height: 280,
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: "100%" }}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Chart panel
// ---------------------------------------------------------------------------

function ChartPanel({
  title,
  tooltip,
  children,
}: {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2 }}>
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          {title}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoIcon
              sx={{ fontSize: 13, color: "var(--text-muted)", cursor: "help" }}
            />
          </Tooltip>
        )}
      </Box>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main TaxPage
// ---------------------------------------------------------------------------

export function TaxPage() {
  const { getActiveProjection } = useResultStore();
  const { scenarioId } = useInputStore();

  const projection = getActiveProjection();

  if (!scenarioId) return <Alert severity="info">No scenario loaded.</Alert>;
  if (!projection)
    return (
      <Box sx={{ maxWidth: 500 }}>
        <Alert severity="info">
          No projection data yet. Click <strong>Run</strong> in the top bar to
          compute your projection.
        </Alert>
      </Box>
    );

  const years = projection.years;
  const distYears = years.filter((y) => y.phase !== "accumulation");

  // Summary metrics
  const totalTax = projection.total_tax_paid;
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
  const totalLTCG = distYears.reduce((s, y) => s + (y.tax?.ltcg_tax ?? 0), 0);
  const totalNIIT = distYears.reduce((s, y) => s + (y.tax?.niit ?? 0), 0);
  const totalOrdinary = distYears.reduce(
    (s, y) => s + (y.tax?.tax_owed ?? 0),
    0
  );

  const effectiveTaxOnSpend =
    totalGrossWithdrawals > 0 ? totalTax / totalGrossWithdrawals : 0;
  const avgEffectiveRate =
    distYears.filter((y) => y.tax).length > 0
      ? distYears.reduce((s, y) => s + (y.tax?.effective_rate ?? 0), 0) /
        distYears.filter((y) => y.tax).length
      : 0;

  const spillYears = distYears.filter((y) =>
    y.notes.some((n) => n.includes("Bracket spill"))
  );
  const zeroLtcgYears = distYears.filter((y) =>
    y.notes.some((n) => n.includes("0% LTCG"))
  ).length;

  return (
    <Box className="page-enter" sx={{ maxWidth: 1000 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontSize: "1.75rem", mb: 0.5 }}>
          Tax Analysis
        </Typography>
        <Typography
          sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
        >
          Lifetime tax cost, LTCG efficiency, and bracket discipline — from your
          withdrawal plan.
        </Typography>
      </Box>

      {/* Summary metric cards */}
      <Grid2 container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: "Tax Rate on Spending",
            value: formatPercent(effectiveTaxOnSpend),
            sub: "Total tax / gross withdrawals",
            accent: true,
            tooltip:
              "The fraction of every dollar you withdraw that goes to taxes. This is the spend-maximizing metric — lower means more of your portfolio actually reaches your pocket.",
          },
          {
            label: "Lifetime Tax Paid",
            value: formatCurrency(totalTax, { compact: true }),
            sub: "All retirement years",
            tooltip:
              "Total federal income tax (ordinary + LTCG + NIIT) paid across all retirement years.",
          },
          {
            label: "Avg Effective Rate",
            value: formatPercent(avgEffectiveRate),
            sub: "On taxable income",
            tooltip:
              "Average effective rate on ordinary income each year. Different from tax-on-spending because HYSA and Roth withdrawals aren't in the denominator here.",
          },
          {
            label: "LTCG + NIIT",
            value: formatCurrency(totalLTCG + totalNIIT, { compact: true }),
            sub: `${formatPercent(
              (totalLTCG + totalNIIT) / (totalTax || 1)
            )} of total tax`,
            tooltip:
              "Total capital gains and net investment income tax. Mostly driven by brokerage withdrawals.",
          },
        ].map((m) => (
          <Grid2 key={m.label} size={{ xs: 6, md: 3 }}>
            <Tooltip title={m.tooltip} placement="top">
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: "var(--radius-lg)",
                  bgcolor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "help",
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
                    color: m.accent
                      ? "var(--color-accent)"
                      : "var(--text-primary)",
                  }}
                >
                  {m.value}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    color: "var(--text-muted)",
                    mt: 0.25,
                  }}
                >
                  {m.sub}
                </Typography>
              </Box>
            </Tooltip>
          </Grid2>
        ))}
      </Grid2>

      {/* Strategy efficiency chips */}
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
        {spillYears.length > 0 && (
          <Chip
            label={`${spillYears.length} bracket spill years`}
            size="small"
            sx={{
              bgcolor: "rgba(248,113,113,0.10)",
              color: "var(--color-negative)",
              fontSize: "0.75rem",
            }}
          />
        )}
        <Chip
          label={`$${(totalOrdinary / 1000).toFixed(0)}K ordinary / $${(
            (totalLTCG + totalNIIT) /
            1000
          ).toFixed(0)}K LTCG`}
          size="small"
          sx={{
            bgcolor: "rgba(255,255,255,0.06)",
            color: "var(--text-muted)",
            fontSize: "0.75rem",
          }}
        />
      </Box>

      {/* Tax rate on spending chart */}
      <ChartPanel
        title="Effective Tax Rate on Spending vs Income"
        tooltip="'On spending' denominates tax against gross withdrawals (all sources). 'On income' uses the traditional taxable income denominator. The gap between them shows how much of your spending comes from tax-free sources (HYSA, Roth)."
      >
        <TaxOnSpendingChart years={years} />
      </ChartPanel>

      {/* Tax composition chart */}
      <ChartPanel title="Tax Composition by Year">
        <TaxCompositionChart years={years} />
      </ChartPanel>

      {/* LTCG rate chart */}
      <ChartPanel
        title="Brokerage Withdrawals — LTCG Rate Paid"
        tooltip="Green bars = brokerage pulled while staying in the 0% LTCG zone. Red = 15%+ LTCG rate. The withdrawal optimizer targets 0% LTCG years by pulling brokerage before traditional 401k when doing so keeps total income below the LTCG stacking threshold."
      >
        <LTCGRateChart years={years} />
      </ChartPanel>

      {/* Bracket spill detail */}
      {spillYears.length > 0 && (
        <Box
          sx={{
            p: 2.5,
            borderRadius: "var(--radius-lg)",
            bgcolor: "var(--bg-surface)",
            border: "1px solid rgba(248,113,113,0.2)",
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: "0.875rem",
              mb: 1.5,
              color: "var(--color-negative)",
            }}
          >
            Bracket Spill Events ({spillYears.length} years)
          </Typography>
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              mb: 2,
              lineHeight: 1.5,
            }}
          >
            These years the portfolio couldn't meet the income target from HYSA,
            brokerage (at 0% LTCG), and bracket-room traditional — so additional
            traditional 401k was drawn at a higher marginal rate. This is
            expected behavior when spending needs exceed available low-cost
            sources.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {spillYears.map((y) => (
              <Box
                key={y.calendar_year}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "var(--radius-sm)",
                  bgcolor: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.15)",
                }}
              >
                <Typography
                  className="num"
                  sx={{ fontSize: "0.75rem", color: "var(--color-negative)" }}
                >
                  {y.calendar_year}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
                >
                  Age {y.age_primary} ·{" "}
                  {formatPercent(y.tax?.marginal_rate ?? 0)} marginal
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Year-by-year tax table */}
      <Typography
        sx={{
          fontWeight: 500,
          fontSize: "0.875rem",
          mb: 1.5,
          color: "var(--text-secondary)",
        }}
      >
        Year-by-Year Tax Detail
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
                { h: "Year", left: true },
                { h: "Age" },
                { h: "Ordinary Tax" },
                { h: "LTCG" },
                { h: "NIIT" },
                { h: "Total Tax" },
                { h: "Tax/Spend" },
                { h: "Eff. Rate" },
                { h: "Marginal" },
                { h: "SS Taxable" },
              ].map((col) => (
                <Box
                  component="th"
                  key={col.h}
                  sx={{
                    px: 2,
                    py: 1.25,
                    textAlign: col.left ? "left" : "right",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    fontSize: "0.6875rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {distYears
              .filter((y) => y.tax)
              .map((y) => {
                const grossWithd =
                  y.withdrawals.hysa +
                  y.withdrawals.brokerage +
                  y.withdrawals.roth_ira +
                  y.withdrawals.traditional_401k +
                  y.withdrawals.roth_401k;
                const taxOnSpend =
                  grossWithd > 0 ? y.tax!.total_tax / grossWithd : 0;
                const isSpill = y.notes.some((n) =>
                  n.includes("Bracket spill")
                );
                const isZeroLtcg = y.notes.some((n) => n.includes("0% LTCG"));

                return (
                  <Box
                    component="tr"
                    key={y.calendar_year}
                    sx={{
                      borderBottom: "1px solid var(--border-subtle)",
                      "&:last-child": { borderBottom: "none" },
                      "&:hover": { bgcolor: "rgba(255,255,255,0.02)" },
                      bgcolor: isSpill
                        ? "rgba(248,113,113,0.03)"
                        : isZeroLtcg
                        ? "rgba(45,212,170,0.02)"
                        : "transparent",
                    }}
                  >
                    <Box
                      component="td"
                      sx={{
                        px: 2,
                        py: 1,
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {y.calendar_year}
                      {isSpill && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.75,
                            fontSize: "0.6rem",
                            color: "var(--color-negative)",
                            verticalAlign: "middle",
                          }}
                        >
                          ⬆
                        </Box>
                      )}
                      {isZeroLtcg && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.75,
                            fontSize: "0.6rem",
                            color: "var(--color-accent)",
                            verticalAlign: "middle",
                          }}
                        >
                          0%
                        </Box>
                      )}
                    </Box>
                    {[
                      { val: y.age_primary },
                      {
                        val: formatCurrency(y.tax!.tax_owed, { compact: true }),
                      },
                      {
                        val: formatCurrency(y.tax!.ltcg_tax ?? 0, {
                          compact: true,
                        }),
                      },
                      {
                        val: formatCurrency(y.tax!.niit ?? 0, {
                          compact: true,
                        }),
                      },
                      {
                        val: formatCurrency(y.tax!.total_tax, {
                          compact: true,
                        }),
                      },
                      {
                        val: formatPercent(taxOnSpend),
                        color:
                          taxOnSpend > 0.15
                            ? "var(--color-negative)"
                            : taxOnSpend > 0.08
                            ? "var(--color-warning)"
                            : "var(--color-positive)",
                      },
                      { val: formatPercent(y.tax!.effective_rate) },
                      {
                        val: formatPercent(y.tax!.marginal_rate),
                        color: isSpill
                          ? "var(--color-negative)"
                          : "var(--text-primary)",
                      },
                      {
                        val: formatCurrency(y.tax!.ss_taxable_amount, {
                          compact: true,
                        }),
                      },
                    ].map((cell, i) => (
                      <Box
                        component="td"
                        key={i}
                        sx={{
                          px: 2,
                          py: 1,
                          textAlign: "right",
                          color: cell.color ?? "var(--text-primary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cell.val}
                      </Box>
                    ))}
                  </Box>
                );
              })}
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            component="span"
            sx={{ fontSize: "0.65rem", color: "var(--color-accent)" }}
          >
            0%
          </Box>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
          >
            Brokerage at 0% LTCG this year
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            component="span"
            sx={{ fontSize: "0.65rem", color: "var(--color-negative)" }}
          >
            ⬆
          </Box>
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}
          >
            Bracket spill — traditional drawn beyond ceiling
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
