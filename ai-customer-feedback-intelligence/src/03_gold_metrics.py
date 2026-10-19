"""
Gold: business KPI tables (overview, category, daily, source)

Written as Fabric notebook cells (`# %%` separates cells).
Requires a Spark session with the CustomerFeedbackLH lakehouse attached.
"""

# %%

from pyspark.sql import functions as F

# Read clean Silver data
silver_df = spark.table("silver_customer_feedback")

# Business rule: ratings 1–2 are low; ratings 4–5 are high
low_rating = F.col("rating") <= 2
high_rating = F.col("rating") >= 4

# 1. Overall business KPIs
gold_overview = silver_df.agg(
    F.count("*").alias("total_reviews"),
    F.round(F.avg("rating"), 2).alias("average_rating"),
    F.sum(F.when(low_rating, 1).otherwise(0)).alias("low_rating_reviews"),
    F.sum(F.when(high_rating, 1).otherwise(0)).alias("high_rating_reviews")
).withColumn(
    "low_rating_pct",
    F.round(
        F.col("low_rating_reviews") / F.col("total_reviews") * 100, 2
    )
).withColumn(
    "high_rating_pct",
    F.round(
        F.col("high_rating_reviews") / F.col("total_reviews") * 100, 2
    )
)

# 2. Performance by product category
gold_category = silver_df.groupBy("product_category").agg(
    F.count("*").alias("total_reviews"),
    F.round(F.avg("rating"), 2).alias("average_rating"),
    F.sum(F.when(low_rating, 1).otherwise(0)).alias("low_rating_reviews"),
    F.sum(F.when(high_rating, 1).otherwise(0)).alias("high_rating_reviews")
).withColumn(
    "low_rating_pct",
    F.round(F.col("low_rating_reviews") / F.col("total_reviews") * 100, 2)
).orderBy("average_rating")

# 3. Daily customer feedback trends
gold_daily = silver_df.groupBy("review_date").agg(
    F.count("*").alias("total_reviews"),
    F.round(F.avg("rating"), 2).alias("average_rating"),
    F.sum(F.when(low_rating, 1).otherwise(0)).alias("low_rating_reviews")
).orderBy("review_date")

# 4. Feedback by source system
gold_source = silver_df.groupBy("source_system").agg(
    F.count("*").alias("total_reviews"),
    F.round(F.avg("rating"), 2).alias("average_rating"),
    F.sum(F.when(low_rating, 1).otherwise(0)).alias("low_rating_reviews")
).orderBy("average_rating")

# Save Gold tables as Delta tables
gold_overview.write.format("delta").mode("overwrite").saveAsTable(
    "gold_feedback_overview"
)
gold_category.write.format("delta").mode("overwrite").saveAsTable(
    "gold_category_metrics"
)
gold_daily.write.format("delta").mode("overwrite").saveAsTable(
    "gold_daily_trends"
)
gold_source.write.format("delta").mode("overwrite").saveAsTable(
    "gold_source_metrics"
)

print("Gold business metrics created successfully!")

# %%

print("=== OVERALL CUSTOMER EXPERIENCE ===")
spark.table("gold_feedback_overview").show(truncate=False)

print("=== PRODUCT CATEGORY PERFORMANCE ===")
spark.table("gold_category_metrics").show(truncate=False)

print("=== DAILY FEEDBACK TRENDS ===")
spark.table("gold_daily_trends").show(truncate=False)

print("=== FEEDBACK BY SOURCE ===")
spark.table("gold_source_metrics").show(truncate=False)
