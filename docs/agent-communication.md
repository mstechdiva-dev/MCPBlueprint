# Agent Communication

MCPBlueprint agents communicate through a shared library layer (`lib/`) rather than making raw HTTP calls to each other. This gives every inter-agent exchange a consistent shape, a traceable ID, and automatic guardrail reporting.

---

## The Three Modules

### `lib/correlation.js` - Request ID Threading

Every chain of agent calls shares a single correlation ID from start to finish. Whether a workflow touches two agents or six, every log line, guardrail report, and API response carries the same ID.

```
Incoming request → correlation ID extracted (or generated)
     ↓
Agent A processes → logs with correlation ID → calls Agent B with correlation ID
     ↓
Agent B processes → logs with same ID → returns with same ID in response
     ↓
Full chain traceable in logs by correlation ID
```

Key functions:
- `getCorrelationId(req)` - extract from incoming request or generate a new one
- `correlationHeaders(id)` - headers object to attach to outgoing fetch calls
- `correlatedLogger(id, agentName)` - drop-in logger that prefixes every line with the ID

---

### `lib/agent-registry.js` - Centralized Agent Discovery

Agents look each other up by ID instead of hardcoding URLs. The registry maps agent IDs to their Vercel environment variable names. Actual URLs live in env vars - never in code.

```javascript
// Instead of:
const url = process.env.ANALYTICS_DATA_ACCESS_URL; // scattered, inconsistent

// Use:
const agent = getAgent('analytics-data-access');
await fetch(agent.url, { headers: agent.authHeaders() });
```

Key functions:
- `getAgent(id)` - resolve an agent by ID, throws if not registered or URL not set
- `listActiveAgents()` - all currently active agents with resolved URLs
- `getAgentsByTag(tag)` - filter agents by tag (`security`, `data`, `routing`, etc.)
- `isRegistered(id)` - check before routing to prevent unregistered targets
- `assertAgentReachable(id)` - pre-flight health check before depending on an agent

Customize the registry in `lib/agent-registry.js` by editing the `REGISTRY` array. Add your own agents, adjust tags, and set `active: false` to soft-disable without deleting an entry.

---

### `lib/agent-bus.js` - Standard Message Envelope + Guardrail Reporting

All inter-agent messages are wrapped in a standard envelope. Every call made through the bus includes sender ID, target ID, correlation ID, and timestamp - automatically.

**Envelope shape:**
```json
{
  "envelope": {
    "sender": "mcp-to-agent",
    "target": "analytics-data-access",
    "correlation_id": "1741478400000-a1b2c3d4",
    "sent_at": "2026-03-09T00:00:00.000Z",
    "schema_version": "1.0"
  },
  "payload": {
    // your message body
  }
}
```

Key functions:
- `send(targetId, payload, options)` - send to one agent, wait for response
- `request(targetId, payload, options)` - alias of send with explicit timeout semantics
- `broadcast(tag, payload, options)` - send the same message to all agents with a tag
- `reportToGuardrail(activity, correlationId)` - fire-and-forget activity report to the guardrail. Never throws - guardrail reporting must not interrupt agent work.
- `createEnvelope(sender, target, payload, correlationId)` - build a raw envelope if needed

---

## How Agents Use It

Every agent follows the same pattern:

```javascript
import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { send, reportToGuardrail } from '../../lib/agent-bus.js';

export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, 'my-agent');

  // Do work
  const result = await doWork();

  // Call another agent (envelope built automatically)
  const response = await send('analytics-data-access', { metric: 'error_rate' }, {
    senderId: 'my-agent',
    correlationId,
  });

  // Report to guardrail (fire and forget - never blocks)
  await reportToGuardrail({
    agent_id: 'my-agent',
    event_type: 'work.complete',
    output: result,
  }, correlationId);

  log.log('done');
  return res.status(200).json({ result, correlation_id: correlationId });
}
```

---

## Communication Patterns

### Sequential
```
Request → Agent A → Agent B → Agent C → Response
```
Each agent calls the next using `send()`. The correlation ID flows through every hop.

### Parallel
```
Request → Agent A → [Agent B, Agent C simultaneously] → merged → Response
```
Used in the Composite Service and Hierarchical MCP coordinator. `broadcast()` or `Promise.allSettled` with multiple `send()` calls.

### Fire-and-Forget
```
Agent A → (reports to Guardrail) ← continues without waiting
```
Used for guardrail reporting. Pass `fireAndForget: true` to `send()`. The guardrail processes in parallel - the reporting agent never waits on it.

### Fan-Out (Broadcast)
```
Event → Agent A → [all agents tagged 'security'] simultaneously
```
Used when an event needs to reach a category of agents rather than one specific target.

---

## What Stays Out of This Layer

The lib modules handle **structure** - envelopes, IDs, registry lookups. They don't handle:

- **Your routing logic** - stays in each agent's `ROUTING_RULES` or `PIPELINES`
- **Your auth tokens** - stay in Vercel environment variables
- **Your agent URLs** - stay in Vercel environment variables, referenced by env var name in the registry
- **Your risk profile rules** - stay in `risk-scanner/output/risk-profile.json`

Customize the structure. Keep the secrets and logic in your environment.

---

## Adding a New Agent

1. Add an entry to `REGISTRY` in `lib/agent-registry.js`
2. Set the corresponding env var in your Vercel project settings
3. In your new agent's handler, import from `../../lib/` and follow the pattern above
4. Other agents can now reach it by ID via `send()` or `getAgent()`
