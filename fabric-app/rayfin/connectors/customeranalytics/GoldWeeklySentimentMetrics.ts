
import { entity, date, decimal, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class GoldWeeklySentimentMetrics extends Source({
  schema: 'dbo',
  table: 'gold_weekly_sentiment_metrics',
  primaryKey: [],
}) {
  @date({ optional: true, column: 'week_start' }) weekStart?: Date;
  @text({ optional: true, column: 'product_category', max: 8000 }) productCategory?: string;
  @int({ optional: true, column: 'total_reviews' }) totalReviews?: number;
  @int({ optional: true, column: 'negative_reviews' }) negativeReviews?: number;
  @int({ optional: true, column: 'positive_reviews' }) positiveReviews?: number;
  @decimal({ optional: true, column: 'negative_review_rate' }) negativeReviewRate?: number;
  @decimal({ optional: true, column: 'negative_review_rate_pct' }) negativeReviewRatePct?: number;
  @date({ optional: true, column: 'generated_at' }) generatedAt?: Date;
}
