"""
Rule-based baseline: keyword sentiment and themes (v1 and improved v2)

Written as Fabric notebook cells (`# %%` separates cells).
Requires a Spark session with the CustomerFeedbackLH lakehouse attached.
"""

# %%

from pyspark.sql import functions as F

silver_df = spark.table("silver_customer_feedback")

text = F.lower(F.coalesce(F.col("review_text"), F.lit("")))

# Baseline sentiment classification
enriched_df = silver_df.withColumn(
    "sentiment",
    F.when(
        text.rlike(
            r"\b(terrible|never responded|damaged|crashing|"
            r"too expensive|slow|not working|confusing)\b"
        ),
        "Negative"
    ).when(
        text.rlike(
            r"\b(excellent|happy|great|fantastic|helpful|"
            r"love|comfortable|exceeded|quick|fast)\b"
        ),
        "Positive"
    ).otherwise("Neutral")
)

# Baseline complaint theme classification
enriched_df = enriched_df.withColumn(
    "feedback_theme",
    F.when(
        text.rlike(r"\b(delivery|delivered|arrived|package)\b"),
        "Delivery"
    ).when(
        text.rlike(r"\b(battery|product|quality|working|instructions)\b"),
        "Product Quality"
    ).when(
        text.rlike(r"\b(expensive|price|value)\b"),
        "Pricing"
    ).when(
        text.rlike(r"\b(support|service|complaint|refund|team)\b"),
        "Customer Service"
    ).when(
        text.rlike(r"\b(app|crashing|technical|software)\b"),
        "App/Technical Issue"
    ).otherwise("Other")
).withColumn(
    "enrichment_method",
    F.lit("Keyword baseline")
).withColumn(
    "enrichment_status",
    F.lit("Completed")
)

# Persist enriched data as a Gold Delta table
(
    enriched_df.write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("gold_customer_feedback_enriched")
)

print("Enrichment baseline created successfully.")

# %%

spark.table("gold_customer_feedback_enriched").select(
    "record_id",
    "review_text",
    "rating",
    "sentiment",
    "feedback_theme",
    "enrichment_method",
    "enrichment_status"
).orderBy("record_id").show(25, truncate=False)

# %%
from pyspark.sql import functions as F

positive_pattern = (
    r"good quality|easy to use|works as expected|"
    r"excellent|great|love|amazing|fantastic|"
    r"happy|satisfied|exceeded my expectations|"
    r"good|comfortable|well made|helpful|"
    r"resolved my issue|great value|recommend|"
    r"fast delivery|quick delivery"
)

negative_pattern = (
    r"terrible|poor|broken|defective|"
    r"late delivery|arrived damaged|damaged|"
    r"disappointed|waste|does not work|"
    r"not working|never responded|"
    r"keeps crashing|too expensive|"
    r"confusing|very slow|slow|not worth"
)

silver_df = spark.table("silver_customer_feedback")

improved_df = silver_df.withColumn(
    "sentiment",
    F.when(
        F.lower(F.col("review_text")).rlike(negative_pattern),
        "Negative"
    ).when(
        F.lower(F.col("review_text")).rlike(positive_pattern),
        "Positive"
    ).otherwise("Neutral")
)

print("Total reviews:", improved_df.count())
improved_df.select(
    "record_id", "review_text", "sentiment"
).orderBy("record_id").show(20, truncate=False)

# %%
(
    improved_df
    .withColumn("enrichment_method", F.lit("Improved keyword baseline"))
    .withColumn("enrichment_status", F.lit("Completed"))
    .write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("gold_customer_feedback_enriched_v2")
)

print("Improved baseline saved successfully.")

spark.table("gold_customer_feedback_enriched_v2") \
    .groupBy("sentiment") \
    .count() \
    .orderBy("sentiment") \
    .show()
