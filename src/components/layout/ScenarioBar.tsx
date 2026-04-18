// =============================================================================
// NestEgg - src/components/layout/ScenarioBar.tsx
// Top bar: active scenario name, save/load/new scenario controls,
// dirty indicator, and run button (fires projection + optimizer in parallel).
// =============================================================================

import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  ContentCopy as DuplicateIcon,
  FolderOpen as LoadIcon,
  PlayArrow as RunIcon,
  FiberManualRecord as DotIcon,
  DeleteOutline as DeleteIcon,
} from "@mui/icons-material";
import { useInputStore } from "../../store/inputStore";
import { useResultStore } from "../../store/resultStore";
import { useUIStore } from "../../store/uiStore";
import { accountApi, assumptionsApi, contributionApi, personApi, scenarioApi } from "../../api";
import type { AccountType, Scenario } from "../../types";
import {
  DEFAULT_INFLATION_RATE,
  DEFAULT_PLAN_TO_AGE,
  DEFAULT_PRIMARY_AGE_OFFSET,
  DEFAULT_RETIREMENT_AGE,
  DEFAULT_RETURN_SCENARIO,
  DEFAULT_SPOUSE_AGE_OFFSET,
  SCENARIO_BASE_RETURNS,
} from "../../constants/defaults";

const ACCOUNT_TYPES: AccountType[] = [
  "hysa",
  "brokerage",
  "roth_ira",
  "traditional_401k",
  "roth_401k",
];

export function ScenarioBar() {
  const { scenarioId, scenarioName, isDirty, setScenario, markClean,
          setPrimary, setSpouse, setAssumptions, setAccount, setContribution } =
    useInputStore();
  const { activeScenario, isRunning, runAll, clearResults } = useResultStore();
  const { setActiveView } = useUIStore();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<
    "new" | "load" | "duplicate" | "delete"
  >("load");
  const [newName, setNewName] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [creating, setCreating] = useState(false);
  const [targetDeleteScenario, setTargetDeleteScenario] =
    useState<Scenario | null>(null);

  const openDialog = async (mode: "new" | "load" | "duplicate" | "delete") => {
    setMenuAnchor(null);
    setDialogMode(mode);
    setNewName(mode === "duplicate" ? `${scenarioName} (copy)` : "");
    setDialogOpen(true);
    if (mode === "load") {
      setLoadingScenarios(true);
      try {
        const list = await scenarioApi.list();
        setScenarios(list);
      } finally {
        setLoadingScenarios(false);
      }
    }
  };

  const handleCreateScenario = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await scenarioApi.create({ name: newName.trim() });
      const id = created.id;

      // Provision defaults so the Inputs page always loads fully hydrated.
      const currentYear = new Date().getFullYear();

      // Assumptions
      const assumptions = await assumptionsApi.upsert(id, {
        inflation_rate: DEFAULT_INFLATION_RATE,
        plan_to_age: DEFAULT_PLAN_TO_AGE,
        filing_status: "married_filing_jointly",
        current_income: 0,
        desired_retirement_income: 0,
        healthcare_annual_cost: 0,
        enable_catchup_contributions: false,
        enable_roth_ladder: false,
        return_scenario: DEFAULT_RETURN_SCENARIO,
      });

      // Persons
      const primary = await personApi.create(id, {
        role: "primary",
        birth_year: currentYear - DEFAULT_PRIMARY_AGE_OFFSET,
        birth_month: 1,
        planned_retirement_age: DEFAULT_RETIREMENT_AGE,
        current_income: 0,
      });
      const spouse = await personApi.create(id, {
        role: "spouse",
        birth_year: currentYear - DEFAULT_SPOUSE_AGE_OFFSET,
        birth_month: 1,
        planned_retirement_age: DEFAULT_RETIREMENT_AGE,
        current_income: 0,
      });

      // Accounts + contributions
      for (const type of ACCOUNT_TYPES) {
        const base = SCENARIO_BASE_RETURNS[DEFAULT_RETURN_SCENARIO][type];
        const account = await accountApi.upsert(id, {
          account_type: type,
          current_balance: 0,
          return_conservative: Math.max(0, base - 0.03),
          return_base: base,
          return_optimistic: base + 0.03,
        });
        const contrib = await contributionApi.upsert(account.id, {
          annual_amount: 0,
          employer_match_amount: 0,
          enforce_irs_limits: true,
          solve_mode: "fixed",
        });
        setAccount(account);
        setContribution(contrib);
      }

      // Hydrate store — setScenario first to establish the active scenario id,
      // then populate data. markClean() at the end since these are fresh defaults,
      // not user edits.
      setScenario(id, created.name);
      setAssumptions(assumptions);
      setPrimary(primary);
      setSpouse(spouse);
      markClean();
      clearResults();
      setNewName("");
      setDialogOpen(false);
      setActiveView("inputs");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = (s: Scenario) => {
    setTargetDeleteScenario(s);
    setDialogMode("delete");
  };

  const handleDeleteScenario = async () => {
    if (!targetDeleteScenario) return;
    setCreating(true);
    try {
      await scenarioApi.delete(targetDeleteScenario.id);

      setScenarios((prev) =>
        prev.filter((s) => s.id !== targetDeleteScenario.id)
      );

      if (targetDeleteScenario.id === scenarioId) {
        setScenario(null, "");
        clearResults();
        setActiveView("dashboard");
        setDialogOpen(false);
      } else {
        setDialogMode("load");
      }
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setCreating(false);
      setTargetDeleteScenario(null);
    }
  };

  const handleLoadScenario = (s: Scenario) => {
    setScenario(s.id, s.name);
    clearResults();
    setDialogOpen(false);
    setActiveView("dashboard");
  };

  const handleDuplicateScenario = async () => {
    if (!scenarioId || !newName.trim()) return;
    setCreating(true);
    try {
      const duped = await scenarioApi.duplicate(scenarioId);
      const renamed = await scenarioApi.update(duped.id, {
        name: newName.trim(),
      });
      setScenario(renamed.id, renamed.name);
      clearResults();
      setNewName("");
      setDialogOpen(false);
      setActiveView("inputs");
    } finally {
      setCreating(false);
    }
  };

  const handleRun = async () => {
    if (!scenarioId) return;
    await runAll(scenarioId, activeScenario);
    markClean();
    setActiveView("projection");
  };

  return (
    <>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}
      >
        {/* Scenario name + dirty indicator */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: 1,
            minWidth: 0,
          }}
        >
          {scenarioId ? (
            <>
              <Typography
                sx={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {scenarioName || "Untitled Scenario"}
              </Typography>
              {isDirty && (
                <Tooltip title="Unsaved changes — run to update">
                  <DotIcon
                    sx={{
                      fontSize: 8,
                      color: "var(--color-warning)",
                      flexShrink: 0,
                    }}
                  />
                </Tooltip>
              )}
            </>
          ) : (
            <Typography
              sx={{ color: "var(--text-muted)", fontSize: "0.875rem" }}
            >
              No scenario loaded
            </Typography>
          )}
        </Box>

        {/* Scenario actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Scenarios">
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: "var(--text-secondary)" }}
            >
              <LoadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            PaperProps={{ sx: { minWidth: 180, mt: 0.5 } }}
          >
            <MenuItem
              onClick={() => openDialog("new")}
              sx={{ fontSize: "0.8125rem", gap: 1.5 }}
            >
              <AddIcon fontSize="small" />
              New scenario
            </MenuItem>
            <MenuItem
              onClick={() => openDialog("load")}
              sx={{ fontSize: "0.8125rem", gap: 1.5 }}
            >
              <LoadIcon fontSize="small" />
              Load scenario
            </MenuItem>
            <MenuItem
              onClick={() => openDialog("duplicate")}
              disabled={!scenarioId}
              sx={{ fontSize: "0.8125rem", gap: 1.5 }}
            >
              <DuplicateIcon fontSize="small" />
              Duplicate current
            </MenuItem>
          </Menu>

          {/* Single Run button — fires projection + optimizer in parallel */}
          <Button
            variant="contained"
            size="small"
            startIcon={
              isRunning ? (
                <CircularProgress size={12} sx={{ color: "inherit" }} />
              ) : (
                <RunIcon fontSize="small" />
              )
            }
            onClick={handleRun}
            disabled={!scenarioId || isRunning}
            sx={{
              fontSize: "0.75rem",
              height: 30,
              px: 1.5,
              borderColor: isDirty ? "var(--color-warning)" : undefined,
              color: isDirty ? "var(--color-warning)" : undefined,
            }}
          >
            {isRunning ? "Running…" : "Run"}
          </Button>
        </Box>
      </Box>

      {/* ----------------------------------------------------------------
          New / Load / Duplicate / Delete scenario dialog
          ---------------------------------------------------------------- */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          },
        }}
      >
        <DialogTitle
          sx={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", pb: 1 }}
        >
          {dialogMode === "new"
            ? "New Scenario"
            : dialogMode === "duplicate"
            ? "Duplicate Scenario"
            : dialogMode === "delete"
            ? "Delete Scenario?"
            : "Load Scenario"}
        </DialogTitle>

        <DialogContent>
          {dialogMode === "delete" ? (
            <Box sx={{ py: 1 }}>
              <Typography sx={{ fontSize: "0.875rem", mb: 1 }}>
                Are you sure you want to delete{" "}
                <strong>{targetDeleteScenario?.name}</strong>?
              </Typography>
              <Typography
                sx={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}
              >
                This will permanently remove all associated accounts, income,
                and settings. This action cannot be undone.
              </Typography>
            </Box>
          ) : dialogMode === "new" || dialogMode === "duplicate" ? (
            <Box>
              {dialogMode === "duplicate" && (
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                    mb: 1.5,
                  }}
                >
                  All inputs, accounts, contributions, and SS earnings will be
                  copied. Projection results are not copied.
                </Typography>
              )}
              <TextField
                fullWidth
                label="Scenario name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (dialogMode === "new") handleCreateScenario();
                    else handleDuplicateScenario();
                  }
                }}
                autoFocus
                sx={{ mt: dialogMode === "duplicate" ? 0 : 1 }}
              />
            </Box>
          ) : (
            <>
              {loadingScenarios ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress
                    size={24}
                    sx={{ color: "var(--color-accent)" }}
                  />
                </Box>
              ) : scenarios.length === 0 ? (
                <Typography
                  sx={{
                    color: "var(--text-muted)",
                    py: 2,
                    fontSize: "0.875rem",
                  }}
                >
                  No saved scenarios yet. Create one first.
                </Typography>
              ) : (
                <List dense sx={{ mt: 0.5 }}>
                  {scenarios.map((s) => (
                    <ListItem
                      key={s.id}
                      disablePadding
                      sx={{ mb: 0.5 }}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleConfirmDelete(s)}
                          sx={{
                            color: "inherit",
                            opacity: 0.5,
                            "&:hover": { color: "#d32f2f" },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: "1.2rem" }} />
                        </IconButton>
                      }
                    >
                      <ListItemButton
                        onClick={() => handleLoadScenario(s)}
                        selected={s.id === scenarioId}
                        sx={{ borderRadius: "var(--radius-sm)", pr: 5 }}
                      >
                        <ListItemText
                          primary={s.name}
                          secondary={`Updated ${new Date(
                            s.updated_at
                          ).toLocaleDateString()}`}
                          primaryTypographyProps={{ fontSize: "0.875rem" }}
                          secondaryTypographyProps={{ fontSize: "0.75rem" }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              dialogMode === "delete"
                ? setDialogMode("load")
                : setDialogOpen(false);
            }}
            size="small"
            color="inherit"
          >
            {dialogMode === "delete" ? "Back" : "Cancel"}
          </Button>
          {dialogMode === "new" && (
            <Button
              variant="contained"
              size="small"
              onClick={handleCreateScenario}
              disabled={!newName.trim() || creating}
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          )}
          {dialogMode === "duplicate" && (
            <Button
              variant="contained"
              size="small"
              onClick={handleDuplicateScenario}
              disabled={!newName.trim() || creating}
            >
              {creating ? "Duplicating…" : "Duplicate"}
            </Button>
          )}
          {dialogMode === "delete" && (
            <Button
              variant="contained"
              size="small"
              color="error"
              onClick={handleDeleteScenario}
              disabled={creating}
            >
              {creating ? "Deleting…" : "Delete"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
