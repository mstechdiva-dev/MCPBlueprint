/**
 * lib/correlation.js
 *
 * Generates and propagates correlation IDs across multi-agent chains.
 * Every log line, guardrail report, and inter-agent call in a single
 * workflow carries the same ID - making multi-hop traces readable.
 *
 * Usage:
 *   import { getCorrelationId, attachCorrelationId, correlationHeaders } from '../lib/correlation.js';
 *
 *   // In a Vercel handler - extract from incoming request or start a new one
 *   const correlationId = getCorrelationId(req);
 *
 *   // When calling another agent, attach it to your outgoing fetch
 *   const response = await fetch(url, {
 *     headers: { ...correlationHeaders(correlationId), 'Authorization': `Bearer ${token}` },
 *     ...
 *   });
 */

import { randomUUID } from 'crypto';

// The header name used to thread correlation IDs between agents.
// Customize: change this if your platform uses a different trace header convention.
export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Extract an existing correlation ID from an incoming request,
 * or generate a new one if this is the start of a chain.
 */
export function getCorrelationId(req) {
  const incoming = req?.headers?.[CORRELATION_HEADER];
  // Sanitize to alphanumeric + safe punctuation to prevent log injection
  if (typeof incoming === 'string' && /^[a-zA-Z0-9_.-]+$/.test(incoming)) {
    return incoming;
  }
  return generateCorrelationId();
}

/**
 * Generate a new correlation ID.
 * Format: <timestamp-ms>-<uuid-short> - human-readable and sortable in logs.
 */
export function generateCorrelationId() {
  return `${Date.now()}-${randomUUID().split('-')[0]}`;
}

/**
 * Returns the headers object to attach to an outgoing inter-agent fetch call.
 * Merge with your other headers.
 *
 * @example
 *   headers: {
 *     ...correlationHeaders(correlationId),
 *     'Authorization': `Bearer ${token}`,
 *     'Content-Type': 'application/json',
 *   }
 */
export function correlationHeaders(correlationId) {
  return { [CORRELATION_HEADER]: correlationId };
}

/**
 * Attach a correlation ID to an existing headers object (mutates in place).
 * Use when you already have a headers object and want to add the correlation header.
 */
export function attachCorrelationId(headers, correlationId) {
  headers[CORRELATION_HEADER] = correlationId;
  return headers;
}

/**
 * Wrap console.log to prefix every line with the correlation ID.
 * Drop this into a handler to get correlated logs without changing every log call.
 *
 * @example
 *   const log = correlatedLogger(correlationId, 'my-agent');
 *   log.log('processing request');   // → [abc123-def456] [my-agent] processing request
 */
export function correlatedLogger(correlationId, agentName) {
  const prefix = `[${correlationId}] [${agentName}]`;
  return {
    log:   (...args) => console.log(prefix, ...args),
    warn:  (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  };
}
