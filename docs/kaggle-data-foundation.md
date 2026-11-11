# Kaggle Data Foundation

Schemas and design for the reusable Kaggle user data foundation. Source of truth: plan `1794412923376-kaggle-data-foundation.md`.

## Location

Implementation source: `app/lib/kaggle-foundation/`
- `schemas.ts` — TypeScript data model
- `repository.ts` — repository interface (swapable storage backend)
- `json-storage.ts` — JSON file-backed implementation (local dev; SQLite later)
- `pipeline.ts` — fetch + normalize + store pipeline
- `foundation.ts` — `getUserFoundation`, `collectSnapshot`, availability report

Data directory: `data/kaggle-foundation/` (gitignored).

## Data model

All dates are ISO UTC strings.

### Raw layer (verbatim API responses)

`RawKaggleResponse` — `endpoint`, `username`, `fetchedAt`, `status`, `body`, `etag`.

Stored per endpoint per username. Never overwritten by normalized data; kept for reprocessing.

### Normalized user record

`KaggleActivityRecord` — `username`, `id` (`${type}-${ref}`), `type`, `title`, `description`, `date`, `url`, `votes`, `views`, `downloads`, `language`, `metadata` (verbatim API item).

### Profile

`KaggleUserProfile` — `username`, `profileUrl`, `registrationDate` (null today), `tier` (null), `followers` (null), `rank` (null). Unavailable fields are explicit `null`, never estimated.

### Stats

`KaggleContributionStats` — `total`, `notebooks`, `datasets`, `models`, `competitions`, `discussions`. Models/competitions/discussions are 0 today (endpoints not called).

### Freshness

`DataFreshness` — `lastSuccessfulFetch`, `lastActivityUpdate`, `lastAnalyticsCalculation`, `fetchFailures`, `incompleteDatasets`, `cacheExpiresAt`.

### Snapshot

`Snapshot` — `id` (`${username}-${YYYY-MM-DD}`), `username`, `timestamp`, `day` (UTC), `followers`, `rank`, `tier`, `notebookCount`, `datasetCount`, `competitionCount`. One row per user per day; duplicates prevented.

### Foundation payload

`KaggleUserFoundation` — `profile`, `stats`, `activities`, `metadata`, `freshness`, `availability`. Consumed by analytics modules; they know nothing about the Kaggle API.

## Storage

Repository interface `KaggleRepository` with methods for raw responses, profiles, activities, snapshots, freshness. Default implementation `JsonKaggleRepository` writes JSON files under `data/kaggle-foundation/`. Designed so SQLite (e.g. `better-sqlite3`) can be swapped behind the same interface for serverless/deployed targets.

## Cache / freshness interplay

- Persistent cache is source of truth; survives restarts (replaces the old in-memory `Map`).
- Cache TTL: 5 minutes, configurable per username.
- On cache hit within TTL: return stored foundation, no Kaggle call.
- On cache miss/stale: fetch notebooks + datasets, store raw + normalized, refresh freshness.
- On API failure: return last-known cached foundation if available (stale-while-revalidate), increment `fetchFailures`; otherwise surface error.

## Snapshot collection

`collectSnapshot(username)` writes a daily snapshot row, keyed by UTC day, preventing same-day duplicates. Started in Stage 0 so follower/rank/tier history begins accumulating immediately.
