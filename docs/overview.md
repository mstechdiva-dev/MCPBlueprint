# MCPBlueprint Overview

## What This Is

MCPBlueprint is a framework for defining, building, testing, and managing MCP agents in a structured, repeatable way. It's not a runtime engine - it's a blueprint system. It tells you what each agent type is, how to configure it, how to communicate with other agents, how to test it, and how to protect it.

Most teams building with agents run into the same problems: no consistent way to define what an agent is supposed to do, no clear guardrails on what it shouldn't do, raw HTTP calls between agents with no tracing or standard envelope, no risk scan before deploying, and no easy way to turn agents on or off without touching code.

MCPBlueprint gives you a structured starting point for all of that.

---

## How It Works

### Step 1 - Onboarding Prompts
When you set up MCPBlueprint for the first time, a short prompt flow asks questions about your platform. What kind of data does it handle? What external APIs does it call? Does it process user PII? Those answers auto-fill a base configuration specific to your project.

### Step 2 - Risk Scanner
Before your guardrail agent is configured, the risk scanner runs against your codebase or config files. It identifies real exposure areas - data paths, API scopes, auth patterns, potential loop conditions - and produces a risk profile in JSON format.

### Step 3 - Guardrail Generation
The risk profile from the scanner becomes the source material for your guardrail agent's rules. You're not writing rules from scratch based on what you think might be risky. The scanner tells you what is actually at risk, and the guardrail agent is built around those findings.

### Step 4 - Deploy to Vercel
Commit your generated config files and deploy. Every agent runs as a Vercel serverless function. The admin panel is served from the same deployment.

### Step 5 - Agent Activation
Using the admin panel, you activate the agents your platform needs. Each agent is modular. Nothing is forced on. You can add or remove agents as your platform evolves without rebuilding your configuration from scratch.

### Step 6 - Agent Communication
Once deployed, agents communicate through the shared `lib/` layer:
- Every call between agents carries a **correlation ID** that threads through the full chain
- Agents find each other through the **registry** - no hardcoded URLs
- Every inter-agent message uses a **standard envelope** with sender, target, timestamp, and correlation ID
- Every agent reports its activity to the **guardrail** automatically - fire-and-forget, never blocking

### Step 7 - Testing
Each agent folder includes a `test.md` file with specific steps to verify the agent is working as expected. Run through the checklist before going live.

---

## The Communication Layer

The three modules in `lib/` are what make agents a coordinated system rather than isolated functions:

```
Agent A receives request
    ↓ extracts or generates correlationId
    ↓ logs with correlatedLogger (id prefixed on every line)
    ↓ does its work
    ↓ calls Agent B via send() - envelope built automatically
         ↓ Agent B receives enveloped message
         ↓ same correlationId carried in headers
         ↓ Agent B logs, works, responds
    ↓ Agent A receives Agent B's response
    ↓ reportToGuardrail() - fire-and-forget, non-blocking
    ↓ returns response with correlation_id in body
```

Full chain is traceable in logs by searching for the correlation ID.

---

## What MCPBlueprint Is Not

It's not a hosted service, it doesn't wire up GitHub, Slack, or any external tool, and it won't execute agent logic for you. It's also not opinionated about your tech stack beyond Vercel for deployment.

It's a structured reference system you drop into your project and adapt. The `// Customize:` comments in every `agent.js` mark exactly what to change.

---

## Repo Structure

```
MCPBlueprint/
│
├── README.md                          # Project overview and quick start
├── CONTRIBUTING.md                    # How to contribute
├── LICENSE                            # MIT
│
├── docs/
│   ├── overview.md                    # This file
│   ├── features.md                    # Complete feature list
│   ├── getting-started.md             # Setup walkthrough
│   ├── agent-activation.md            # How to activate and deactivate agents
│   ├── agent-communication.md         # lib/ layer - correlation, registry, bus
│   └── risk-scanner.md                # How the scanner works
│
├── lib/                               # Shared agent communication layer
│   ├── correlation.js                 # Correlation ID threading and correlated logging
│   ├── agent-registry.js              # Central agent registry - ID to URL resolution
│   └── agent-bus.js                   # Message envelope, send/broadcast, guardrail reporting
│
├── agents/                            # One folder per agent type
│   ├── direct-api-wrapper/            # definition.md, config.example.json, agent.js, test.md
│   ├── composite-service/
│   ├── mcp-to-agent/
│   ├── event-driven/
│   ├── configuration-use/
│   ├── analytics-data-access/
│   ├── hierarchical-mcp/
│   ├── local-resource-access/
│   └── guardrail/                     # Always activate first
│
├── risk-scanner/                      # Pre-deploy risk analysis tool
│   ├── README.md
│   ├── scanner.js
│   ├── output-schema.md
│   ├── output/                        # Generated risk profile lands here
│   └── rules/                         # Four rule category files
│
├── admin-panel/                       # Vercel-hosted management UI
│   ├── README.md
│   ├── index.js
│   ├── onboarding.js
│   └── onboarding-prompts.md
│
├── config/                            # Generated by onboarding - committed before deploy
├── templates/                         # Starter configs by platform type (4)
└── examples/                          # Reference architectures (3)
```
