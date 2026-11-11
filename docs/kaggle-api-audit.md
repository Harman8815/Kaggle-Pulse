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

- No historical snapshots; no freshness tracking beyond TTL.
- No distinction between "zero contributions" and "data unavailable."
- No persistence; no repository abstraction.
