import {
  ConnectorsRayfinClient,
  resolveRayfinConfig,
} from '@microsoft/rayfin-client';

import type { UniversalAppSchema } from '@rayfin-app/shared';
import type { GraphQLBackedConnector } from '@microsoft/rayfin-connector-fabric-graphql';

// Browser-safe connector configuration.
// Do not import the decorated backend schema into the frontend.
const connectorConfig = {
  connector: 'fabric-sqlanalytics',
  operations: ['read'],
} as const;

// Lightweight frontend entity definitions.
// These field names match the registered Rayfin GraphQL entity properties.
class GoldAiFeedbackEnriched {
  record_id!: string;
  rating!: number;
  aiSentiment!: string;
  product_category!: string;
  review_date!: string;
}

class GoldWeeklySentimentMetrics {
  week_start!: string;
  product_category!: string;
  total_reviews!: number;
  negative_reviews!: number;
  positive_reviews!: number;
  negative_review_rate_pct!: number;
}

class GoldSentimentForecast {
  week_start!: string;
  forecast_horizon!: number;
  forecast_negative_review_rate_pct!: number;
  model_name!: string;
}

type CustomerAnalyticsSchema = {
  GoldAiFeedbackEnriched: typeof GoldAiFeedbackEnriched;
  GoldWeeklySentimentMetrics: typeof GoldWeeklySentimentMetrics;
  GoldSentimentForecast: typeof GoldSentimentForecast;
};

type AppConnectorsSchema = {
  customeranalytics: GraphQLBackedConnector<
    CustomerAnalyticsSchema,
    typeof connectorConfig
  >;
};

type AppClient = ConnectorsRayfinClient<
  UniversalAppSchema,
  Record<string, never>,
  AppConnectorsSchema
>;

let _client: Promise<AppClient> | undefined;

export class MissingRayfinConfigError extends Error {
  constructor(readonly missing: readonly string[]) {
    super(`Missing required Rayfin configuration: ${missing.join(', ')}`);
    this.name = 'MissingRayfinConfigError';
  }
}

export async function getRayfinClient(): Promise<AppClient> {
  if (!_client) {
    _client = createClient().catch((error) => {
      _client = undefined;
      throw error;
    });
  }
  return _client;
}

async function createClient(): Promise<AppClient> {
  const resolved = await resolveRayfinConfig({
    apiUrl: import.meta.env.VITE_RAYFIN_API_URL,
    publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY,
    workspaceId: import.meta.env.VITE_FABRIC_WORKSPACE_ID,
    itemId: import.meta.env.VITE_FABRIC_ITEM_ID,
    portalUrl: import.meta.env.VITE_FABRIC_PORTAL_URL,
  });

  if (!resolved.baseUrl || !resolved.publishableKey) {
    throw new MissingRayfinConfigError([
      ...(!resolved.baseUrl ? ['apiUrl'] : []),
      ...(!resolved.publishableKey ? ['publishableKey'] : []),
    ]);
  }

  return new ConnectorsRayfinClient<
    UniversalAppSchema,
    Record<string, never>,
    AppConnectorsSchema
  >({
    baseUrl: resolved.baseUrl,
    publishableKey: resolved.publishableKey,
    authStorage: true,
    runtimeConfig: resolved.runtimeConfig,
    connectors: { customeranalytics: connectorConfig },
  });
}

export async function getTotalReviews(): Promise<number> {
  const client = await getRayfinClient();
  const result = await client.connectors.customeranalytics
    .GoldAiFeedbackEnriched
    .aggregate({ total_reviews: { count: 'rating' } })
    .execute();

  console.log('Fabric total reviews response:', result);

  const rows = result as unknown;
  if (Array.isArray(rows) && rows.length > 0) {
    const aggregations = rows[0]?.aggregations;
    if (aggregations && typeof aggregations.total_reviews === 'number') {
      return aggregations.total_reviews;
    }
  }

  throw new Error('Fabric returned an unexpected aggregation response shape.');
}

export async function getSentimentCounts(): Promise<{
  positive: number;
  negative: number;
}> {
  const client = await getRayfinClient();

  const [positiveResult, negativeResult] = await Promise.all([
    client.connectors.customeranalytics.GoldAiFeedbackEnriched
      .where({ aiSentiment: { eq: 'Positive' } })
      .aggregate({ review_count: { count: 'rating' } })
      .execute(),

    client.connectors.customeranalytics.GoldAiFeedbackEnriched
      .where({ aiSentiment: { eq: 'Negative' } })
      .aggregate({ review_count: { count: 'rating' } })
      .execute(),
  ]);

  const extractCount = (result: unknown): number => {
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Fabric returned an empty sentiment aggregation.');
    }

    const count = result[0]?.aggregations?.review_count;
    if (typeof count !== 'number') {
      throw new Error('Fabric returned an invalid sentiment count.');
    }

    return count;
  };

  return {
    positive: extractCount(positiveResult),
    negative: extractCount(negativeResult),
  };
}
