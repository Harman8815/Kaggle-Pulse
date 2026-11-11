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
| Historical snapshots | needs_collection | collection started Stage 0 | daily, per user |
| Freshness tracking | available | foundation layer | lastSuccessfulFetch, fetchFailures |

## What analytics can run now

- Activity heatmap / monthly activity (Notebook + Dataset).
- Type counts and contribution stats (Notebook/Dataset only).
- Recent activity list.

## What needs collection

- Historical follower/rank/tier trends (snapshots just starting).

## What is blocked

- Anything requiring models, competitions, discussions, profile tier/followers/rank, or registration date until the corresponding endpoints are integrated.
