
import type { ConnectorConfig } from '@microsoft/rayfin-connectors';

import { GoldAiFeedbackEnriched } from './GoldAiFeedbackEnriched.js';
import { GoldWeeklySentimentMetrics } from './GoldWeeklySentimentMetrics.js';
import { GoldSentimentForecast } from './GoldSentimentForecast.js';

export {
  GoldAiFeedbackEnriched,
  GoldWeeklySentimentMetrics,
  GoldSentimentForecast,
};

export type CustomerAnalyticsSchema = {
  GoldAiFeedbackEnriched: typeof GoldAiFeedbackEnriched;
  GoldWeeklySentimentMetrics: typeof GoldWeeklySentimentMetrics;
  GoldSentimentForecast: typeof GoldSentimentForecast;
};

export const connectorConfig = {
  connector: 'fabric-sqlanalytics',
  operations: ['read'],
  entities: {
    GoldAiFeedbackEnriched,
    GoldWeeklySentimentMetrics,
    GoldSentimentForecast,
  },
} as const satisfies ConnectorConfig;
