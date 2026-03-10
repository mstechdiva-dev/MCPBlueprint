/**
 * MCP-to-Agent Pattern
 *
 * Receives tool output from the MCP server, classifies it, then routes
 * to the appropriate specialized sub-agent based on routing rules.
 *
 * Deployed as a Vercel serverless function.
 * Customize: edit ROUTING_RULES. Sub-agent lookup is via agent-registry.
 */

import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { send, reportToGuardrail } from '../../lib/agent-bus.js';
import { isRegistered } from '../../lib/agent-registry.js';

const AGENT_ID = 'mcp-to-agent';

// Customize: define how output is classified and where it goes.
// Target values must match IDs in lib/agent-registry.js.
const ROUTING_RULES = [
  {
    name: 'critical-severity',
    match: (payload) => payload.severity === 'critical',
    target: 'guardrail',
  },
  {
    name: 'high-severity-alert',
    match: (payload) => payload.severity === 'high' && payload.type === 'security',
    target: 'event-driven',
  },
  {
    name: 'standard-report',
    match: (payload) => ['low', 'medium'].includes(payload.severity),
    target: 'analytics-data-access',
  },
];

const FALLBACK_TARGET = 'analytics-data-access';

function classifyPayload(payload) {
  for (const rule of ROUTING_RULES) {
    if (rule.match(payload)) return rule.target;
  }
  return FALLBACK_TARGET;
}

// Vercel serverless handler
export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Customize: validate the incoming payload shape matches your MCP tool output
  const payload = req.body?.payload || req.body;
  if (!payload || typeof payload.severity !== 'string') {
    return res.status(400).json({ error: 'Payload missing required field: severity' });
  }

  const targetAgent = classifyPayload(payload);

  // Guard: never route to an unregistered agent
  if (!isRegistered(targetAgent)) {
    log.error(`routing target "${targetAgent}" is not registered`);
    return res.status(500).json({ error: `Target agent "${targetAgent}" is not registered` });
  }

  try {
    const result = await send(targetAgent, payload, {
      senderId: AGENT_ID,
      correlationId,
    });

    await reportToGuardrail({
      agent_id: AGENT_ID,
      event_type: 'route.decision',
      accessed_resource: targetAgent,
      allowed_resources: ROUTING_RULES.map((r) => r.target).concat(FALLBACK_TARGET),
    }, correlationId);

    log.log(`routed to ${targetAgent}`);
    return res.status(200).json({ success: true, routed_to: targetAgent, agent_response: result, correlation_id: correlationId });
  } catch (err) {
    log.error('routing error:', err.message);
    return res.status(502).json({ error: 'Failed to forward to sub-agent' });
  }
}
