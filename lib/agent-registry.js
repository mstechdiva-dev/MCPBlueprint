/**
 * lib/agent-registry.js
 *
 * Central registry of all agents deployed in your MCPBlueprint setup.
 * Agents look each other up here instead of hardcoding URLs.
 * Actual URLs and tokens live in Vercel environment variables - never in code.
 *
 * Usage:
 *   import { getAgent, listActiveAgents, assertAgentReachable } from '../lib/agent-registry.js';
 *
 *   const agent = getAgent('guardrail');
 *   await fetch(agent.url, { headers: agent.authHeaders() });
 */

// ─── Registry definition ─────────────────────────────────────────────────────
//
// Customize: add an entry for every agent you deploy.
// - id:      must match the folder name under /agents
// - envUrl:  the Vercel environment variable that holds the agent's deployed URL
// - envToken: the env variable for the bearer token used to call this agent
// - active:  set false to exclude from listActiveAgents() without deleting the entry

const REGISTRY = [
  {
    id: 'guardrail',
    label: 'Guardrail Agent',
    envUrl: 'GUARDRAIL_AGENT_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['security', 'monitoring'],
  },
  {
    id: 'direct-api-wrapper',
    label: 'Direct API Wrapper',
    envUrl: 'DIRECT_API_WRAPPER_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['data'],
  },
  {
    id: 'composite-service',
    label: 'Composite Service',
    envUrl: 'COMPOSITE_SERVICE_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['data', 'aggregation'],
  },
  {
    id: 'mcp-to-agent',
    label: 'MCP-to-Agent Router',
    envUrl: 'MCP_TO_AGENT_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['routing'],
  },
  {
    id: 'event-driven',
    label: 'Event-Driven Agent',
    envUrl: 'EVENT_DRIVEN_AGENT_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['events'],
  },
  {
    id: 'configuration-use',
    label: 'Configuration Use Agent',
    envUrl: 'CONFIGURATION_USE_AGENT_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['configuration'],
  },
  {
    id: 'analytics-data-access',
    label: 'Analytics Data Access Agent',
    envUrl: 'ANALYTICS_DATA_ACCESS_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['analytics', 'data'],
  },
  {
    id: 'hierarchical-mcp',
    label: 'Hierarchical MCP Coordinator',
    envUrl: 'HIERARCHICAL_MCP_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['coordination', 'routing'],
  },
  {
    id: 'local-resource-access',
    label: 'Local Resource Access Agent',
    envUrl: 'LOCAL_RESOURCE_ACCESS_URL',
    envToken: 'INTERNAL_AGENT_TOKEN',
    active: true,
    tags: ['storage', 'security'],
  },
];

// ─── Registry helpers ─────────────────────────────────────────────────────────

/**
 * Resolve an agent entry with its live URL and auth headers.
 * Throws if the agent is not in the registry or its URL env var is not set.
 */
export function getAgent(id) {
  const entry = REGISTRY.find((a) => a.id === id);
  if (!entry) throw new Error(`Agent "${id}" not found in registry`);

  const url = process.env[entry.envUrl];
  if (!url) throw new Error(`Agent "${id}" has no URL - set env var ${entry.envUrl}`);
  if (!url.startsWith('https://')) throw new Error(`Agent "${id}" URL must use https://`);

  const token = process.env[entry.envToken];
  if (!token) throw new Error(`Agent "${id}" is missing its auth token`);

  return {
    id: entry.id,
    label: entry.label,
    url,
    active: entry.active,
    tags: entry.tags,
    // Ready-to-use auth headers for fetch calls
    authHeaders: () => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  };
}

/**
 * Returns all active agents with resolved URLs.
 * Skips agents whose URL env var is not set (not deployed yet).
 */
export function listActiveAgents() {
  return REGISTRY
    .filter((a) => a.active)
    .flatMap((a) => {
      const url = process.env[a.envUrl];
      if (!url) return []; // Not yet deployed - skip silently
      return [{ id: a.id, label: a.label, url, tags: a.tags }];
    });
}

/**
 * Returns all agents with a given tag.
 * Customize: use tags to group agents by domain (e.g. 'security', 'data').
 */
export function getAgentsByTag(tag) {
  return listActiveAgents().filter((a) => a.tags.includes(tag));
}

/**
 * Verify an agent is reachable before depending on it in a pipeline.
 * Sends a lightweight GET health check to the agent URL.
 * Customize: replace with your agent's actual health endpoint path.
 */
export async function assertAgentReachable(id) {
  const agent = getAgent(id);
  const healthUrl = `${agent.url}/health`;
  try {
    const res = await fetch(healthUrl, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
    return true;
  } catch {
    throw new Error(`Agent "${id}" is not reachable`);
  }
}

/**
 * Check whether an agent ID is registered and active.
 * Use in routing guards before forwarding.
 */
export function isRegistered(id) {
  return REGISTRY.some((a) => a.id === id && a.active);
}
