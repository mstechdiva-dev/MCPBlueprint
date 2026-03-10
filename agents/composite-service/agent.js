/**
 * Composite Service Agent
 *
 * Calls multiple external APIs in parallel (or sequentially) and merges
 * the results into a single unified response.
 *
 * Deployed as a Vercel serverless function.
 * Customize: edit SERVICES to point at your APIs, adjust mergeResults() for your shape.
 */

import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { reportToGuardrail } from '../../lib/agent-bus.js';

const AGENT_ID = 'composite-service';

// Customize: define each service the agent is allowed to call
const SERVICES = [
  {
    name: 'user-profile',
    url: process.env.USER_PROFILE_API,     // e.g. https://users.example.com/v1
    key: process.env.USER_PROFILE_API_KEY,
    path: (ctx) => `/users/${ctx.userId}`,
  },
  {
    name: 'billing-status',
    url: process.env.BILLING_API,           // e.g. https://billing.example.com/v1
    key: process.env.BILLING_API_KEY,
    path: (ctx) => `/accounts/${ctx.userId}/status`,
  },
  {
    name: 'activity-log',
    url: process.env.ACTIVITY_API,          // e.g. https://activity.example.com/v1
    key: process.env.ACTIVITY_API_KEY,
    path: (ctx) => `/users/${ctx.userId}/recent`,
  },
];

const CONFIG = {
  parallel: true,          // false = call services sequentially
  partial_success: true,   // true = return partial data if one service fails
  timeout_ms: 6000,
};

async function fetchService(service, ctx) {
  if (!service.url || !service.key) {
    return { name: service.name, data: null, error: 'Service not configured' };
  }
  const url = `${service.url}${service.path(ctx)}`;
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${service.key}` },
      signal: AbortSignal.timeout(CONFIG.timeout_ms),
    });
    if (!response.ok) throw new Error(`${service.name} responded with ${response.status}`);
    return { name: service.name, data: await response.json(), error: null };
  } catch (err) {
    return { name: service.name, data: null, error: err.message };
  }
}

// Customize: change how results from each service are combined
function mergeResults(results) {
  const merged = {};
  for (const result of results) {
    if (result.data) {
      merged[result.name] = result.data;
    } else {
      merged[result.name] = { error: 'Service unavailable' };
    }
  }
  return merged;
}

// Vercel serverless handler
export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Customize: extract context from your request (userId, sessionId, etc.)
  const ctx = {
    userId: req.query.userId || req.body?.userId,
  };

  if (!ctx.userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (typeof ctx.userId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(ctx.userId)) {
    return res.status(400).json({ error: 'Invalid userId format' });
  }

  let results;
  if (CONFIG.parallel) {
    results = await Promise.all(SERVICES.map((s) => fetchService(s, ctx)));
  } else {
    results = [];
    for (const s of SERVICES) {
      results.push(await fetchService(s, ctx));
    }
  }

  const failures = results.filter((r) => r.error);
  if (!CONFIG.partial_success && failures.length > 0) {
    await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'composite.partial-failure', consecutive_failures: failures.length }, correlationId);
    return res.status(502).json({
      error: 'One or more services failed',
      failures: failures.map((f) => ({ service: f.name })),
    });
  }

  const merged = mergeResults(results);
  await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'composite.complete', output: merged }, correlationId);
  log.log(`fetched ${SERVICES.length} services, ${failures.length} failures`);

  return res.status(200).json({
    success: true,
    partial: failures.length > 0,
    data: merged,
    correlation_id: correlationId,
  });
}
