/**
 * Direct API Wrapper Agent
 *
 * Connects to a single external API and returns the result.
 * No intermediary logic, no aggregation - one agent, one API.
 *
 * Deployed as a Vercel serverless function.
 * Customize: swap API_ENDPOINT, auth header, and response mapping for your API.
 */

import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { reportToGuardrail } from '../../lib/agent-bus.js';

const AGENT_ID     = 'direct-api-wrapper';
const API_ENDPOINT = process.env.TARGET_API_ENDPOINT; // e.g. https://api.example.com/v1
const API_KEY      = process.env.TARGET_API_KEY;

if (!API_ENDPOINT || !API_KEY) {
  throw new Error('[direct-api-wrapper] TARGET_API_ENDPOINT and TARGET_API_KEY env vars are required');
}

const CONFIG = {
  allowed_methods: ['GET', 'POST'],
  timeout_ms: 5000,
  retry_limit: 2,
};

async function callExternalApi(path, method = 'GET', body = null) {
  const url = `${API_ENDPOINT}${path}`;

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(CONFIG.timeout_ms),
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  let attempts = 0;
  while (attempts <= CONFIG.retry_limit) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      attempts++;
      if (attempts > CONFIG.retry_limit) throw err;
    }
  }
}

// Vercel serverless handler
export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);
  const { method } = req;

  if (!CONFIG.allowed_methods.includes(method)) {
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  // Customize: map incoming request fields to your API's expected path/body
  const rawPath = typeof req.query.path === 'string' ? req.query.path : '/data';
  if (rawPath.includes('..') || !rawPath.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid path parameter' });
  }
  const apiPath = rawPath;
  const requestBody = method === 'POST' ? req.body : null;

  try {
    const result = await callExternalApi(apiPath, method, requestBody);

    await reportToGuardrail({
      agent_id: AGENT_ID,
      event_type: 'api.call',
      output: result,
      accessed_resource: `${API_ENDPOINT}${apiPath}`,
      allowed_resources: [`${API_ENDPOINT}${apiPath}`],
    }, correlationId);

    log.log('api call complete:', apiPath);
    // Customize: transform result fields before returning if needed
    return res.status(200).json({ success: true, data: result, correlation_id: correlationId });
  } catch (err) {
    log.error('api call failed:', err.message);
    await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'api.call', silent_failure: false, consecutive_failures: 1 }, correlationId);
    return res.status(502).json({ error: 'Upstream API call failed' });
  }
}
