// =============================================================================
// NestEgg - src/components/layout/ScenarioBar.tsx
// Top bar: active scenario name, save/load/new scenario controls,
// dirty indicator, and run projection button.
// =============================================================================

import { useState, useEffect } from 'react'
import {
  Box, Button, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, List, ListItemButton,
  ListItemText, Menu, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  Add as AddIcon,
  ContentCopy as DuplicateIcon,
  FolderOpen as LoadIcon,
  PlayArrow as RunIcon,
  AutoFixHigh as OptimizeIcon,
  FiberManualRecord as DotIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material'
import { useInputStore } from '../../store/inputStore'
import { useResultStore } from '../../store/resultStore'
import { projectionApi, optimizerApi, scenarioApi } from '../../api'
import type { Scenario } from '../../types'

export function ScenarioBar() {
  const { scenarioId, scenarioName, isDirty, setScenario, markClean, reset } = useInputStore()
  const {
    activeScenario,
    isRunningProjection,
    isRunningOptimizer,
    setProjection,
    setOptimizedStrategy,
    setRunningProjection,
    setRunningOptimizer,
    setProjectionError,
    setOptimizerError,
    clearResults,
  } = useResultStore()

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'new' | 'load' | 'duplicate'>('load')
  const [newName, setNewName] = useState('')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [creating, setCreating] = useState(false)

  const openDialog = async (mode: 'new' | 'load' | 'duplicate') => {
    setMenuAnchor(null)
    setDialogMode(mode)
    setNewName(mode === 'duplicate' ? `${scenarioName} (copy)` : '')
    setDialogOpen(true)
    if (mode === 'load') {
      setLoadingScenarios(true)
      try {
        const list = await scenarioApi.list()
        setScenarios(list)
      } finally {
        setLoadingScenarios(false)
      }
    }
  }

  const handleCreateScenario = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const created = await scenarioApi.create({ name: newName.trim() })
      setScenario(created.id, created.name)
      clearResults()
      setNewName('')
      setDialogOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const handleLoadScenario = (s: Scenario) => {
    setScenario(s.id, s.name)
    clearResults()
    setDialogOpen(false)
  }

  const handleDuplicate = async () => {
    if (!scenarioId || !newName.trim()) return
    setCreating(true)
    try {
      const duped = await scenarioApi.duplicate(scenarioId)
      // Rename the duplicate to the user's chosen name
      const renamed = await scenarioApi.update(duped.id, { name: newName.trim() })
      setScenario(renamed.id, renamed.name)
      clearResults()
      setNewName('')
      setDialogOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const handleRunProjection = async () => {
    if (!scenarioId) return
    setRunningProjection(true)
    setProjectionError(null)
    try {
      const result = await projectionApi.run(scenarioId, activeScenario, true)
      setProjection(activeScenario, result)
      markClean()
    } catch (err: unknown) {
      setProjectionError(err instanceof Error ? err.message : 'Projection failed')
    } finally {
      setRunningProjection(false)
    }
  }

  const handleRunOptimizer = async () => {
    if (!scenarioId) return
    setRunningOptimizer(true)
    setOptimizerError(null)
    try {
      const result = await optimizerApi.run({ scenarioId })
      setOptimizedStrategy(result)
    } catch (err: unknown) {
      setOptimizerError(err instanceof Error ? err.message : 'Optimizer failed')
    } finally {
      setRunningOptimizer(false)
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>

        {/* Scenario name + dirty indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          {scenarioId ? (
            <>
              <Typography
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {scenarioName || 'Untitled Scenario'}
              </Typography>
              {isDirty && (
                <Tooltip title="Unsaved changes — run projection to update">
                  <DotIcon sx={{ fontSize: 8, color: 'var(--color-warning)', flexShrink: 0 }} />
                </Tooltip>
              )}
            </>
          ) : (
            <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No scenario loaded
            </Typography>
          )}
        </Box>

        {/* Scenario actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Scenarios">
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: 'var(--text-secondary)' }}
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
            <MenuItem onClick={() => openDialog('new')} sx={{ fontSize: '0.8125rem', gap: 1.5 }}>
              <AddIcon fontSize="small" />
              New scenario
            </MenuItem>
            <MenuItem onClick={() => openDialog('load')} sx={{ fontSize: '0.8125rem', gap: 1.5 }}>
              <LoadIcon fontSize="small" />
              Load scenario
            </MenuItem>
            <MenuItem
              onClick={() => openDialog('duplicate')}
              disabled={!scenarioId}
              sx={{ fontSize: '0.8125rem', gap: 1.5 }}
            >
              <DuplicateIcon fontSize="small" />
              Duplicate current
            </MenuItem>
          </Menu>

          {/* Divider */}
          <Box sx={{ width: 1, height: 20, bgcolor: 'var(--border-default)', mx: 0.5 }} />

          {/* Run Projection */}
          <Button
            variant="outlined"
            size="small"
            startIcon={
              isRunningProjection
                ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                : <RunIcon fontSize="small" />
            }
            onClick={handleRunProjection}
            disabled={!scenarioId || isRunningProjection}
            sx={{
              fontSize: '0.75rem',
              height: 30,
              px: 1.5,
              borderColor: isDirty ? 'var(--color-warning)' : undefined,
              color: isDirty ? 'var(--color-warning)' : undefined,
            }}
          >
            {isRunningProjection ? 'Running…' : 'Run'}
          </Button>

          {/* Optimize */}
          <Button
            variant="contained"
            size="small"
            startIcon={
              isRunningOptimizer
                ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                : <OptimizeIcon fontSize="small" />
            }
            onClick={handleRunOptimizer}
            disabled={!scenarioId || isRunningOptimizer}
            sx={{ fontSize: '0.75rem', height: 30, px: 1.5 }}
          >
            {isRunningOptimizer ? 'Optimizing…' : 'Optimize'}
          </Button>
        </Box>
      </Box>

      {/* ----------------------------------------------------------------
          New / Load scenario dialog
          ---------------------------------------------------------------- */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', pb: 1 }}>
          {dialogMode === 'new' ? 'New Scenario'
            : dialogMode === 'duplicate' ? 'Duplicate Scenario'
            : 'Load Scenario'}
        </DialogTitle>

        <DialogContent>
          {dialogMode === 'new' || dialogMode === 'duplicate' ? (
            <Box>
              {dialogMode === 'duplicate' && (
                <Typography sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', mb: 1.5 }}>
                  All inputs, accounts, contributions, and SS earnings will be copied.
                  Projection results are not copied.
                </Typography>
              )}
              <TextField
                fullWidth
                label="Scenario name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (dialogMode === 'new') handleCreateScenario()
                    else handleDuplicate()
                  }
                }}
                autoFocus
                sx={{ mt: dialogMode === 'duplicate' ? 0 : 1 }}
              />
            </Box>
          ) : (
            <>
              {loadingScenarios ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} sx={{ color: 'var(--color-accent)' }} />
                </Box>
              ) : scenarios.length === 0 ? (
                <Typography sx={{ color: 'var(--text-muted)', py: 2, fontSize: '0.875rem' }}>
                  No saved scenarios yet. Create one first.
                </Typography>
              ) : (
                <List dense sx={{ mt: 0.5 }}>
                  {scenarios.map((s) => (
                    <ListItemButton
                      key={s.id}
                      onClick={() => handleLoadScenario(s)}
                      selected={s.id === scenarioId}
                      sx={{ borderRadius: 'var(--radius-sm)', mb: 0.5 }}
                    >
                      <ListItemText
                        primary={s.name}
                        secondary={`Updated ${new Date(s.updated_at).toLocaleDateString()}`}
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} size="small" color="inherit">
            Cancel
          </Button>
          {dialogMode === 'new' && (
            <Button
              variant="contained"
              size="small"
              onClick={handleCreateScenario}
              disabled={!newName.trim() || creating}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          )}
          {dialogMode === 'duplicate' && (
            <Button
              variant="contained"
              size="small"
              onClick={handleDuplicate}
              disabled={!newName.trim() || creating}
            >
              {creating ? 'Duplicating…' : 'Duplicate'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}

