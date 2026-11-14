# Kaggle Data Foundation

Schemas and design for the reusable Kaggle user data foundation. Source of truth: plan `1794412923376-kaggle-data-foundation.md`.

## Location

Implementation source: `app/lib/kaggle-foundation/`
- `schemas.ts` — TypeScript data model
- `repository.ts` — repository interface (swapable storage backend)
- `json-storage.ts` — JSON file-backed implementation (local dev; SQLite later)
- `pipeline.ts` — fetch + normalize + store pipeline
- `foundation.ts` — `getUserFoundation`, `collectSnapshot`, availability report

Data directory: `data/kaggle-foundation/` (gitignored). The JSON repository is suitable for local development and persistent, single-instance deployments only. It is not durable across ephemeral/serverless instances; use a persistent volume or implement a database-backed `KaggleRepository` before relying on production history.

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

`Snapshot` — `id` (`${username}-${YYYY-MM-DD}`), `username`, `timestamp`, `day` (UTC), `followers`, `rank`, `tier`, `notebookCount`, `datasetCount`, `competitionCount`. Fields not provided by the connected Kaggle endpoints are `null`; they are not recorded as zero. One row per user per UTC day; duplicates are prevented.

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

- Activity dashboard and history requests call `collectSnapshot(username)`, which stores at most one snapshot per UTC day.
- `POST /api/kaggle/snapshots` supports an external daily scheduler. Configure `CRON_SECRET` and a comma-separated `KAGGLE_TRACKED_USERS`, then send `Authorization: Bearer <CRON_SECRET>`. The endpoint returns per-user success/failure results; it processes users sequentially.
- Snapshot collection attempts are persisted in freshness metadata, including a cumulative failure count, last attempt time, and last error. A successful attempt clears the last error without clearing the cumulative failure count.
- Stale cached profile data is never timestamped as a new snapshot after a failed Kaggle refresh; the failed attempt is recorded instead.
- The scheduled endpoint does not itself create a scheduler. Configure one in the hosting platform to call it once per day.
- Snapshot writes currently use the JSON repository. The host must provide durable shared filesystem storage for history to persist; ephemeral or multi-instance/serverless deployments need a database or shared persistent volume.
- Current profile integration does not return registration date, follower count, rank, tier, or competition participation. These remain `null` in snapshots and are shown as unavailable.
- Notebook and dataset snapshot counts reflect the normalized list response, which is currently limited to one page (up to 100 items). They are observed public-item counts, not guaranteed complete Kaggle totals.
- Growth is reported only when snapshots span the requested interval and the metric is present in both endpoint snapshots. It is not backfilled from current totals.

## Fair comparison

`GET /api/kaggle/compare?a=<username>&b=<username>` returns topic overlap based on currently returned public activity metadata. It explicitly marks equal account-age windows unavailable until registration dates and complete historical contribution records are available. An empty public activity response is not treated as proof that an account does not exist. Topic similarity is not a measure of collaboration ability.

The comparison and history views are available at `/compare` and `/history/<username>`. The history landing page is `/history`.
