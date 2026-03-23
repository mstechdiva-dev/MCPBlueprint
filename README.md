# MCPBlueprint

> When I think about MCPBlueprint, agents are the main characters and your data is the backstory. The risk scanner reads that backstory before anything starts. The guardrail watches every character to make sure no one goes off script.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Status: Active](https://img.shields.io/badge/Status-Active-green.svg)]()

---

## The Problem

Most teams building with MCP agents run into the same wall: there is no consistent way to define what an agent should do, no clear boundary on what it shouldn't do, and no structured process for identifying risk before something goes wrong.

You end up with agents that are hard to reason about, configurations that drift over time, and guardrails that are either missing entirely or built around guesses rather than actual findings.

MCPBlueprint solves this by giving you a structured starting point - not a rigid system - that grows with your platform.

---

## How It Works

MCPBlueprint isn't a runtime. It's a blueprint system: well-defined agent patterns, a shared communication layer, an onboarding flow that generates configuration from your answers, a risk scanner that finds real exposure areas in your codebase, and an admin panel that puts everything under one roof.

```
Answer onboarding prompts
        ↓
Config auto-generated for your platform
        ↓
Risk scanner runs against your codebase
        ↓
Guardrail rules built from scan findings
        ↓
Deploy to Vercel
        ↓
Activate only the agents you need
        ↓
Agents communicate through lib/ - correlated, enveloped, registry-resolved
        ↓
Admin panel manages everything from one place
```

The guardrail agent is the centerpiece. Its rules come from what the scanner actually found in your project - not from a generic checklist you fill in by hand. Every agent reports its activity to the guardrail automatically through the communication layer, so nothing operates outside its view.

### Agent Communication Layer

All agents communicate through three shared modules in `lib/`:

| Module | What It Does |
|--------|-------------|
| `lib/correlation.js` | Threads a correlation ID across every hop in a multi-agent chain - every log line, every guardrail report, every response carries it |
| `lib/agent-registry.js` | Central registry of all agents - resolved by ID, not hardcoded URLs. Supports tags, health checks, and soft-disable |
| `lib/agent-bus.js` | Standard message envelope for all inter-agent calls, plus fire-and-forget guardrail reporting that never blocks agent work |

See [docs/agent-communication.md](docs/agent-communication.md) for the full pattern reference.

---

## What's Included

For the complete feature breakdown see [docs/features.md](docs/features.md).

### 9 Agent Types

Every agent type ships with four files: a plain-markdown definition, an example config, a working Vercel serverless script (`agent.js`), and a test checklist. Each is self-contained and independently activatable.

| # | Agent | Purpose |
|---|-------|---------|
| 1 | [Direct API Wrapper](agents/direct-api-wrapper/definition.md) | Clean single-API connections with no intermediary |
| 2 | [Composite Service](agents/composite-service/definition.md) | Unify multiple APIs into a single coordinated call |
| 3 | [MCP-to-Agent](agents/mcp-to-agent/definition.md) | Trigger specialized sub-agents based on output routing |
| 4 | [Event-Driven](agents/event-driven/definition.md) | React to event streams in real time |
| 5 | [Configuration Use](agents/configuration-use/definition.md) | Self-tuning agent behavior based on context signals |
| 6 | [Analytics Data Access](agents/analytics-data-access/definition.md) | Pull trend and metrics data for informed decisions |
| 7 | [Hierarchical MCP](agents/hierarchical-mcp/definition.md) | Coordinate multiple domain-specific agents |
| 8 | [Local Resource Access](agents/local-resource-access/definition.md) | Secure, scoped access to local files and resources |
| 9 | [Guardrail](agents/guardrail/definition.md) | Monitor and protect all other agents in real time |

Every `agent.js` includes `// Customize:` comments at every decision point so you know exactly what to change without reading the whole file.

### Communication Library (`lib/`)

Three modules shared across all agents:
- **`lib/correlation.js`** - correlation ID generation, propagation, and correlated logging
- **`lib/agent-registry.js`** - agent lookup by ID, tag filtering, health checks, active flags
- **`lib/agent-bus.js`** - standard message envelope, `send()`, `broadcast()`, `reportToGuardrail()`

See [docs/agent-communication.md](docs/agent-communication.md) for the full reference.

### Risk Scanner

A standalone tool that runs before your guardrail is configured. It scans your codebase across four categories - data exposure, API scope, auth patterns, and loop detection - and produces a structured risk profile. That profile becomes the source for your guardrail's rule set.

### Admin Panel

A Vercel-hosted management UI for managing active agents, reviewing guardrail alerts, uploading updated agent definitions, and viewing your current risk profile - without touching config files directly.

### Onboarding Prompt Flow

An 11-question flow that asks about your platform's data sensitivity, external connections, processing model, and preferences. Your answers auto-generate a `config/platform.json` and recommend which agents and templates are the best fit for your use case.

### Templates

Starter configurations for four common platform types:
- [Minimal Setup](templates/minimal-setup.md) - get running with the least possible footprint
- [API-Heavy Platform](templates/api-platform.md) - multiple external API connections
- [Data Pipeline](templates/data-pipeline.md) - real-time ingestion and processing
- [Sensitive Data Platform](templates/hr-sensitive.md) - PII, regulated data, compliance-adjacent use cases

### Examples

Three generic reference architectures showing how different platform types wire agents together, what configuration decisions matter most, and what the risk scanner typically finds for each type:
- [Real-Time Data Platform](examples/real-time-data-platform.md)
- [Sensitive Data Processing Platform](examples/sensitive-data-platform.md)
- [API Monitoring Platform](examples/api-monitoring-platform.md)

---

> **Environment:** MCPBlueprint is built for serverless deployment on [Vercel](https://vercel.com). All documentation, configuration, and examples target that environment. Running locally is only needed for the one-time pre-deploy setup steps below. Once deployed, everything is managed through the Vercel dashboard and your live admin panel URL.

---

## Quick Start

**1. Set environment variables in the Vercel dashboard**

See [docs/production.md](docs/production.md) for the full variable list.

**2. Deploy to Vercel**
```bash
vercel deploy
```

**3. Open your admin panel**

Navigate to your Vercel deployment URL. From there:
- Activate and deactivate agents
- Upload updated agent definitions
- View your risk profile and guardrail alerts
- Check agent status

**4. Test each active agent**

Every agent folder includes a `test.md` checklist. Work through it for each agent you activated before going to production.

---

> **Pre-deploy footnote:** Before your first Vercel deploy, you need to generate two config files locally - `config/platform.json` (from the onboarding script) and `risk-scanner/output/risk-profile.json` (from the risk scanner). Both are committed to the repo before deploying. See [docs/getting-started.md](docs/getting-started.md) for the full setup sequence including these one-time local steps.

---

## Repo Structure

```
MCPBlueprint/
│
├── README.md                          # You are here
├── CONTRIBUTING.md                    # How to contribute
├── LICENSE                            # MIT
├── package.json                       # Node.js project file (npm install)
├── vercel.json                        # Vercel deployment config
├── .env.example                       # Environment variable reference
│
├── docs/
│   ├── overview.md                    # Full system overview
│   ├── features.md                    # Complete feature list
│   ├── getting-started.md             # Detailed setup walkthrough
│   ├── agent-activation.md            # How to activate and manage agents
│   ├── agent-communication.md         # lib/ layer - correlation, registry, bus
│   ├── risk-scanner.md                # How the scanner works
│   ├── tool-design.md                 # How to design tools agents actually use correctly
│   ├── auth-patterns.md               # Bearer token, OAuth, and scoped data access
│   ├── glossary.md                    # Plain-language definitions for beginners
│   └── production.md                  # Health checks, logging, audit trails, deployment
│
├── lib/                               # Shared agent communication layer
│   ├── correlation.js                 # Correlation ID threading and correlated logging
│   ├── agent-registry.js              # Central agent registry - ID to URL resolution
│   └── agent-bus.js                   # Message envelope, send/broadcast, guardrail reporting
│
├── agents/                            # One folder per agent type
│   ├── direct-api-wrapper/
│   ├── composite-service/
│   ├── mcp-to-agent/
│   ├── event-driven/
│   ├── configuration-use/
│   ├── analytics-data-access/
│   ├── hierarchical-mcp/
│   ├── local-resource-access/
│   └── guardrail/                     # Always activate this first
│
├── risk-scanner/
│   ├── README.md
│   ├── scanner.js                     # Pre-deploy only - see docs/getting-started.md
│   ├── output-schema.md
│   ├── output/                        # Generated risk profile lands here
│   └── rules/                         # Four rule category files
│
├── admin-panel/
│   ├── README.md
│   ├── index.js                       # Served via Vercel - not run locally
│   ├── onboarding.js                  # Pre-deploy only - see docs/getting-started.md
│   ├── features.md
│   ├── upload-spec.md
│   └── onboarding-prompts.md          # Full question set and mapping
│
├── config/                            # Generated by onboarding - commit before deploying
│
├── templates/                         # Starter configs by platform type
│
└── examples/                          # Reference architectures
```

---

## Core Principles

**Guardrails from real findings, not guesswork.**
The guardrail's rules come from what the risk scanner actually found in your project. You don't write rules by hand based on what you think might be at risk.

**Markdown as the source of truth.**
Every agent definition is plain markdown. No proprietary formats, no tooling lock-in. Anyone can read it, fork it, edit it, and contribute back with nothing more than a text editor.

**Modular and opt-in.**
Nothing is forced on. Activate what your platform needs, leave off what it doesn't. Each agent is self-contained - definition, config, and test checklist all in one folder. Removing an agent means setting one flag to false.

**No forced integrations.**
MCPBlueprint doesn't wire up GitHub, Slack, Jira, or anything else. It documents how you'd approach those integrations and leaves the implementation to your platform.

**Start with alert, grow into intervene.**
The guardrail runs in two modes: alert (log and notify) and intervene (block and act). Start in alert mode, validate your rule set over a few weeks, then graduate to intervene once you trust your thresholds.

---

## Guardrail Agent

The guardrail is the most important agent in the framework. Activate it first, deactivate it last.

| Mode | Behavior |
|------|----------|
| `alert` | Logs suspicious activity and sends notifications. Nothing is automatically stopped. Recommended starting point. |
| `intervene` | Can pause, block, or reroute another agent mid-task when a rule is triggered. Use after validating alert mode. |

**Baseline rules active on every platform:**
- Log all agent-to-agent handoffs with timestamps
- Alert on silent failures (unhandled exceptions that don't surface an error)
- Flag repeated identical failed calls (loop or broken dependency indicator)
- Alert on scope violations (agent accessing a resource outside its defined boundaries)
- Block credential or token exposure in output payloads
- Alert on unexpected agent activations

See [agents/guardrail/definition.md](agents/guardrail/definition.md) for the full reference.

---

## Risk Scanner

The scanner checks four categories:

| Category | What It Looks For |
|----------|--------------------|
| Data Exposure | PII in payloads, credentials in output, unvalidated write paths |
| API Scope | Overly broad permissions, calls to unlisted endpoints, hardcoded keys |
| Auth Patterns | Missing auth gates, admin access without role checks, bypassable sessions |
| Loop Detection | Unbounded retries, circular agent dependencies, cascading event triggers |

Output format documented in [risk-scanner/output-schema.md](risk-scanner/output-schema.md).

> **Pre-deploy footnote:** The scanner runs locally, once, before your first Vercel deploy. See [docs/getting-started.md](docs/getting-started.md) for setup instructions.

---

## Glossary

New to agents and MCP? See the [Glossary](docs/glossary.md) for plain-language definitions of every key term used in this project - no prior background required.

---

## Contributing

Contributions are welcome. The most useful things to add:
- New agent type definitions for patterns not covered by the existing 9
- Improvements to existing definitions - clearer explanations, better examples
- New templates for platform types not yet covered
- Additional risk scanner rules

See [CONTRIBUTING.md](CONTRIBUTING.md) for standards, submission process, and what won't be merged.

---

## Roadmap

MCPBlueprint is community driven. There's no fixed release schedule. Areas where contributions would have the most impact:
- Scanner rule expansion for cloud-native and serverless architectures
- Additional platform templates
- Admin panel enhancements - authentication layer, persistent alert history, agent activity logs
- Testing frameworks for agent validation

Open an issue to discuss before building anything large.

---

## Questions

Open an issue. Tag it `question` for general questions, `bug` for something broken, or `new-agent` to propose a new agent type.

---

## License

MIT - use it, fork it, build on it. See [LICENSE](LICENSE) for the full text.
