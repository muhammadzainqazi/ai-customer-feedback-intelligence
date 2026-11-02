
import { entity, date, decimal, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class GoldSentimentForecast extends Source({
  schema: 'dbo',
  table: 'gold_sentiment_forecast',
  primaryKey: [],
}) {
  @date({ optional: true, column: 'week_start' }) weekStart?: Date;
  @int({ optional: true, column: 'forecast_horizon' }) forecastHorizon?: number;
  @decimal({ optional: true, column: 'forecast_negative_review_rate_pct' }) forecastNegativeReviewRatePct?: number;
  @text({ optional: true, column: 'model_name', max: 8000 }) modelName?: string;
  @date({ optional: true, column: 'training_start_week' }) trainingStartWeek?: Date;
  @date({ optional: true, column: 'training_end_week' }) trainingEndWeek?: Date;
  @decimal({ optional: true, column: 'holdout_mae_pct_points' }) holdoutMaePctPoints?: number;
  @decimal({ optional: true, column: 'baseline_mae_pct_points' }) baselineMaePctPoints?: number;
  @date({ optional: true, column: 'generated_at' }) generatedAt?: Date;
}
