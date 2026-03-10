# Template: Minimal Setup

## Platform Type

Any platform that is just getting started with MCP agents and wants the smallest possible footprint before adding complexity.

## Recommended Agents

Start with only two:

1. **Guardrail** - always first
2. **Direct API Wrapper** - one clean external connection

Do not activate anything else until these two are tested and stable.

## Starting Configuration

```json
{
  "agents": {
    "guardrail": { "active": true, "mode": "alert" },
    "direct-api-wrapper": { "active": true }
  }
}
```

## Onboarding Prompt Answers for This Template

When the onboarding flow runs, answer:
- Platform type: `api-consumer`
- Data sensitivity: `low` (adjust if not true for your platform)
- External APIs: list the one API you are connecting to
- Agent write access needed: `no` to start

## Risk Notes

Minimal setup has minimal risk surface - but don't skip the guardrail. Even one agent can produce unexpected behavior. The alert mode guardrail costs nothing and catches the patterns that are hardest to spot manually.

## When to Expand

Add agents when:
- You find yourself needing data from more than one API → add Composite Service
- You need to react to things in real time → add Event-Driven
- You have enough agents that they need coordination → add Hierarchical MCP
