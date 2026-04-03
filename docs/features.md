# MCPBlueprint - Features

A structured, safety-first framework for defining, building, deploying, and managing MCP (Model Context Protocol) agents. MCPBlueprint provides repeatable patterns, built-in safety mechanisms, and standardized communication so teams can move from prototyping agents to production systems with confidence.

**Philosophy:** Agents are the main characters, your data is the backstory. The risk scanner reads that backstory before anything starts. The guardrail watches every character to make sure no one goes off script.

Complete feature list across all layers of the framework.

---

## Agent Types (9)

| Agent | Pattern | What It Provides |
|-------|---------|-----------------|
| Direct API Wrapper | Single API, no intermediary | Clean request/response to one external service |
| Composite Service | Multi-API aggregation | Parallel or sequential calls to multiple services, merged response |
| MCP-to-Agent | Output routing | Classify MCP tool output and route to the right sub-agent |
| Event-Driven | Webhook receiver | Filter, rate-limit, and react to events with configurable actions |
| Configuration Use | Context-adaptive config | Adjust agent settings at runtime based on request context signals |
| Analytics Data Access | Metrics querying | Authorized, cached access to trend and aggregated data |
| Hierarchical MCP | Multi-agent coordination | Named pipelines with sequential and parallel agent execution |
| Local Resource Access | Scoped file I/O | Access-controlled reads and writes with forced audit logging |
| Guardrail | Safety monitoring | Real-time rule evaluation across all agents, alert or intervene mode |

---

## Risk Scanner

- Scans your codebase across four categories: data exposure, API scope, auth patterns, loop detection
- Produces a structured `risk-profile.json` committed before Vercel deployment
- Risk profile is read automatically by the guardrail agent to populate its rule set
- Configurable rule skipping and output path
- Verbose mode for detailed terminal output
- Output schema documented in `risk-scanner/output-schema.md`

---

## Guardrail Agent

- Two operating modes: `alert` (log and notify) and `intervene` (block or reroute)
- Six baseline rules active on every platform regardless of risk scanner findings
- Risk scanner output auto-loaded as additional rules on startup
- Escalation threshold: configurable alert count within a time window before severity escalates
- Alert destination: any webhook (Slack, PagerDuty, email, custom)
- Credential exposure rule always intervenes regardless of mode setting
- Accepts both raw activity reports and agent-bus enveloped messages
- Independent audit log for guardrail decisions (separate from agent logs)

---

## Agent Communication Layer (`lib/`)

### Correlation (`lib/correlation.js`)
- Correlation ID threaded across every inter-agent call in a chain
- Extracted from incoming request headers or generated fresh at chain start
- Correlated logger: every log line prefixed with ID and agent name
- Outgoing headers helper: attaches correlation ID to any outgoing fetch

### Agent Registry (`lib/agent-registry.js`)
- Central registry of all agents - IDs, env var names, tags, active flags
- `getAgent(id)` - resolve URL and auth headers by agent ID
- `listActiveAgents()` - all currently active agents with resolved URLs
- `getAgentsByTag(tag)` - group agents by domain (`security`, `data`, `routing`, etc.)
- `isRegistered(id)` - routing guard before forwarding
- `assertAgentReachable(id)` - health check before depending on an agent in a pipeline
- Soft-disable agents with `active: false` without removing registry entries

### Agent Bus (`lib/agent-bus.js`)
- Standard message envelope: sender, target, correlation ID, timestamp, schema version
- `send()` - enveloped POST to one registered agent
- `request()` - explicit timeout semantics alias of send
- `broadcast(tag)` - same message to all agents with a given tag, results collected
- `reportToGuardrail()` - fire-and-forget activity reporting, never throws, never blocks
- `createEnvelope()` - raw envelope builder for custom use cases

---

## Admin Panel

- Vercel-hosted management UI - no local server required after deployment
- Activate and deactivate agents without touching config files
- Upload updated agent definitions from the browser
- View risk profile and guardrail alert history
- Monitor agent status and last activity timestamp

---

## Onboarding Prompt Flow

- 11 questions covering data sensitivity, external connections, processing model, and preferences
- Answers auto-generate `config/platform.json`
- Platform config drives agent recommendations and template selection
- One-time pre-deploy step - not re-run on the server

---

## Templates (4)

| Template | For |
|----------|-----|
| Minimal Setup | Smallest possible footprint - guardrail + one agent |
| API-Heavy Platform | Multiple external API connections with composite and routing patterns |
| Data Pipeline | Real-time ingestion and processing with event-driven and hierarchical patterns |
| Sensitive Data Platform | PII, regulated data, compliance-adjacent - tighter guardrail, restricted features |

---

## Reference Examples (3)

- Real-Time Data Platform - event-driven ingestion, hierarchical coordination, analytics feedback loop
- Sensitive Data Processing - local resource access, restricted composite calls, tight guardrail
- API Monitoring Platform - direct API wrappers, MCP-to-agent routing, analytics-driven thresholds

---

## Developer Experience

- Every agent folder self-contained: `definition.md`, `config.example.json`, `agent.js`, `test.md`
- Agent definitions in plain markdown - no proprietary format
- `test.md` checklist in every agent folder for pre-production verification
- All scripts use ES module `import/export` - compatible with Vercel's Node.js runtime
- `// Customize:` comments mark every decision point in every script
- `.env.example` documents every environment variable the system uses
- MIT license - fork, adapt, ship

---

## Deployment (Vercel)

- All agents deployed as Vercel serverless functions
- `vercel.json` included for routing and function config
- Environment variables managed entirely through Vercel dashboard
- No server to maintain - scales automatically
- Admin panel served from the same deployment

---

## Security

- Guardrail active on every platform before any other agent
- Internal agent-to-agent calls authenticated with `INTERNAL_AGENT_TOKEN`
- Local Resource Access: path allowlist, exclusion list, credential pattern blocking, forced audit log
- Guardrail credential-exposure rule always intervenes (not mode-dependent)
- Risk scanner findings drive guardrail rules - not hand-written assumptions
- No secrets in code - all sensitive values in Vercel environment variables

---

## User Workflows

1. **Setup** - Run onboarding wizard to generate platform config based on your needs
2. **Scan** - Run risk scanner against your codebase to identify exposure areas
3. **Configure** - Review scanner output, remove false positives, add missed items
4. **Deploy** - Push to Vercel with environment variables configured
5. **Monitor** - Use admin panel and guardrail alerts to track agent behavior
6. **Iterate** - Start in alert mode, validate for 2+ weeks, then move to intervene mode

---

## Differentiators

- **Safety from real findings** - Guardrail rules generated from scanner output, not hand-written assumptions
- **Markdown as source of truth** - No proprietary formats; anyone can read and edit definitions
- **Modular and opt-in** - Activate only the agent types you need
- **You own the code** - Not a hosted service; fork, adapt, and ship under MIT license
- **No forced integrations** - Documents patterns without locking you into specific services
- **Production-focused** - Correlation IDs, structured logging, health checks, and audit trails built in
- **Opinionated where it matters** - Standardized communication and safety; flexible everywhere else
