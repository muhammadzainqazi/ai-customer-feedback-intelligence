"""
AI: DistilBERT sentiment inference with Hugging Face Transformers

Written as Fabric notebook cells (`# %%` separates cells).
Requires a Spark session with the CustomerFeedbackLH lakehouse attached.
"""

# %%

# (notebook magic) %pip install transformers torch

# %%

import os

os.environ["HF_HUB_DISABLE_XET"] = "1"

print("Hugging Face Xet downloads disabled for this session.")

# %%

import os
os.environ["HF_HUB_DISABLE_XET"] = "1"

import torch
import transformers

print("PyTorch:", torch.__version__)
print("Transformers:", transformers.__version__)
print("Libraries loaded successfully.")

# %%

import os
os.environ["HF_HUB_DISABLE_XET"] = "1"

from transformers import pipeline

sentiment_model = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
)

tests = [
    "The delivery was fast and the product is excellent",
    "Battery life is terrible and does not last"
]

for review, result in zip(tests, sentiment_model(tests, truncation=True)):
    print("Review:", review)
    print("Sentiment:", result["label"])
    print("Confidence:", round(result["score"], 4))
    print("-" * 40)

# %%

from transformers import pipeline
from pyspark.sql import functions as F

# Load the real sentiment model
sentiment_model = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
)

# Read clean Silver records
silver_df = spark.table("silver_customer_feedback")

# This demo dataset is small (20 rows), so collect it for batch inference.
# For large production datasets, use distributed batch inference instead.
reviews = (
    silver_df
    .select("record_id", "review_text")
    .orderBy("record_id")
    .collect()
)

# Run actual model inference
predictions = sentiment_model(
    [row["review_text"] for row in reviews],
    truncation=True,
    batch_size=8
)

# Combine each prediction with its original record ID
results = [
    (
        row["record_id"],
        row["review_text"],
        prediction["label"].capitalize(),
        float(prediction["score"]),
        "distilbert-base-uncased-finetuned-sst-2-english"
    )
    for row, prediction in zip(reviews, predictions)
]

result_schema = [
    "record_id",
    "review_text",
    "ai_sentiment",
    "sentiment_confidence",
    "model_name"
]

ai_df = spark.createDataFrame(results, result_schema)

# Add processing timestamp and persist results
ai_df = ai_df.withColumn(
    "processed_at", F.current_timestamp()
)

(
    ai_df.write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("gold_ai_sentiment")
)

print("AI sentiment analysis completed.")
print("Reviews processed:", len(results))

# %%

print("=== AI SENTIMENT RESULTS ===")

spark.table("gold_ai_sentiment").select(
    "record_id",
    "review_text",
    "ai_sentiment",
    "sentiment_confidence"
).orderBy("record_id").show(25, truncate=False)

print("=== SENTIMENT SUMMARY ===")

spark.table("gold_ai_sentiment").groupBy(
    "ai_sentiment"
).agg(
    F.count("*").alias("review_count"),
    F.round(F.avg("sentiment_confidence"), 4).alias(
        "average_model_confidence"
    )
).show()
