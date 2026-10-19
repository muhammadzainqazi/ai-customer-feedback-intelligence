"""
Silver: data-quality rules, deduplication and quarantine

Written as Fabric notebook cells (`# %%` separates cells).
Requires a Spark session with the CustomerFeedbackLH lakehouse attached.
"""

# %%

from pyspark.sql import functions as F
from functools import reduce

# 1. Read the persisted Bronze table
bronze_df = spark.table("bronze_customer_feedback")

# 2. Create test records to demonstrate quality handling
# ID 2 is a duplicate; IDs 21-23 contain invalid data.
test_records = [
    (2, "Duplicate review record", "Electronics", 4, "2026-10-01", "Web"),
    (21, "Rating outside valid range", "Home", 6, "2026-10-11", "Web"),
    (22, None, "Fashion", 4, "2026-10-11", "Mobile"),
    (23, "Invalid date review", "Services", 3, "not-a-date", "Partner")
]

test_df = spark.createDataFrame(
    test_records,
    [
        "record_id", "review_text", "product_category",
        "rating", "review_date", "source_system"
    ]
).withColumn(
    "review_date", F.to_date("review_date", "yyyy-MM-dd")
).withColumn(
    "ingested_at", F.current_timestamp()
)

# 3. Combine Bronze records with test records
combined_df = bronze_df.unionByName(test_df)

print("Bronze records:", bronze_df.count())
print("Records including test cases:", combined_df.count())

# %%

# 1. Define quality rules
checked_df = (
    combined_df
    .withColumn(
        "quality_errors",
        F.concat_ws(
            "; ",
            F.when(
                F.col("record_id").isNull(),
                F.lit("Missing record_id")
            ),
            F.when(
                F.col("review_text").isNull() |
                (F.trim(F.col("review_text")) == ""),
                F.lit("Missing review_text")
            ),
            F.when(
                F.col("product_category").isNull() |
                (F.trim(F.col("product_category")) == ""),
                F.lit("Missing product_category")
            ),
            F.when(
                F.col("source_system").isNull() |
                (F.trim(F.col("source_system")) == ""),
                F.lit("Missing source_system")
            ),
            F.when(
                F.col("rating").isNull() |
                (~F.col("rating").between(1, 5)),
                F.lit("Rating must be between 1 and 5")
            ),
            F.when(
                F.col("review_date").isNull(),
                F.lit("Missing or invalid review_date")
            )
        )
    )
)

# 2. Separate records with basic validation failures
invalid_df = checked_df.filter(F.col("quality_errors") != "")
valid_candidates = checked_df.filter(F.col("quality_errors") == "")

# 3. Identify duplicate IDs among otherwise valid records
from pyspark.sql.window import Window

dedup_window = Window.partitionBy("record_id").orderBy(
    F.col("ingested_at").asc()
)

ranked_df = valid_candidates.withColumn(
    "duplicate_rank", F.row_number().over(dedup_window)
)

duplicate_df = ranked_df.filter(F.col("duplicate_rank") > 1)
silver_df = ranked_df.filter(F.col("duplicate_rank") == 1)

# 4. Add duplicate records to quarantine with a rejection reason
duplicate_quarantine = (
    duplicate_df
    .withColumn("quality_errors", F.lit("Duplicate record_id"))
    .drop("duplicate_rank")
)

invalid_quarantine = invalid_df

# 5. Create final quarantine dataset
quarantine_df = invalid_quarantine.unionByName(
    duplicate_quarantine
)

# 6. Remove internal processing columns from Silver
silver_df = silver_df.drop(
    "quality_errors", "duplicate_rank"
)

print("Valid unique records:", silver_df.count())
print("Quarantined records:", quarantine_df.count())

# %%

# Persist cleaned records
(
    silver_df.write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("silver_customer_feedback")
)

# Persist rejected records with their quality errors
(
    quarantine_df.write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("quarantine_customer_feedback")
)

print("Silver and quarantine tables saved.")

# %%

print("=== DATA QUALITY SUMMARY ===")

spark.sql("""
    SELECT 'Bronze' AS layer, COUNT(*) AS record_count
    FROM bronze_customer_feedback

    UNION ALL

    SELECT 'Silver', COUNT(*)
    FROM silver_customer_feedback

    UNION ALL

    SELECT 'Quarantine', COUNT(*)
    FROM quarantine_customer_feedback
""").show()

print("=== QUARANTINE REASONS ===")

spark.sql("""
    SELECT record_id, quality_errors
    FROM quarantine_customer_feedback
    ORDER BY record_id
""").show(truncate=False)
