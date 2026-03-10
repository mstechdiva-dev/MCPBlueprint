/**
 * Event-Driven Integration Agent
 *
 * Receives events via webhook, filters them against defined criteria,
 * and fires configured actions when trigger conditions are met.
 *
 * Deployed as a Vercel serverless function (webhook receiver).
 * Customize: edit EVENT_FILTERS, TRIGGER_CONDITIONS, and ACTIONS for your event shape.
 */

import crypto from 'crypto';
import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { send, reportToGuardrail } from '../../lib/agent-bus.js';

const AGENT_ID = 'event-driven';

const CONFIG = {
  max_events_per_minute: 60, // Guardrail rate ceiling - adjust for your volume
  secret: process.env.WEBHOOK_SECRET, // Used to verify incoming webhook signatures
};

// Customize: drop events that don't match these criteria before condition checks
const EVENT_FILTERS = [
  (event) => event.source === 'platform',       // Only process events from your platform
  (event) => typeof event.type === 'string',    // Must have a string type field
  (event) => event.timestamp > Date.now() - 30_000, // Ignore events older than 30s
];

// Customize: define what conditions trigger an action and what action to run
const TRIGGER_CONDITIONS = [
  {
    name: 'user-threshold-breach',
    test: (event) => event.type === 'metric.threshold' && event.data?.value > event.data?.limit,
    action: 'send-alert',
  },
  {
    name: 'error-burst',
    test: (event) => event.type === 'error.burst' && event.data?.count >= 10,
    action: 'trigger-escalation',
  },
  {
    name: 'new-user-signup',
    test: (event) => event.type === 'user.created',
    action: 'trigger-onboarding-flow',
  },
];

// Customize: implement each action - what should happen when a condition fires.
// Agent-to-agent actions use send() from agent-bus for standard enveloping.
// External webhook calls (non-agent destinations) use fetch directly.
const ACTIONS = {
  'send-alert': async (event, correlationId) => {
    // Customize: replace with your alert destination (Slack, PagerDuty, etc.)
    const alertUrl = process.env.ALERT_WEBHOOK_URL;
    if (!alertUrl) throw new Error('ALERT_WEBHOOK_URL is not configured');
    await fetch(alertUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert: true, event, correlation_id: correlationId }),
    });
  },
  'trigger-escalation': async (event, correlationId) => {
    await reportToGuardrail({
      agent_id: AGENT_ID,
      event_type: 'event.escalation',
      output: { source: AGENT_ID, event },
    }, correlationId);
  },
  'trigger-onboarding-flow': async (event, correlationId) => {
    await send('configuration-use', { userId: event.data?.userId }, { senderId: AGENT_ID, correlationId });
  },
};

// Simple in-memory rate tracker (resets per cold start - use KV store for persistence)
const rateBuckets = new Map();
function isRateLimited(source) {
  const now = Math.floor(Date.now() / 60_000); // 1-minute bucket key
  const key = `${source}:${now}`;
  const count = (rateBuckets.get(key) || 0) + 1;
  rateBuckets.set(key, count);
  return count > CONFIG.max_events_per_minute;
}

// HMAC-SHA256 signature verification against the raw request body.
// Customize: adjust the header name and prefix format for your webhook provider
// (e.g. GitHub uses 'x-hub-signature-256' with 'sha256=' prefix).
function verifySignature(rawBody, signature) {
  if (!CONFIG.secret) return false;
  try {
    const sig = crypto.createHmac('sha256', CONFIG.secret).update(rawBody).digest('hex');
    const expected = Buffer.from(`sha256=${sig}`);
    const received = Buffer.from(signature);
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

// Disable Vercel's automatic body parsing so we can read the raw body for HMAC.
export const config = { api: { bodyParser: false } };

// Vercel serverless handler
export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read raw body for HMAC verification (bodyParser is disabled above)
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  const signature = req.headers['x-webhook-signature'] || '';
  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  const eventSource = event?.source || 'unknown';

  if (isRateLimited(eventSource)) {
    log.warn('rate limit exceeded for source:', eventSource);
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // Run all filters - drop the event if any filter fails
  const passesFilters = EVENT_FILTERS.every((f) => {
    try { return f(event); } catch { return false; }
  });

  if (!passesFilters) {
    return res.status(200).json({ received: true, processed: false, reason: 'filtered' });
  }

  // Find matching trigger conditions and fire their actions
  const triggered = [];
  for (const condition of TRIGGER_CONDITIONS) {
    if (condition.test(event)) {
      const actionFn = ACTIONS[condition.action];
      if (actionFn) {
        try {
          await actionFn(event, correlationId);
          triggered.push({ condition: condition.name, action: condition.action, status: 'fired' });
        } catch (err) {
          log.error(`action "${condition.action}" failed:`, err.message);
          triggered.push({ condition: condition.name, action: condition.action, status: 'failed' });
        }
      }
    }
  }

  await reportToGuardrail({
    agent_id: AGENT_ID,
    event_type: 'event.processed',
    output: { source: eventSource, triggered_count: triggered.length },
  }, correlationId);

  log.log(`processed event from ${eventSource}, triggered ${triggered.length} action(s)`);
  return res.status(200).json({ received: true, processed: true, triggered, correlation_id: correlationId });
}
