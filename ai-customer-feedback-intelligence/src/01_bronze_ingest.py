"""
Bronze: ingest synthetic customer reviews into a Delta table

Written as Fabric notebook cells (`# %%` separates cells).
Requires a Spark session with the CustomerFeedbackLH lakehouse attached.
"""

# %%

from pyspark.sql import functions as F

# 1. Create synthetic customer feedback
reviews = [
    (1, "The delivery was fast and the product is excellent", "Electronics", 5, "2026-10-01", "Web"),
    (2, "Battery life is terrible and does not last", "Electronics", 1, "2026-10-01", "Mobile"),
    (3, "Good quality for the price", "Home", 4, "2026-10-02", "Web"),
    (4, "Customer support never responded to my complaint", "Services", 1, "2026-10-02", "Mobile"),
    (5, "Very happy with the purchase", "Fashion", 5, "2026-10-03", "Web"),
    (6, "The package arrived damaged", "Home", 2, "2026-10-03", "Partner"),
    (7, "Easy to use and works as expected", "Electronics", 4, "2026-10-04", "Mobile"),
    (8, "Too expensive for this quality", "Fashion", 2, "2026-10-04", "Web"),
    (9, "Excellent customer service", "Services", 5, "2026-10-05", "Partner"),
    (10, "The app keeps crashing", "Electronics", 1, "2026-10-05", "Mobile"),
    (11, "Delivery was late but the product is fine", "Home", 3, "2026-10-06", "Web"),
    (12, "Great value and quick delivery", "Fashion", 5, "2026-10-06", "Partner"),
    (13, "Instructions were confusing", "Home", 2, "2026-10-07", "Mobile"),
    (14, "The product exceeded my expectations", "Electronics", 5, "2026-10-07", "Web"),
    (15, "Refund process was very slow", "Services", 2, "2026-10-08", "Partner"),
    (16, "Comfortable and well made", "Fashion", 4, "2026-10-08", "Mobile"),
    (17, "Not working after two days", "Electronics", 1, "2026-10-09", "Web"),
    (18, "Helpful support team resolved my issue", "Services", 4, "2026-10-09", "Mobile"),
    (19, "Average product, nothing special", "Home", 3, "2026-10-10", "Partner"),
    (20, "Fantastic experience from start to finish", "Fashion", 5, "2026-10-10", "Web")
]

columns = [
    "record_id",
    "review_text",
    "product_category",
    "rating",
    "review_date",
    "source_system"
]

df = spark.createDataFrame(reviews, columns)

# 2. Add ingestion metadata
df = (
    df.withColumn("review_date", F.to_date("review_date", "yyyy-MM-dd"))
      .withColumn("ingested_at", F.current_timestamp())
)

# 3. Inspect the incoming dataset
print(f"Incoming record count: {df.count()}")
df.show(truncate=False)

# %%

# Write the initial dataset to the attached Lakehouse
(
    df.write
      .format("delta")
      .mode("overwrite")
      .saveAsTable("bronze_customer_feedback")
)

print("Bronze ingestion completed.")

spark.sql("""
    SELECT COUNT(*) AS total_rows
    FROM bronze_customer_feedback
""").show()

spark.sql("""
    SELECT *
    FROM bronze_customer_feedback
    ORDER BY record_id
    LIMIT 5
""").show(truncate=False)
