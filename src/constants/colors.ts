// All hex codes must match App.css variables
// so the UI and Charts stay in sync.
export const ACCOUNT_COLORS = {
  hysa: "#60a5fa",
  brokerage: "#a78bfa",
  roth_ira: "#2dd4aa",
  traditional_401k: "#f59e0b",
  roth_401k: "#34d399",
  roth_conversion: "#c4b5fd",
  ss: "#e11d48",
  withdrawal: "#f87171",
  tax: "#94a3b8",
  total: "#f0ede8",
  income: "#2dd4aa",
  target: "rgba(240,237,232,0.3)",
  net_income: "#2dd4aa",
  spill: "#f87171",
  // Tax specific
  ordinary: "#94a3b8",
  ltcg: "#a78bfa",
  niit: "#f87171",
  effective: "#2dd4aa",
  marginal: "#f59e0b",
} as const;
