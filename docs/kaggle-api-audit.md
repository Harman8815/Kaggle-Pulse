# Kaggle API Audit

Source of truth: `docs/task.md` Stage 0, plan `1794412923376-kaggle-data-foundation.md`.

## Endpoints in use

| Endpoint | Base | Params | Fields captured | Status |
|---|---|---|---|---|
| `kernels/list` | `https://www.kaggle.com/api/v1` | `user={username}`, `pageSize=100` | ref, title, description, lastRunTime, totalVotes, totalViews, language | Working (single page) |
| `datasets/list` | `https://www.kaggle.com/api/v1` | `user={username}`, `pageSize=100` | ref, title, description, lastUpdated, totalVotes, totalViews, downloadCount, language | Working (single page) |

## Endpoints NOT called

| Endpoint | Reason | Impact |
|---|---|---|
| Profile / user detail | Not integrated | registrationDate, tier, followers, rank unavailable |
| Models | Not integrated | models stat hardcoded to 0 |
| Competitions | Not integrated | competitions stat hardcoded to 0 |
| Discussions | Not integrated | discussions stat hardcoded to 0 |

## Pagination

- Single-page fetch with `pageSize=100`. Active users with >100 notebooks or datasets lose data.
- No cursor/offset handling. Foundation layer is designed to accept future pagination without schema churn (raw responses stored verbatim per endpoint).

## Date semantics

| Type | Date field | Mapped to |
|---|---|---|
| Notebook | `lastRunTime` | `KaggleActivityRecord.date` |
| Dataset | `lastUpdated` | `KaggleActivityRecord.date` |

Both stored as ISO UTC strings. Downstream heatmap/monthly builders depend on `date`.

## Raw data retention

- Previous integration discarded raw API responses after normalization.
- Foundation layer stores verbatim raw responses in `raw_responses` for reprocessing.

## Credentials

- `KAGGLE_API_TOKEN` + `KAGGLE_USERNAME` (server-side, `.env`).
- `KAGGLE_KEY` present but unused.
- `NEXT_PUBLIC_USERNAME` used as fallback username in route.

## Caching (previous)

- Server-side in-memory `Map`, 5-min TTL, keys `${cacheKey}-notebooks\|datasets`.
- Lost on server restart.
- Route set `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
- Upstream fetch used `cache: "no-store"`.

## Known gaps

- No registration date or profile statistics until profile retrieval is integrated.
- No models, competitions, or discussions data.
- No pagination; users with more than 100 notebooks or datasets have incomplete results.
- On-view and scheduled daily snapshots are implemented through the JSON repository. The protected scheduler endpoint is `POST /api/kaggle/snapshots`, configured with `CRON_SECRET` and `KAGGLE_TRACKED_USERS`.
- JSON storage requires a durable, shared filesystem. It does not provide production history guarantees on ephemeral/serverless or multi-instance hosts.
- Followers, rank, tier, registration date, and competition count remain `null` because the configured endpoints do not provide them.
- Historical growth is reported only when genuine snapshots span the requested interval; existing Kaggle totals are not used to reconstruct earlier values.
- Fair account-age windows remain unavailable until registration dates and complete historical contribution records can be verified.
- Cohort percentiles can only describe the configured tracked sample once at least 30 profiles have valid daily metric snapshots; the sample is not assumed to represent all Kaggle users.
- Topic observations capture the time this app first saw a returned item, not the item's publication date. Trend direction is therefore limited to first-observed catalog growth in the configured sample.
- The connected endpoints do not expose verified teammate, competition participation, or forum-interaction relationships. Network edges require authenticated, source-documented curated ingestion and are not independently verified by the application.
- Kaggle Atlas projects only configured tracked profiles with stored classifiable activity. Registration cohort, archetype, verified collaboration, and historical specialization trajectories are not available from the current collection.
