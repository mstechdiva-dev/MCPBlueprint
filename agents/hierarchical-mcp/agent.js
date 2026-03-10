/**
 * Hierarchical MCP Coordinator Agent
 *
 * Receives work, routes it to the appropriate domain-specific agents,
 * collects their results, and returns a unified response.
 * Does not execute domain logic itself - it coordinates.
 *
 * Deployed as a Vercel serverless function.
 * Customize: edit PIPELINES and domain agent IDs for your agent topology.
 * Domain agents are resolved through lib/agent-registry.js.
 */

import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { send, reportToGuardrail } from '../../lib/agent-bus.js';
import { isRegistered } from '../../lib/agent-registry.js';

const AGENT_ID = 'hierarchical-mcp';

// Customize: define how work is distributed across domain agents.
// Each pipeline is a named list of steps. Steps can run in sequence or parallel.
//
// IMPORTANT: Pipeline agent IDs must be registered and active in lib/agent-registry.js.
// This object is intentionally empty so the coordinator works out of the box without
// referencing agents that don't exist in your registry. Add your own pipelines here.
//
// Example pipeline entry:
//   'my-pipeline': {
//     description: 'What this pipeline does',
//     steps: [
//       { agent: 'registered-agent-id', parallel: false },
//       { agent: 'another-agent-id',    parallel: false },
//     ],
//   },
const PIPELINES = {};

async function callDomainAgent(agentName, payload, correlationId) {
  if (!isRegistered(agentName)) {
    throw new Error(`Domain agent "${agentName}" is not in the registry or not active`);
  }
  return send(agentName, payload, { senderId: AGENT_ID, correlationId });
}

async function runPipeline(pipeline, inputPayload, correlationId) {
  const results = {};
  let lastResult = null;

  for (const step of pipeline.steps) {
    // Skip conditional steps when their condition is not met
    if (step.condition && !step.condition(lastResult)) {
      results[step.agent] = { skipped: true, reason: 'condition not met' };
      continue;
    }

    if (step.parallel && step.agents) {
      // Run multiple agents at once and collect all results
      const parallelResults = await Promise.allSettled(
        step.agents.map((agentName) => callDomainAgent(agentName, { ...inputPayload, previous: lastResult }, correlationId))
      );
      for (let i = 0; i < step.agents.length; i++) {
        const r = parallelResults[i];
        results[step.agents[i]] = r.status === 'fulfilled' ? r.value : { error: r.reason.message };
      }
      lastResult = Object.fromEntries(step.agents.map((n, i) => [n, results[n]]));
    } else {
      try {
        lastResult = await callDomainAgent(step.agent, { ...inputPayload, previous: lastResult }, correlationId);
        results[step.agent] = lastResult;
      } catch (err) {
        results[step.agent] = { error: err.message };
        lastResult = null;
      }
    }
  }

  return results;
}

// Vercel serverless handler
export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pipeline: pipelineName, payload } = req.body || {};

  if (!pipelineName || typeof pipelineName !== 'string') {
    return res.status(400).json({ error: 'pipeline is required', available: Object.keys(PIPELINES) });
  }

  const pipeline = PIPELINES[pipelineName];
  if (!pipeline) {
    return res.status(404).json({ error: `Pipeline "${pipelineName}" not found`, available: Object.keys(PIPELINES) });
  }

  // Guard: ensure pipeline only routes to registered agents (via registry)
  const allAgentNames = pipeline.steps.flatMap((s) => s.agents || (s.agent ? [s.agent] : []));
  const unauthorized = allAgentNames.filter((name) => !isRegistered(name));
  if (unauthorized.length > 0) {
    return res.status(400).json({ error: `Unregistered agents in pipeline: ${unauthorized.join(', ')}` });
  }

  try {
    const results = await runPipeline(pipeline, payload || {}, correlationId);

    await reportToGuardrail({
      agent_id: AGENT_ID,
      event_type: 'pipeline.complete',
      output: { pipeline: pipelineName, steps: allAgentNames.length },
    }, correlationId);

    log.log(`pipeline "${pipelineName}" complete`);
    return res.status(200).json({ success: true, pipeline: pipelineName, description: pipeline.description, results, correlation_id: correlationId });
  } catch (err) {
    log.error('pipeline error:', err.message);
    return res.status(500).json({ error: 'Pipeline execution failed' });
  }
}
