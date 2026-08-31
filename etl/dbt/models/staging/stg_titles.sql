-- Staging model: one row per cleaned title, sourced from whatever
-- table/location etl/spark/clean_raw_titles.py writes to.
-- TODO: add score normalization (e.g. RT 0-100 vs IMDb 0-10 onto one
-- common scale) once real source data is available.

select
    name,
    kind,
    release_year,
    genres,
    platforms,
    score_imdb,
    score_rt,
    source,
    scraped_at
from {{ source('raw', 'titles') }}
