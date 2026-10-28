# RAID Log — App Wiring (B6)

## Risks

| ID | Risk | Owner | Treatment |
|----|------|-------|-----------|
| RK-1 | Wiring plus B3 too large for one Bolt | Owner | Decide the split at Scope Definition |
| RK-2 | Session handling security | Owner | HTTP-only SameSite cookie, rotation, expiry; threat model at NFR stages |
| RK-3 | Catalog migrations disturb order reads | Owner | Add-only migrations; order tests and `tests/realdb` as the gate |
| RK-4 | Bundle size grows when screens mount | Owner | Existing 350 KB gate |
| RK-5 | Personal data leaks via errors or logs | Owner | Coded errors; no PII in logs or the audit log |

## Assumptions

| ID | Assumption | Validate by |
|----|------------|-------------|
| A-1 | No specific Bangladeshi data-protection statute applied; least-exposure handling by design | Requirements Analysis |
| A-2 | Owner is the only user for now | Owner, at Scope Definition |
| A-3 | The problem statement is the request as described (accepted at Intent Capture) | Already accepted |

## Issues

| ID | Issue | Status |
|----|-------|--------|
| I-1 | Hosted GitHub Actions cannot run on this account; the workflow is disabled | Worked around: local CI is the merge evidence |
| I-2 | A one-command local CI script could not be saved from the agent session | Open: the Owner can save it from a terminal |

## Dependencies

| ID | Dependency | Status |
|----|------------|--------|
| D-1 | B1 foundation and B2 orders on `main` (`eb05f36`) | Available |
| D-2 | Docker with `postgres:18` on this machine | Available |
| D-3 | MVP B3 catalog stories US2.10–US2.18 (`261004-mvp`) | Available |
