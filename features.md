# MCPBlueprint - Features

## Core Functionality

MCPBlueprint is a structured framework for defining, building, deploying, and managing MCP (Model Context Protocol) agents. It provides repeatable patterns, built-in safety mechanisms, and standardized communication so teams can move from prototyping agents to production systems with confidence.

**Philosophy:** Agents are the main characters, your data is the backstory. The risk scanner reads that backstory before anything starts. The guardrail watches every character to make sure no one goes off script.

## Key Features

### 9 Agent Types
Each agent type is self-contained with a markdown definition, example config, implementation, and test checklist:

- **Direct API Wrapper** - Clean single-API connections with no intermediary
- **Composite Service** - Unify multiple APIs into one coordinated call
- **MCP-to-Agent** - Trigger specialized sub-agents based on output routing
- **Event-Driven** - React to event streams in real time
- **Configuration Use** - Self-tuning agent behavior based on context signals
- **Analytics Data Access** - Pull trend and metrics data for informed decisions
- **Hierarchical MCP** - Coordinate multiple domain-specific agents
- **Local Resource Access** - Secure, scoped access to local files and resources
- **Guardrail** - Monitor and protect all other agents in real time

### Risk Scanner
Pre-deploy analysis tool that scans your codebase and identifies real risk exposure across four categories:
- **Data Exposure** - PII in payloads, credentials in output, unvalidated write paths
- **API Scope** - Overly broad permissions, calls to unlisted endpoints, hardcoded keys
- **Auth Patterns** - Missing auth gates, admin access without role checks
- **Loop Detection** - Unbounded retries, circular agent dependencies, cascading triggers

Scanner output directly feeds guardrail rules — safety rules come from real findings, not guesswork.

### Guardrail Agent
The centerpiece safety layer with two operating modes:
- **Alert Mode** - Logs suspicious activity and sends notifications without blocking (recommended starting point)
- **Intervene Mode** - Can pause, reroute, or block agents mid-task (after validation period)

Baseline rules are always active: handoff logging, exception alerting, loop detection, scope enforcement, and credential exposure blocking.

### Admin Panel
Vercel-hosted management UI for controlling agents without touching config files:
- Activate/deactivate agents without code changes
- Upload updated agent definitions from the browser
- View risk profile and guardrail alert history
- Monitor agent status and last activity timestamps

### Onboarding Flow
11-question setup wizard that auto-generates platform configuration with agent recommendations and template selection based on your data sensitivity, API needs, processing model, and compliance requirements.

## Technical Architecture

- **Language:** Node.js (ES modules, Node 18+)
- **Framework:** Express.js (admin panel)
- **Deployment:** Vercel serverless functions (all agents run as Vercel functions)
- **Protocol:** MCP (Model Context Protocol)
- **License:** MIT

### Shared Communication Layer (`lib/`)
- **Correlation IDs** - Unique request threading across every agent call, log line, and guardrail report
- **Agent Registry** - Centralized discovery by ID with tags, health checks, and soft-disable support
- **Agent Bus** - Standard message envelope with guardrail reporting (fire-and-forget, never blocks)

### 4 Starter Templates
- **Minimal Setup** - Guardrail + Direct API Wrapper
- **API-Heavy Platform** - Multiple external APIs with composite service and routing
- **Data Pipeline** - Event-driven ingestion with hierarchical coordination
- **Sensitive Data Platform** - Tight guardrail with restricted features for PII/regulated data

## User Workflows

1. **Setup** - Run onboarding wizard to generate platform config based on your needs
2. **Scan** - Run risk scanner against your codebase to identify exposure areas
3. **Configure** - Review scanner output, remove false positives, add missed items
4. **Deploy** - Push to Vercel with environment variables configured
5. **Monitor** - Use admin panel and guardrail alerts to track agent behavior
6. **Iterate** - Start in alert mode, validate for 2+ weeks, then move to intervene mode

## Differentiators

- **Safety from real findings** - Guardrail rules generated from scanner output, not hand-written assumptions
- **Markdown as source of truth** - No proprietary formats; anyone can read and edit definitions
- **Modular and opt-in** - Activate only the agent types you need
- **You own the code** - Not a hosted service; fork, adapt, and ship under MIT license
- **No forced integrations** - Documents patterns without locking you into specific services
- **Production-focused** - Correlation IDs, structured logging, health checks, and audit trails built in
- **Opinionated where it matters** - Standardized communication and safety; flexible everywhere else
