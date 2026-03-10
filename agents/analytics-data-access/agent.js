/**
 * Analytics Data Access Agent
 *
 * Queries a metrics store for trend and aggregated data. Results are cached
 * to avoid excessive queries. Only metrics in the authorized list are accessible.
 *
 * Deployed as a Vercel serverless function.
 * Customize: edit DATA_SOURCES, AUTHORIZED_METRICS, and the aggregation logic.
 */

import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { reportToGuardrail } from '../../lib/agent-bus.js';

const AGENT_ID = 'analytics-data-access';

// Customize: register metrics data sources and their endpoint patterns
const DATA_SOURCES = {
  'platform-metrics': {
    url: process.env.METRICS_API_URL,         // e.g. https://metrics.example.com/v1
    key: process.env.METRICS_API_KEY,
    queryPath: (metric, range) => `/query?metric=${metric}&range=${range}`,
  },
  'error-rates': {
    url: process.env.ERROR_TRACKING_API_URL,  // e.g. https://errors.example.com/v1
    key: process.env.ERROR_TRACKING_API_KEY,
    queryPath: (metric, range) => `/rates?name=${metric}&window=${range}`,
  },
};

// Customize: which metrics agents are authorized to access
const AUTHORIZED_METRICS = [
  'error_rate',
  'request_latency_p50',
  'request_latency_p99',
  'active_users',
  'agent_invocations',
  'guardrail_alerts',
];

const CONFIG = {
  default_time_range: '24h',          // Default lookback when none specified
  cache_ttl_seconds: 120,             // How long to cache results
  aggregations: ['average', 'sum', 'percentile', 'max', 'min'],
};

// In-memory cache (use Vercel KV for persistence across invocations)
const cache = new Map();

function getCacheKey(source, metric, range, aggregation) {
  return `${source}:${metric}:${range}:${aggregation}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CONFIG.cache_ttl_seconds * 1000) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, cachedAt: Date.now() });
}

async function queryMetric(sourceName, metric, range) {
  const source = DATA_SOURCES[sourceName];
  if (!source) throw new Error(`Unknown data source: ${sourceName}`);
  if (!source.url || !source.key) throw new Error(`Data source "${sourceName}" is not configured`);

  const url = `${source.url}${source.queryPath(metric, range)}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${source.key}` },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`${sourceName} responded with ${response.status}`);
  return response.json();
}

// Customize: adapt this to the shape your metrics API returns
function aggregate(data, aggregation) {
  const values = Array.isArray(data.values) ? data.values.map((v) => v.value || v) : [];
  if (values.length === 0) return null;

  switch (aggregation) {
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'percentile':
      // Customize: specify which percentile in config if needed
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)]; // p95 default
    default:
      return values;
  }
}

// Vercel serverless handler
export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.method === 'GET' ? req.query : req.body;
  const {
    metric,
    source = 'platform-metrics',
    range = CONFIG.default_time_range,
    aggregation = 'average',
  } = params || {};

  // Guard: validate range format to prevent URL injection (e.g. 30m, 24h, 7d)
  if (!/^\d+[mhd]$/.test(range)) {
    return res.status(400).json({ error: 'Invalid range. Use format: 30m, 24h, 7d' });
  }

  // Guard: only allow defined sources
  if (!DATA_SOURCES[source]) {
    return res.status(400).json({ error: 'Unknown data source' });
  }

  // Guard: only allow authorized metrics
  if (!metric || !AUTHORIZED_METRICS.includes(metric)) {
    log.warn('unauthorized metric requested:', metric);
    return res.status(403).json({ error: 'Metric not authorized' });
  }

  // Guard: only allow defined aggregations
  if (!CONFIG.aggregations.includes(aggregation)) {
    return res.status(400).json({ error: `Unsupported aggregation: ${aggregation}` });
  }

  const cacheKey = getCacheKey(source, metric, range, aggregation);
  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, cached: true, ...cached });
  }

  try {
    const raw = await queryMetric(source, metric, range);
    const aggregated = aggregate(raw, aggregation);

    const result = {
      metric,
      source,
      range,
      aggregation,
      value: aggregated,
      data_points: (raw.values || []).length,
      queried_at: new Date().toISOString(),
    };

    setCache(cacheKey, result);

    await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'metrics.query', accessed_resource: metric, allowed_resources: AUTHORIZED_METRICS }, correlationId);
    log.log(`queried ${metric} from ${source} (${aggregation} over ${range})`);

    return res.status(200).json({ success: true, cached: false, correlation_id: correlationId, ...result });
  } catch (err) {
    log.error('query error:', err.message);
    return res.status(502).json({ error: 'Metrics query failed' });
  }
}
