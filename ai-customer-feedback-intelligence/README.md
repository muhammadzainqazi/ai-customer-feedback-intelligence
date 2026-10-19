# AI-Powered Customer Feedback Intelligence

An end-to-end **Microsoft Fabric** prototype that turns raw customer reviews into a Power BI dashboard, using a medallion architecture (Bronze → Silver → Gold), a rule-based baseline, and a Hugging Face sentiment model.

> **Prototype.** 20 synthetic reviews. Findings demonstrate the pipeline, not real customer research. AI predictions are **not** verified labels.

![Dashboard](docs/dashboard.png)

## What it demonstrates

- Lakehouse architecture with Delta tables (Bronze / Silver / Gold)
- Data quality: validation rules, deduplication and a quarantine table with rejection reasons
- Business-ready Gold tables for BI
- Model inference inside a PySpark notebook (DistilBERT SST-2)
- Evaluating a model against a rule-based baseline, with honest limitations
- A Power BI dashboard on the Fabric SQL analytics endpoint

## Architecture

```
Synthetic reviews (20)
        │
        ▼
 BRONZE  bronze_customer_feedback
        │   + 4 injected bad records (duplicate id, rating 6, missing text, invalid date)
        ▼
 SILVER  silver_customer_feedback (20 valid)     quarantine_customer_feedback (4 rejected)
        │
        ├──► GOLD metrics: gold_feedback_overview, gold_category_metrics,
        │                  gold_daily_trends, gold_source_metrics
        ├──► Baseline:     gold_customer_feedback_enriched (v1), ..._v2 (improved)
        ├──► AI:           gold_ai_sentiment (DistilBERT)
        ▼
 GOLD    gold_ai_feedback_enriched (20 rows, 13 columns)  ──►  Power BI (SQL analytics endpoint)
```

## Repository layout

| Path | Contents |
|---|---|
| `notebooks/customer_feedback_pipeline.ipynb` | Full pipeline as one notebook, outputs cleared |
| `src/01_bronze_ingest.py` … `06_comparison_final_gold.py` | The same code split by stage |
| `powerbi/measures.dax` | The five DAX measures used by the dashboard |
| `docs/` | Screenshots and diagrams |

## Results (20 sample reviews)

| Metric | Value |
|---|---|
| Valid records / quarantined | 20 / 4 |
| Average rating | 3.20 / 5 |
| AI positive / negative | 11 (55%) / 9 (45%) |
| Average rating, AI-positive reviews | 4.45 |
| Average rating, AI-negative reviews | 1.67 |
| Average model confidence | 0.9993 (positive), 0.9989 (negative) |
| Baseline v1 vs AI agreement | 80% (16 of 20) |
| Baseline v2 vs AI agreement | 90% (18 of 20) |

## Important limitations

- **Agreement is not accuracy.** The dataset has no independently labelled sentiment, so 90% is agreement between two methods, not model accuracy.
- **The v2 baseline was tuned after seeing the disagreements.** Its keyword patterns were refined on the same 20 reviews (including phrases such as "good quality" and "works as expected"), so the 80% → 90% improvement overstates how well it would generalise.
- **High confidence does not mean correct.** The model is binary (positive/negative) with no Neutral class. "Average product, nothing special" is rated 3 stars, but the model calls it Negative with about 99.95% confidence.
- **Keyword themes are first-match-wins.** For example, "Too expensive for this quality" is labelled Product Quality because that rule fires before Pricing, so no review lands in the Pricing theme.
- **Tiny synthetic dataset.** Inference collects the data to the driver for simplicity. A production version would use distributed batch inference.

## How to run

1. In a Microsoft Fabric workspace, create a Lakehouse (this project used `CustomerFeedbackLH`) and a notebook attached to it.
2. Import `notebooks/customer_feedback_pipeline.ipynb`, or run the `src/` stages in order as notebook cells.
3. In the AI stage, `HF_HUB_DISABLE_XET=1` is set before downloading the model. This fixed a Hugging Face download problem in the Fabric runtime.
4. Connect Power BI Desktop to the Lakehouse **SQL analytics endpoint** and load `gold_ai_feedback_enriched` in Import mode.
5. Create the measures in `powerbi/measures.dax`.

## Tech stack

Microsoft Fabric Lakehouse · PySpark · Delta Lake · Hugging Face Transformers · PyTorch · DistilBERT (`distilbert/distilbert-base-uncased-finetuned-sst-2-english`) · Power BI · DAX

## Next steps

- Replace the synthetic data with a larger public review dataset
- Hand-label a sample to measure real accuracy, precision and recall
- Add a three-class or multilingual model to handle Neutral and mixed sentiment
- Move the notebooks into a scheduled Fabric pipeline

## Author

Zain Qazi — Senior Data Engineer and BI Lead · [LinkedIn](https://www.linkedin.com/in/muhammad-zain-qazi)
