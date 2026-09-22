"""Spark batch job: clean/dedupe raw scraped title rows before they land
in the warehouse for dbt to model.

Run: spark-submit clean_raw_titles.py --input s3://.../raw --output s3://.../clean

TODO: implement actual cleaning (dedupe by (name, release_year, source),
normalize platform names, clamp/validate score ranges).
"""

from pyspark.sql import SparkSession


def main() -> None:
    spark = SparkSession.builder.appName("clean_raw_titles").getOrCreate()
    # TODO: read raw scraped data, clean it, and write to the staging
    # location etl/dbt/models/staging/stg_titles.sql builds on.
    spark.stop()


if __name__ == "__main__":
    main()
