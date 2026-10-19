"""
Compare baseline vs AI and build the final Gold table

Written as Fabric notebook cells (`# %%` separates cells).
Requires a Spark session with the CustomerFeedbackLH lakehouse attached.
"""

# %%

from pyspark.sql import functions as F

baseline_df = spark.table(
    "gold_customer_feedback_enriched"
).select(
    "record_id",
    F.col("sentiment").alias("baseline_sentiment")
)

ai_df = spark.table(
    "gold_ai_sentiment"
).select(
    "record_id",
    "ai_sentiment"
)

comparison_df = baseline_df.join(
    ai_df,
    on="record_id",
    how="inner"
).withColumn(
    "prediction_match",
    F.col("baseline_sentiment") == F.col("ai_sentiment")
)

print("=== BASELINE VS AI ===")
comparison_df.orderBy("record_id").show(truncate=False)

print("=== AGREEMENT SUMMARY ===")
comparison_df.agg(
    F.count("*").alias("total_reviews"),
    F.sum(
        F.when(F.col("prediction_match"), 1).otherwise(0)
    ).alias("matching_predictions"),
    F.round(
        F.avg(
            F.when(F.col("prediction_match"), 1.0).otherwise(0.0)
        ) * 100,
        2
    ).alias("agreement_percentage")
).show()

# %%
from pyspark.sql import functions as F

baseline_df = spark.table(
    "gold_customer_feedback_enriched"
).select(
    "record_id",
    "review_text",
    F.col("sentiment").alias("baseline_sentiment")
)

ai_df = spark.table(
    "gold_ai_sentiment"
).select(
    "record_id",
    "ai_sentiment",
    "sentiment_confidence"
)

comparison_df = baseline_df.join(
    ai_df,
    on="record_id",
    how="inner"
)

print("=== THE 4 DISAGREEMENTS ===")

comparison_df.filter(
    F.col("baseline_sentiment") != F.col("ai_sentiment")
).select(
    "record_id",
    "review_text",
    "baseline_sentiment",
    "ai_sentiment",
    "sentiment_confidence"
).orderBy("record_id").show(
    truncate=False
)

# %%
from pyspark.sql import functions as F

baseline_v2 = spark.table(
    "gold_customer_feedback_enriched_v2"
).select(
    "record_id",
    F.col("sentiment").alias("baseline_sentiment")
)

ai_df = spark.table(
    "gold_ai_sentiment"
).select(
    "record_id",
    "ai_sentiment"
)

comparison_v2 = baseline_v2.join(
    ai_df,
    on="record_id",
    how="inner"
).withColumn(
    "prediction_match",
    F.col("baseline_sentiment") == F.col("ai_sentiment")
)

print("=== IMPROVED BASELINE VS AI ===")

comparison_v2.agg(
    F.count("*").alias("total_reviews"),
    F.sum(
        F.when(F.col("prediction_match"), 1).otherwise(0)
    ).alias("matching_predictions"),
    F.round(
        F.avg(
            F.when(F.col("prediction_match"), 1.0).otherwise(0.0)
        ) * 100,
        2
    ).alias("agreement_percentage")
).show()

print("=== COMPARISON BY REVIEW ===")

comparison_v2.orderBy("record_id").show(truncate=False)

# %%
from pyspark.sql import functions as F

# Improved baseline sentiment
baseline_df = spark.table(
    "gold_customer_feedback_enriched_v2"
).select(
    "record_id",
    "review_text",
    "product_category",
    "rating",
    "review_date",
    "source_system",
    F.col("sentiment").alias("baseline_sentiment")
)

# Original rule-based themes
themes_df = spark.table(
    "gold_customer_feedback_enriched"
).select(
    "record_id",
    "feedback_theme"
)

# AI predictions
ai_df = spark.table(
    "gold_ai_sentiment"
).select(
    "record_id",
    "ai_sentiment",
    "sentiment_confidence",
    "model_name",
    "processed_at"
)

# Combine the three datasets
final_df = (
    baseline_df
    .join(themes_df, on="record_id", how="inner")
    .join(ai_df, on="record_id", how="inner")
    .withColumn(
        "prediction_match",
        F.col("baseline_sentiment") == F.col("ai_sentiment")
    )
)

# Save the final Gold table
(
    final_df.write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("gold_ai_feedback_enriched")
)

print("Final AI-enriched Gold table created.")

spark.table("gold_ai_feedback_enriched").select(
    "record_id",
    "product_category",
    "rating",
    "baseline_sentiment",
    "ai_sentiment",
    "sentiment_confidence",
    "feedback_theme",
    "prediction_match"
).orderBy("record_id").show(20, truncate=False)

# %%
from pyspark.sql import functions as F

gold_df = spark.table("gold_ai_feedback_enriched")

print("Total rows:", gold_df.count())
print("Total columns:", len(gold_df.columns))
print("Columns:", gold_df.columns)

gold_df.groupBy("ai_sentiment").agg(
    F.count("*").alias("review_count"),
    F.round(
        F.avg("rating"), 2
    ).alias("average_rating")
).orderBy("ai_sentiment").show()
