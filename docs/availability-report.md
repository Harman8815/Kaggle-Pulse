# Kaggle Data Availability Report

Classifies each metric as `available`, `needs_collection`, or `blocked` per the API/Derived/Snapshot classification in `docs/task.md`. Zero values are never presented as estimates; unavailable fields are explicit `null`.

## Classification by metric

| Metric | Classification | Source | Notes |
|---|---|---|---|
| Username / profileUrl | available | Kaggle API (kernels/datasets) | Always derivable |
| Notebook count | available | `kernels/list` | pageSize=100, single page |
| Dataset count | available | `datasets/list` | pageSize=100, single page |
| Activity records (Notebook/Dataset) | available | `kernels/list` + `datasets/list` | date: lastRunTime / lastUpdated |
| Notebook metadata (ref, title) | available | `kernels/list` | tags not exposed |
| Dataset metadata (ref, title) | available | `datasets/list` | tags not exposed |
| Models count | blocked | not called | hardcoded 0 today |
| Competitions count | blocked | not called | hardcoded 0 today |
| Discussions count | blocked | not called | hardcoded 0 today |
| Registration date | blocked | profile endpoint not integrated | null |
| Tier | blocked | profile endpoint not integrated | null |
| Followers | blocked | profile endpoint not integrated | null |
| Rank | blocked | profile endpoint not integrated | null |
| Historical snapshots | needs_collection | on-view collection and protected daily endpoint | one UTC-day snapshot per user; filesystem storage must be durable |
| Freshness tracking | available | foundation layer | lastSuccessfulFetch, fetchFailures |

## What analytics can run now

- Activity heatmap / monthly activity (Notebook + Dataset).
- Type counts and contribution stats (Notebook/Dataset only).
- Recent activity list.
- Current-activity topic overlap in Fair Head-to-Head, based on currently returned public activity metadata only.
- Notebook/dataset percentiles within a configured tracked-profile sample when at least 30 usable snapshots exist. These are sample-relative, not Kaggle-wide percentiles.
- First-observed notebook/dataset topic catalog counts for configured profiles; these measure collection visibility, not Kaggle publication trends.
- Source-documented relationship graphs only after authenticated curated records are ingested.

## What needs collection

- Historical growth over 7, 30, 90, or 365 days, only when snapshots span the requested interval and the metric is present in both snapshots.
- Scheduled daily snapshots for profiles in `KAGGLE_TRACKED_USERS`, using an external scheduler to call the protected snapshot endpoint.
- More reliable and better-covered cohort distributions as the configured tracked sample grows.
- At least 180 days of tracked topic observations before any topic direction may be shown.

## What is blocked

- Anything requiring models, competitions, discussions, profile tier/followers/rank, or registration date until the corresponding endpoints are integrated.
- First 12/24/36-month Fair Head-to-Head metrics until registration dates and complete historical contribution records are available. Current latest-run/update timestamps do not prove creation dates.
- Durable deployed history on ephemeral/serverless storage until the JSON repository is replaced with a durable database or shared volume.
- Registration-year, tier, specialization, or account-age cohorts until Kaggle provides those fields and the tracked population has sufficient coverage.
- Historical topic publication trends and personal adoption timing because publication timestamps and full historical catalog metadata are unavailable.
- Automatic collaboration-network collection and any network conclusions until verified team membership or public interaction sources are integrated. Shared competition participation is stored as a separate relationship type and never implies teamwork.
