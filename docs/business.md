# MCPBlueprint - Business

## Revenue Model

MCPBlueprint is an **open-source project** released under the MIT license. It is free to use, fork, and adapt. There is no direct revenue model — the project is community-driven and maintained by contributors.

Users deploy to their own Vercel infrastructure (Vercel's free tier supports basic deployments; production usage may require Vercel paid plans).

### Potential Monetization Paths
- **Consulting and professional services** - Custom agent pattern design, deployment support, and guardrail tuning for enterprise teams
- **Managed/hosted offering** - A hosted version with managed guardrails, scanner-as-a-service, and admin panel hosting
- **Enterprise features** - Advanced compliance reporting, multi-tenant guardrail management, SLA-backed support
- **Training and certification** - Structured programs for teams adopting MCP agent architectures

## Pricing Tiers

Currently **free and open source** (MIT license).

No paid tiers exist at this time. Users bear their own infrastructure costs (Vercel hosting, external API costs).

## Target Customers

### Primary Segments
- **Engineering teams building AI agent systems** - Teams moving from prototyping MCP agents to production and needing structured patterns, safety mechanisms, and communication standards
- **Platform teams at mid-to-large companies** - Teams responsible for deploying and governing multiple AI agents across an organization
- **Security-conscious organizations** - Companies in regulated industries (finance, healthcare, government) that need guardrails, risk scanning, and audit trails before deploying agent systems

### User Personas
- **Backend/platform engineers** implementing MCP agent architectures
- **Engineering managers** who need visibility into agent behavior and risk exposure
- **Security/compliance teams** evaluating agent systems for production readiness
- **DevOps engineers** deploying and monitoring serverless agent infrastructure

## Market Size

The MCP agent tooling market sits at the intersection of:
- **AI agent frameworks** - Rapidly growing as LLM-powered agents move from demos to production
- **Developer tools** - The broader developer tooling market valued at $25B+ and growing
- **AI safety/governance** - Emerging category as enterprises demand guardrails for AI systems

MCPBlueprint targets the specific niche of teams that need structured, safe, production-grade MCP agent deployment — a segment that is early but expanding quickly as MCP adoption accelerates.

## Go-to-Market Strategy

- **Open-source community growth** - GitHub-first distribution; contributors improve the framework and expand its reach
- **Content and education** - Documentation, reference architectures, and templates lower the barrier to adoption
- **Community engagement** - Issue-first contribution model, bot-assisted triage, and responsive maintainers
- **Template-driven onboarding** - Four starter templates let teams get started in minutes, not days
- **Word of mouth** - Teams that ship production agents using MCPBlueprint become advocates

## Competitive Landscape

### Direct Competitors
- **LangGraph / LangChain** - General-purpose agent orchestration; more opinionated about LLM provider, less focused on MCP protocol or guardrails
- **CrewAI** - Multi-agent framework; focused on agent collaboration patterns but less on safety/risk scanning
- **AutoGen** - Microsoft's multi-agent framework; research-oriented, less production-deployment focused

### Indirect Competitors
- **Custom internal frameworks** - Many teams build bespoke agent systems; MCPBlueprint replaces this with a proven pattern
- **MCP server SDKs** - Official MCP SDKs provide building blocks but not structured patterns, risk scanning, or guardrails
- **Platform-specific agent tools** - Cloud provider agent services (AWS Bedrock Agents, etc.) that lock you into a specific platform

### MCPBlueprint's Position
MCPBlueprint differentiates by being:
1. **MCP-native** - Built specifically for the Model Context Protocol
2. **Safety-first** - Risk scanner and guardrail are core, not add-ons
3. **Self-hosted and open** - No vendor lock-in; MIT licensed
4. **Structured but flexible** - Opinionated patterns without forced integrations
