---
name: CI failure (manual)
about: Report a CI problem by hand. Failures on main are opened automatically by the Regression workflow.
title: '[CI] '
labels: ci-failure
---

## What failed

<!-- Name the test or step and paste at most 40 lines of output. Remove tokens, keys, e-mails and personal data first. -->

## Reproduce locally

<!-- The exact command, for example: npx vitest run src/engine/time.test.ts -->

## Area

<!-- engine / data / ui / scene / content / shared -->

## How to fix (project flow)

1. Branch from an up-to-date `main` with the prefix of the owning area.
2. Reproduce it. If no test catches it yet, write that failing test first (constitution VIII).
3. Make the smallest fix. Never delete, skip or weaken a test.
4. Run `npm run check`, open a small PR, wait for green CI.
5. If the cause is in another area or a contract file, write a contract change request (a `shared/` PR).
