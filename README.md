# What to Watch

Find something to watch faster, by making movies/shows genuinely
searchable and filterable instead of scrolling five different streaming
apps — filter by platform, score, genre, year, and more.

## How it works

- **Collector** (`cmd/collector`) — scrapes title metadata, streaming
  availability, and scores (IMDb, Rotten Tomatoes, ...) from providers
  on a schedule and writes them to Postgres.
- **Search API** (`cmd/search-api`) — serves fast, filterable search
  against that same database (platform, score, genre, year...) for the
  frontend.
- **ETL** (`etl/`) — Spark cleans/dedupes raw scraped rows, dbt models
  them into a queryable warehouse layer (normalizing scores across
  sources), and Airflow orchestrates the nightly run of both.

## Layout

| Path | What |
|---|---|
| `cmd/collector` | scraping / data-collection service |
| `cmd/search-api` | title search service |
| `internal/db/migrations` | Postgres schema |
| `etl/spark` | raw-data cleaning job |
| `etl/dbt` | warehouse transformation models |
| `etl/airflow/dags` | pipeline orchestration |

## Status

Scaffold only — service entrypoints, one migration, and one file per ETL
tool are in place; scraping/search/transformation logic is not yet
implemented (see the `TODO`s throughout).

## Local dev

```sh
go run ./cmd/collector
go run ./cmd/search-api
```
