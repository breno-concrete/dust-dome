# Quickstart Validation Guide: Isometric Base Scene & Repair QTE

**Feature**: `004-base-scene` | **Date**: 2026-11-14

## Prerequisites

- Node.js `>=22.18`
- Dependencies installed (`npm install` already completed; no new dependencies added)

## Verification Commands

1. **Run Scene & Repair unit/component tests**:
   ```bash
   npx vitest run src/features/scene/ src/features/repair/
   ```
   Expected: All tests in `iso.test.ts`, `visualState.test.ts`, and `RepairQte.test.tsx` pass with 0 `.todo` items remaining for completed stories.

2. **Run full project quality gate**:
   ```bash
   npm run check
   ```
   Expected: `format:check`, `lint` (oxlint), `typecheck` (tsc -b), `test` (vitest), and `build` (vite build) all exit with code 0.

3. **Verify asset budget (< 5 MB)**:
   ```bash
   du -sh public/models/ public/audio/
   ```
   Expected: Combined size of models, textures, and audio is well under 5 MB.

4. **Manual smoke test in browser**:
   ```bash
   npm run dev
   ```
   - Start a mission and verify all starting structures render with distinct low-poly models on the 12×12 grid.
   - Rotate camera in 90° steps and zoom in/out; verify tile hovering and placement preview align with cursor.
   - Place a 1×1 and a 2×2 structure; select an existing structure.
   - Trigger/inspect repair QTE: verify 5 bolts appear one by one within 6 seconds, and both success and timeout failure behave as specified.
