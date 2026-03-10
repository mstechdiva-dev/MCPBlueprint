/**
 * lib/agent-bus.js
 *
 * The inter-agent communication layer for MCPBlueprint.
 * All agents use this module to send messages to each other and report
 * activity to the guardrail. Provides a standard message envelope so
 * every inter-agent call has a consistent, traceable shape.
 *
 * Usage:
 *   import { send, broadcast, reportToGuardrail, createEnvelope } from '../lib/agent-bus.js';
 *
 *   // Send a message to one agent
 *   const result = await send('analytics-data-access', { metric: 'error_rate' }, { correlationId });
 *
 *   // Broadcast to all agents with a given tag
 *   await broadcast('security', { event: 'config.changed' }, { correlationId });
 *
 *   // Report this agent's own activity to the guardrail
 *   await reportToGuardrail({ agent_id: 'my-agent', event_type: 'api.call', ... }, correlationId);
 */

import { getAgent, getAgentsByTag, isRegistered } from './agent-registry.js';
import { generateCorrelationId, correlationHeaders } from './correlation.js';

const DEFAULT_TIMEOUT_MS = 8000;

// ─── Message envelope ─────────────────────────────────────────────────────────
//
// Every inter-agent message is wrapped in this standard shape.
// Customize: add fields your platform needs (e.g. tenant_id, environment, version).

/**
 * Build a standard inter-agent message envelope.
 *
 * @param {string} senderId     - The agent sending the message (your agent's id)
 * @param {string} targetId     - The intended recipient agent id
 * @param {object} payload      - The message body
 * @param {string} correlationId - The correlation ID threading this chain
 * @param {object} [meta]       - Optional extra metadata
 */
export function createEnvelope(senderId, targetId, payload, correlationId, meta = {}) {
  return {
    envelope: {
      sender:         senderId,
      target:         targetId,
      correlation_id: correlationId,
      sent_at:        new Date().toISOString(),
      schema_version: '1.0',  // Increment when envelope shape changes
      ...meta,
    },
    payload,
  };
}

// ─── Core send ────────────────────────────────────────────────────────────────

/**
 * Send a message to a single registered agent.
 * Wraps the payload in the standard envelope before sending.
 *
 * @param {string} targetAgentId   - ID from the agent registry
 * @param {object} payload         - Message body
 * @param {object} options
 * @param {string} options.senderId        - Sending agent's ID (for envelope)
 * @param {string} options.correlationId   - Correlation ID from this chain
 * @param {number} [options.timeoutMs]     - Override default timeout
 * @param {boolean} [options.fireAndForget] - Don't wait for response
 */
export async function send(targetAgentId, payload, options = {}) {
  const {
    senderId = 'unknown',
    correlationId = generateCorrelationId(),
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fireAndForget = false,
  } = options;

  if (!isRegistered(targetAgentId)) {
    throw new Error(`Cannot send to "${targetAgentId}" - not in registry or not active`);
  }

  const agent = getAgent(targetAgentId);
  const envelope = createEnvelope(senderId, targetAgentId, payload, correlationId);

  const fetchOptions = {
    method: 'POST',
    headers: {
      ...agent.authHeaders(),
      ...correlationHeaders(correlationId),
    },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(timeoutMs),
  };

  if (fireAndForget) {
    // Send without awaiting - errors are logged but not thrown
    fetch(agent.url, fetchOptions).catch((err) =>
      console.warn(`[agent-bus] fire-and-forget to "${targetAgentId}" failed:`, err.message)
    );
    return null;
  }

  const response = await fetch(agent.url, fetchOptions);
  if (!response.ok) {
    throw new Error(`Agent "${targetAgentId}" responded with ${response.status}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`Agent "${targetAgentId}" returned invalid JSON`);
  }
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

/**
 * Send the same message to all active agents with a given tag.
 * Results are collected and returned - failed sends are included with their error.
 *
 * @param {string} tag       - Agent tag to target (e.g. 'security', 'monitoring')
 * @param {object} payload   - Message body (same for all recipients)
 * @param {object} options   - Same as send() options
 */
export async function broadcast(tag, payload, options = {}) {
  const agents = getAgentsByTag(tag);
  if (agents.length === 0) {
    console.warn(`[agent-bus] broadcast to tag "${tag}" - no active agents found`);
    return [];
  }

  const results = await Promise.allSettled(
    agents.map((agent) => send(agent.id, payload, options))
  );

  return agents.map((agent, i) => ({
    agent_id: agent.id,
    status: results[i].status,
    result: results[i].status === 'fulfilled' ? results[i].value : null,
    error:  results[i].status === 'rejected'  ? results[i].reason?.message : null,
  }));
}

// ─── Guardrail reporting ──────────────────────────────────────────────────────

/**
 * Report this agent's activity to the guardrail.
 * Call this after every significant action so the guardrail has full visibility.
 * Failures are logged but never thrown - guardrail reporting should never break
 * the agent doing the actual work.
 *
 * Customize: extend the activity shape with fields your risk profile rules check for.
 *
 * @param {object} activity - What the agent did
 * @param {string} activity.agent_id              - The reporting agent's ID
 * @param {string} activity.event_type            - e.g. 'api.call', 'file.read', 'route.decision'
 * @param {object} [activity.output]              - What the agent returned (guardrail checks for credential exposure)
 * @param {string} [activity.accessed_resource]   - Resource touched (for scope checks)
 * @param {string[]} [activity.allowed_resources] - Agent's declared scope (for scope checks)
 * @param {number} [activity.consecutive_failures] - For loop detection
 * @param {boolean} [activity.silent_failure]     - True if an error was swallowed
 * @param {boolean} [activity.activation_recorded] - False if unexpected activation
 * @param {string} correlationId
 */
export async function reportToGuardrail(activity, correlationId = generateCorrelationId()) {
  try {
    await send('guardrail', activity, {
      senderId: activity.agent_id,
      correlationId,
      fireAndForget: true, // Never block on guardrail response
    });
  } catch (err) {
    // Log but never surface - guardrail reporting must not break normal flow
    console.warn('[agent-bus] guardrail report failed:', err.message);
  }
}

// ─── Request/reply ────────────────────────────────────────────────────────────

/**
 * Send to one agent and wait for its response, with a clear timeout.
 * Alias of send() with explicit timeout - kept separate for readability at call sites.
 *
 * @param {string} targetAgentId
 * @param {object} payload
 * @param {object} options
 * @param {number} options.timeoutMs  - How long to wait before giving up
 */
export async function request(targetAgentId, payload, options = {}) {
  return send(targetAgentId, payload, { ...options, fireAndForget: false });
}
