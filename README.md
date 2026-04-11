# NestEgg — Frontend

React + TypeScript + Vite + MUI frontend for the NestEgg retirement planner.

## Stack
- **React 18** + **TypeScript**
- **Vite** — dev server with API proxy to FastAPI backend
- **MUI v6** — dark-themed component library
- **Plotly.js** — interactive financial charts
- **Zustand** — lightweight state management
- **Axios** — typed API client

## Project layout

```
src/
  main.tsx          # Entry point, theme provider
  App.tsx           # Shell and view routing (Zustand-driven, no URL router)
  theme.ts          # MUI dark theme aligned with NestEgg design tokens
  App.css           # Global styles and CSS design tokens
  api.ts            # All typed API calls to the backend
  types/
    index.ts        # Shared TypeScript types (mirrors backend Pydantic models)
  utils/
    formatters.ts   # Currency, percent, age formatting
    inflationUtils.ts
  store/
    inputStore.ts   # All user inputs (accounts, persons, assumptions, SS)
    resultStore.ts  # Projection results and optimizer output
    uiStore.ts      # Navigation, chart toggles, sidebar state
  components/
    layout/
      AppShell.tsx  # Sidebar + topbar layout
      ScenarioBar.tsx # Scenario name, run/optimize buttons
  pages/
    Dashboard.tsx
    InputsPage.tsx
    ProjectionPage.tsx
    OptimizerPage.tsx
    SocialSecurityPage.tsx  # Also exports RetirementPage and TaxPage
    RetirementPage.tsx      # Re-export
    TaxPage.tsx             # Re-export
```

## Local development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api/*` to the
FastAPI backend at `http://localhost:8000`.

## Docker

```bash
docker compose up --build
```

## Design tokens

All colors, spacing, and typography are defined as CSS custom properties in
`App.css`. The MUI theme in `theme.ts` mirrors these values for consistent
styling across MUI components and custom CSS.

Key tokens:
- `--color-accent`: `#2dd4aa` — primary action color
- `--font-display`: DM Serif Display
- `--font-mono`: IBM Plex Mono (all numeric data)
- `--bg-base` / `--bg-surface` / `--bg-elevated`: background layers
