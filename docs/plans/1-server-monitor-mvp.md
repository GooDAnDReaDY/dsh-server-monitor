# Plan — Issue #1 — Standalone Linux Server Monitor MVP

## Goal

Deliver a tested, unpublished DSH plugin with independent server profiles and current Linux status in the DSH sidebar.

## Phases

1. Baseline and project contract — in progress.
2. Standalone SSH/auth/vault and settings — pending.
3. Read-only Linux snapshot collector and API — pending.
4. Native/legacy sidebar UI and localization — pending.
5. Automated tests, package checks and security scan — pending.
6. MiniPC isolated install, visual acceptance and cleanup — pending.
7. PR, merge and deploy readiness report — pending; publication remains gated.

## Scope

Included: Linux, current snapshots, 15-second visible polling, profile CRUD/test, host/RAM/swap/disk/process/container/network/port data, partial failures, EN/ZH.

Excluded: history, charts, alerts, remote control, non-Linux, production deploy and public publication.

## Verification

- unit: parsers, normalization, vault masking, validation;
- integration: mocked SSH service, routes and settings;
- UI: loading/empty/success/partial/offline/error, native/legacy/no-sidebar matrix;
- package: build, tests, pack allowlist, file-size and secret scans;
- isolated runtime: MiniPC test profile install, smoke, visual check, cleanup.

## Next step

Create the package skeleton and RED tests for the standalone vault, profile validation and snapshot parser.
