---
name: 'Version and platform verification review — SmartBiz BD'
type: architecture-review
review-dimension: version-currency-and-live-source-verification
target: '../ARCHITECTURE-SPINE.md'
verified-on: '2026-09-08'
status: complete
---

# Version Verification Review — ARCHITECTURE-SPINE.md

Every technology decision in the **Stack** table and the **Structural Seed → Deployment and environments** section was checked against a live authoritative source on 2026-09-08. Nothing was accepted from prior knowledge.

**Headline:** the spine's research is largely sound — the two load-bearing, highest-risk pins (`inertia-django` 2.0.0 claiming Django 6.1, and the Gemini model ID `gemini-3.5-flash-lite`) are both **correct and live**. Three JS/Python toolchain versions are stale, one badly. Both of the spine's self-declared `[ASSUMPTION]` items are now **resolved from documentation**, which means the assumption block should be rewritten rather than carried into delivery. One previously unnoticed Render free-tier clause is a genuine architectural risk (see Note F).

## Verification table

| # | Claim in spine | Verdict | Actual / evidence | Source |
| --- | --- | --- | --- | --- |
| 1 | Python 3.13 | **VERIFIED** | 3.13 is an actively supported branch (latest 3.13.15; security to 2029-10-31). 3.14 is newest, but 3.13 sits inside Django 6.1's supported set. Sensible conservative choice. | `https://endoflife.date/api/python.json`; Django FAQ below |
| 2 | Django 6.1.1 | **VERIFIED** | 6.1.1 is the current release on PyPI, uploaded 2026-09-02. `requires_python: >=3.12`. Supports Python **3.12, 3.13, 3.14**. | `https://pypi.org/pypi/django/json` · `https://docs.djangoproject.com/en/dev/faq/install/` |
| 3 | inertia-django 2.0.0 (**load-bearing**) | **VERIFIED** | Exists, is the current release (uploaded 2026-08-16), and carries the trove classifiers `Framework :: Django :: 6.1` **and** `Framework :: Django :: 5.2`. It explicitly claims Django 6.1 support. `requires_python: >=3.10`. | `https://pypi.org/pypi/inertia-django/json` |
| 4a | React 19.2.8 | **VERIFIED** | `latest` on the npm registry is exactly 19.2.8. | `https://registry.npmjs.org/react/latest` |
| 4b | Vite 7.x | **WRONG (stale)** | Current `latest` is **8.2.2** (2026-08-20). Vite 8.0.0 shipped 2026-03-12. 7.x is the `previous` dist-tag and still gets patches (7.3.6, 2026-06-25), so it is not dead — but it is a full major behind and should not be pinned as the choice in a document dated 2026-09-08. | `https://registry.npmjs.org/vite` |
| 4c | TypeScript 5.x | **WRONG (badly stale)** | Current `latest` is **7.0.2** (2026-07-08). TypeScript 6.0 shipped 2026-03-23. The last 5.x release was **5.9.3 on 2025-09-30** — approximately a year old and two majors behind. | `https://registry.npmjs.org/typescript` |
| 5a | WeasyPrint 70.0 | **VERIFIED** | 70.0 is current — in fact uploaded **2026-09-08**, the same day as this review. | `https://pypi.org/pypi/weasyprint/json` |
| 5b | Pango 1.44.0+, with HarfBuzz and fontconfig (**load-bearing for AD-16**) | **VERIFIED** | WeasyPrint's own docs state the dependency list verbatim: "WeasyPrint 70.0 depends on: Python ≥ 3.10.0, **Pango ≥ 1.44.0**, pydyf ≥ 0.11.0, CFFI ≥ 0.6, tinyhtml5, tinycss2, cssselect2, Pyphen, Pillow ≥ 9.1.0, fontTools ≥ 4.59.2". The required native shared objects are enumerated as `libpango-1.0.so.0`, **`libharfbuzz.so.0`**, **`libharfbuzz-subset.so.0`**, **`libfontconfig.so.1`**, `libpangoft2-1.0.so.0`, `libgobject-2.0.so.0`. The version number and all three named libraries are correct. | `https://doc.courtbouillon.org/weasyprint/stable/first_steps.html` |
| 6 | pypdfium2 5.13.0, rasterises PDF → image | **VERIFIED** | 5.13.0 is current (uploaded 2026-08-13). `PdfPage.render(scale=1, rotation=0, crop=..., may_draw_forms=True, bitmap_maker=PdfBitmap.new_native)` — "Rasterize the page to a `PdfBitmap`". The returned `PdfBitmap` exposes `buffer`, `width`, `height`, `stride` and a PIL-compatible `mode` ("BGR"/"BGRA"/"L"), so PDF→PNG is genuinely supported. AD-16's pipeline is mechanically sound. | `https://pypi.org/pypi/pypdfium2/json` · `https://pypdfium2.readthedocs.io/en/stable/python_api.html` |
| 7 | Gunicorn 23.x | **WRONG** | Current release is **26.2.0** (2026-08-24). Release history since: 25.0.0 (2026-02-01) → 25.3.0 (2026-03-27) → 26.0.0 (2026-05-05) → 26.1.0 → 26.2.0. 23.x is **three majors** behind. `requires_python: >=3.10`. | `https://pypi.org/pypi/gunicorn/json` |
| 8 | PostgreSQL 17 on Neon free | **VERIFIED, but not newest** | Neon supports Postgres **14, 15, 16, 17 and 18**. Latest minor on Neon for 17 is **17.11**. So 17 is a valid, currently-offered selection — the claim is not false. However **18 (18.6) is available**, and Neon states that a major-version upgrade "requires creating a new project and migrating data". Choosing 17 today is a one-way door. | `https://neon.com/docs/reference/compatibility.md` · `https://neon.com/docs/postgresql/postgres-version-policy.md` |
| 9a | Gemini model `gemini-3.5-flash-lite` (**hard-failure risk**) | **VERIFIED — the ID is live** | Listed as a current **stable** model: "Our fastest, most cost-effective 3.5 model for high-throughput execution." The endpoint ID is exactly `gemini-3.5-flash-lite`. | `https://ai.google.dev/gemini-api/docs/models` |
| 9b | Current stable IDs / retired IDs | **VERIFIED (informational)** | Current stable: `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-3-pro-image`, `gemini-3.5-transcribe`, `gemini-3.5-transcribe-live`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`. **Shut down:** `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3.1-flash-lite-preview`, `gemini-3-pro-preview`. | `https://ai.google.dev/gemini-api/docs/models` |
| 9c | Gemini free tier needs no billing account | **VERIFIED** | The Free tier does not require a billing account or card; an API key from Google AI Studio is sufficient. Setting up billing is described as the step to *upgrade* to paid tiers. `gemini-3.5-flash-lite` is available on the free tier. Exact free-tier RPM/RPD figures are not published on the docs page — they are shown per-project in AI Studio (see Note E). | `https://ai.google.dev/gemini-api/docs/rate-limits` |
| 10a | 750 instance-hours per workspace per month | **VERIFIED** | "Render grants **750 Free instance hours** to each workspace per calendar month". Spun-down services do not consume hours; exhausting them suspends all Free web services until the next month; hours reset monthly and do not roll over. | `https://render.com/docs/free` |
| 10b | Single instance | **VERIFIED** | Free web services do not support "Scaling beyond a single instance". | `https://render.com/docs/free` |
| 10c | Spin-down after 15 minutes idle | **VERIFIED** | "Render *spins down* a Free web service that goes **15 minutes** without receiving any inbound traffic" — including WebSocket messages on existing connections. | `https://render.com/docs/free` |
| 10d | ~1 minute to restart | **VERIFIED** | "This process takes **about one minute**. Render displays a loading page to connecting browsers while a service is spinning up." | `https://render.com/docs/free` |
| 10e | Ephemeral filesystem | **VERIFIED** | Filesystem changes are "*lost* every time the service redeploys, restarts, or spins down"; persistent disks are unavailable on Free. | `https://render.com/docs/free` |
| 10f | Dockerfile build supported — and on the FREE instance type | **PARTIALLY RESOLVED** | Render generally: "Render fully supports Docker-based deploys… Build their own image at deploy time based on the Dockerfile in your project repo." **No affirmative per-plan statement exists**, but the Free page's exhaustive "features of paid compute plans" exclusion list (scaling beyond one instance, persistent disks, edge caching, one-off jobs, SSH/shell access) **does not include Docker builds**, and Free web services are explicitly stated to consume "build pipeline minutes". Resolved by documented omission plus positive build-minute consumption, not by a direct claim. See Note D. | `https://render.com/docs/docker` · `https://render.com/docs/free` |
| 10g | Free instance RAM and CPU — spine says "not published on any reachable Render documentation page" | **WRONG — it is published, and now resolved** | The Free compute plan is **0.1 CPU / 512 MB RAM**. Confirmed twice: the web-services compute-plans table, and the plan-identifier list which reads "`free`: 0.1 CPU / 512 MB RAM" (alongside `0.5c-512mb` and `1c-2g`). Note also "Compute plans were previously known as *instance types*" — the terminology change is likely why the spine's search missed it. See Note C. | `https://render.com/docs/compute-plans` · `https://render.com/docs/free` |
| 11 | Render free PostgreSQL expires 30 days after creation (the stated reason for choosing Neon) | **VERIFIED** | "Free Render Postgres databases **expire 30 days after creation**", followed by "a grace period of **14 days** to upgrade it to a paid compute plan. After the grace period, Render deletes the database (along with all of its data)." Also: fixed 1 GB storage, only one active Free Postgres per workspace, and maintenance may occur at any time. **The architecture's detour to Neon was necessary, not unnecessary.** | `https://render.com/docs/free` |
| 12a | Neon free: 0.5 GB storage per project | **VERIFIED** | "**0.5 GB/project**"; "The Free plan is limited to 0.5 GB per project." | `https://neon.com/docs/introduction/plans` |
| 12b | Neon free: ~100 compute-hours per month | **VERIFIED** | "**100 CU-hours/project**/month (enough to run a 0.25 CU compute in a project for 400 hours/month)." The spine's "roughly 100 compute-hours" is right; the effective wall-clock budget at 0.25 CU is ~400 h/month, comfortably above Render's 750 h cap on the app tier. | `https://neon.com/docs/introduction/plans` |
| 12c | Scale-to-zero after 5 min, cannot be disabled | **VERIFIED** | "**Free**: 5 min inactivity; **cannot disable**" (Launch can disable; Scale is configurable). | `https://neon.com/docs/introduction/plans` |
| 12d | Data preserved indefinitely, not expiring | **VERIFIED** | No expiry clause exists anywhere in Neon's Free plan or project-lifecycle documentation. Projects are removed only by explicit user deletion, and even then are recoverable for 7 days. There is no inactivity- or age-based deletion policy of the kind Render publishes. The contrast the spine draws against Render's 30-day expiry holds. | `https://neon.com/docs/introduction/plans` · `https://neon.com/docs/manage/projects` |
| 12e | Instant-restore history window: 6 hours, capped at 1 GB, not extendable | **VERIFIED** | "**Free** \| 6 hours \| 6 hours (capped at 1 GB of history)"; "**Free**: No charge, 6-hour limit, capped at 1 GB-month of changes"; "The history window defaults are 6 hours for Free plan projects". 7 days requires Launch, 30 days requires Scale — so on Free it is a hard ceiling, not a default. **The 6-hour figure the spine uses to resolve the NFR-26 backup assumption is correct.** | `https://neon.com/docs/postgres/backup-restore/history-window.md` · `https://neon.com/docs/introduction/plans` |

**Score: 20 items verified clean · 3 WRONG · 1 partially resolved.**

## Notes

### Note A — The two load-bearing pins both survived

The review was scoped on the assumption that `inertia-django` and the Gemini model ID were the likeliest hard failures, since both are exactly the kind of fact that ages badly. Both checked out precisely: `inertia-django` 2.0.0 is current *and* declares `Framework :: Django :: 6.1`, so the Inertia front-end decision rests on a real, currently-maintained compatibility claim rather than an inferred one; and `gemini-3.5-flash-lite` is a live stable endpoint ID, not a hallucinated interpolation. Four Gemini IDs *are* shut down (`gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3.1-flash-lite-preview`, `gemini-3-pro-preview`) — the spine pinned none of them. AD-13/14/15 stand as written.

### Note B — The three stale versions, in order of severity

1. **Gunicorn 23.x → 26.2.0.** Three majors behind. A pin this old in a document dated 2026-09-08 is the clearest evidence of an unresearched assertion in the Stack table. Recommend `26.x`.
2. **TypeScript 5.x → 7.0.2.** Two majors behind; the last 5.x patch was 2025-09-30, roughly a year stale. Recommend `7.x`.
3. **Vite 7.x → 8.2.2.** One major behind. 7.x is still patched (7.3.6, 2026-06-25) so this is the mildest of the three, but it should be `8.x`.

Also noticed, though outside the twelve requested items: the Stack table's **Playwright "1.5x" is stale** — current is **1.63.0** on npm and **1.62.0** on PyPI, i.e. the 1.6x series. Worth correcting in the same pass. (`https://registry.npmjs.org/@playwright/test/latest`, `https://pypi.org/pypi/playwright/json`)

Nothing in these three corrections disturbs any AD. They are table edits.

### Note C — The `[ASSUMPTION]` block is now factually wrong and must be rewritten

The Structural Seed states: "The Render free instance's RAM and CPU figures are **not published on any reachable Render documentation page**." That is false. They are published in two places, and the figure is **0.1 CPU / 512 MB RAM**. The likely cause of the miss is Render's terminology change — the docs now say "compute plans", noting explicitly that "Compute plans were previously known as *instance types*", so a search for "instance type" would have come up short.

This matters beyond tidiness, because the spine says "The design does not rest on a number: it assumes a small container and a single worker." The number is now known and it is *very* small. 512 MB RAM and one tenth of a CPU must hold Gunicorn plus Django plus WeasyPrint's native stack (Pango, HarfBuzz, fontconfig, pangoft2) plus pypdfium2 plus a Bangla font, and must rasterise a PDF page to a PNG inside a request. AD-16's exclusion of Chromium looks considerably better-judged in light of the real figure — but AD-20's single-worker rule is now a hard requirement rather than a preference, and PDF rasterisation resolution/page-count is a memory risk that deserves a measured check at first deploy. 0.1 CPU also interacts with AD-15's nine-second insight budget and NFR-14's three-second report ceiling: CPU-bound report queries and rasterisation will be slow, and that is a shared-CPU allocation, not a burst guarantee.

Recommend: replace the `[ASSUMPTION]` with the verified figures, and keep only a narrow, genuinely open assumption about *measured* peak memory during rasterisation.

### Note D — Docker on Free: as close to resolved as the docs allow

Render's Docker page affirms Dockerfile-at-deploy-time builds for services generally but says nothing per-plan. The Free page, however, gives an itemised list of "features of paid compute plans" that Free web services do **not** support — scaling beyond a single instance, persistent disks, edge caching, one-off jobs, SSH/shell access — and Docker builds are absent from it. Separately, Free web services are stated to consume monthly **build pipeline minutes**, which only makes sense if they build. Together this is strong documentary support, but it remains an argument from omission rather than an affirmative sentence. Downgrade the spine's phrasing from "unverified" to "supported; no plan restriction documented, and Docker is absent from the Free exclusion list" — and confirm at first deploy, which the spine already plans to do.

### Note E — One genuinely unverifiable figure

Free-tier Gemini **rate limits** (RPM / RPD / TPM) for `gemini-3.5-flash-lite` are not published as numbers on the rate-limits documentation page; Google directs users to the per-project Rate Limit view inside AI Studio, which requires an authenticated session. Attempted: the official rate-limits doc and the models doc. The *existence and no-billing nature* of the free tier is verified; the *quota numbers* are not obtainable without an account. This does not damage the architecture — the "Quota behaviour under one shared Insight Provider key" item is already in **Deferred**, and AD-12/AD-15 make an exhausted quota mechanically identical to no key at all. It does mean the Deferred entry should stay deferred rather than being closed out with a guessed number.

### Note F — A Render free-tier clause the spine does not account for (new risk)

Verification surfaced a documented Free-plan behaviour with direct architectural bearing, not covered by any AD:

> **Service-initiated traffic threshold** — "Render may suspend a Free web service that initiates an uncommonly high volume of traffic over the public internet." The examples given are, verbatim: "**Accessing an external database**", "**Invoking external APIs**", "Transferring data to or from external object storage". Recovery requires moving to a paid plan.

This is aimed squarely at the shape this architecture has chosen. The database is deliberately off-platform (Neon, over TLS across the public internet — the choice validated in item 11) and the insight provider is an external API (Gemini, AD-13). Both named examples are load-bearing edges in the deployment diagram. At 50 orders a day the volume is realistically nowhere near any plausible threshold, so this is not a redesign trigger — but the threshold is unpublished, the penalty is suspension of the assessed artifact, and the remedy is a paid plan. It deserves a sentence in the deployment envelope acknowledging the clause, and it is a further argument for AD-20's no-polling, no-scheduler stance and for the Deferred "Caching" item's revisit condition. Chatty per-request query patterns against Neon are now a platform-policy concern, not merely a latency one.

Two smaller Free-plan facts also worth recording in the envelope:

- Free web services **cannot send outbound traffic on ports 25, 465 or 587** (SMTP). This independently *vindicates* AD-19 — a reset flow depending on email transport would not merely be undemonstrable for lack of a mail service, it would be blocked at the platform network layer. AD-19's one-time recovery code is the only workable design on this host.
- Free web services **cannot receive private network traffic** and have **no SSH/shell access**. The latter is relevant to AD-19's stated consequence that "a lost code makes the account unrecoverable without direct database access" — direct access must come via Neon's own console or a local client, never via the Render instance. Likewise NFR-22's "documented manual procedure" for backup cannot be a shell command on the Render box; it must be run from a developer machine against Neon.

### Note G — Postgres 17 versus 18 (advisory, not a defect)

Postgres 17 is currently offered by Neon (17.11), so the pin is valid and item 8 is not a failure. But 18 is available (18.6), and Neon documents that major-version upgrades are **not** in-place — they "require creating a new project and migrating data". For a project whose database is intended to persist indefinitely as the assessed artifact, starting on 17 when 18 is offered is a defensible conservative call but should be a *stated* one rather than an unexplained number. A one-line rationale in the Stack table would close it.

## Recommended edits

1. **Stack table:** Gunicorn `23.x` → `26.x`; TypeScript `5.x` → `7.x`; Vite `7.x` → `8.x`; Playwright `1.5x` → `1.6x`.
2. **Structural Seed `[ASSUMPTION]` block:** replace with the verified **0.1 CPU / 512 MB RAM**; restate Docker-on-Free as supported-by-omission; retain only a measured-peak-memory assumption for PDF rasterisation.
3. **Deployment envelope:** add the service-initiated traffic threshold (Note F) and the SMTP port block (which strengthens AD-19).
4. **Stack table:** add a one-line rationale for Postgres 17 over the available 18 (Note G).
5. **Leave untouched:** AD-13, AD-14, AD-15, AD-16, AD-18, AD-20 and the Neon-over-Render database decision. All verified correct on every fact checked.
