
import {
  entity, boolean, date, decimal, int, text, role,
} from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

@role('authenticated', ['read'])
@entity()
export class GoldAiFeedbackEnriched extends Source({
  schema: 'dbo',
  table: 'gold_ai_feedback_enriched',
  primaryKey: [],
}) {
  @text({ optional: true, column: 'record_id', max: 8000 }) recordId?: string;
  @text({ optional: true, column: 'review_text', max: 8000 }) reviewText?: string;
  @text({ optional: true, column: 'product_category', max: 8000 }) productCategory?: string;
  @int({ optional: true }) rating?: number;
  @date({ optional: true, column: 'review_date' }) reviewDate?: Date;
  @text({ optional: true, column: 'source_system', max: 8000 }) sourceSystem?: string;
  @text({ optional: true, column: 'baseline_sentiment', max: 8000 }) baselineSentiment?: string;
  @text({ optional: true, column: 'feedback_theme', max: 8000 }) feedbackTheme?: string;
  @text({ optional: true, column: 'ai_sentiment', max: 8000 }) aiSentiment?: string;
  @decimal({ optional: true, column: 'sentiment_confidence' }) sentimentConfidence?: number;
  @text({ optional: true, column: 'model_name', max: 8000 }) modelName?: string;
  @date({ optional: true, column: 'processed_at' }) processedAt?: Date;
  @boolean({ optional: true, column: 'prediction_match' }) predictionMatch?: boolean;
}
