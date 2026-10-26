# CI Pipeline Questions — U1-foundation (B1)

> Plan Approval questions for the U1-foundation CI
> Pipeline stage. The plan, the ci-config, and the
> quality-gates are bound to a content fingerprint
> (the [Approval Fingerprint] tag below); any byte
> change to the underlying files after approval
> invalidates the fingerprint and forces a re-approval.

## Sources

- [cicd-pipeline] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/cicd-pipeline.md` — the binding design
- [existing-ci] `.github/workflows/ci.yml` — the live pipeline (10 build + 11 test + 3 R-gate jobs)
- [team-rules] `aidlc/spaces/default/memory/team.md` — trunk-based dev, deploy-on-merge, free-tier envelope, reverse-deploy gates
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based, deploy-on-merge to staging
- [build-and-test-summary] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/build-and-test-summary.md` — 21 Met targets, 0 Not Met
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability}.md` — inherited NFRs

## Plan Approval

[Approval Fingerprint]: sha256:v3:fresh
[Planned Source]: fresh

The CI pipeline at `.github/workflows/ci.yml` (10 build
stages + 11 test stages + 3 R-gate jobs) and the
quality-gates at `quality-gates.md` (the binding gate
definitions) are ready for your review. The pipeline
shape is fixed by `team.md#Deployment` (trunk-based,
deploy-on-merge, free-tier, single-tenant) and the
NFR-Design set (bundle size, R1.1, R1.2, R1.3, audit
immutability, three-layer gate, no-PCI scope).

**Plan summary** (in plain language):

- **CI tool:** GitHub Actions (the existing `.github/workflows/ci.yml`).
- **Branch strategy:** trunk-based dev; branches named `<bolt-slug>` (B1 = `b1-foundation`); squash-merge to `main`; commit message = Bolt slug.
- **Quality gates (merge-blocking):** lint, type-check, format-check, unit + integration test, ≥ 80 % line coverage, R1.1 audit-immutability, R1.2 three-layer-gate absence, R1.3 money round-trip, Vite build, bundle-size ≤ 350 KB gzip, mutation discipline (asserted by the three R-gate files being present + green).
- **Artifact repositories:** none in B1 (the free-tier envelope preserves the build artifact as a Git SHA on `main`; no ECR / S3 / CodeArtifact).
- **Deploy target:** staging auto-deploys on merge to `main`; production on manual approval. Single-tenant per deployment.

The Build and Test stage (B1) shipped 21 Met targets,
0 Not Met, 11 Unverified (deferred to runtime
observability, not local CI). The CI Pipeline commits
every Build and Test gate as a merge-blocking check.

After you approve, the devsecops / pipeline-deploy
agent writes `ci-config.md` (the design narrative that
binds the live `.github/workflows/ci.yml` to the NFRs)
and `quality-gates.md` (the merge-blocking gate
definitions). The agent then runs the
Construction → Operation phase boundary check
(`aidlc/spaces/default/intents/261004-mvp/verification/phase-check-construction.md`)
and presents the approval gate.

When you select **Approve Plan** the receipt command
runs with your exact choice and writes the runtime
authority under `aidlc/.aidlc-sessions/plan-approval/`.
The pipeline-deploy agent then begins Step 4.

When you select **Request Changes** I will revise the
plan, the ci-config, and the quality-gates and present
the plan again. The `[Answer]:` tag is reset; the
content fingerprint regenerates.

- Approve Plan
- Request Changes

[Answer]: Approve Plan
