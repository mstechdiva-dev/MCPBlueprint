# MCP-to-Agent Pattern

## What It Does

The MCP-to-Agent pattern uses the MCP server to trigger tools, then hands off the output to specialized sub-agents for focused follow-on actions. It separates the triggering logic from the execution logic.

## When to Use It

- Different outputs from one process need to go to different specialized agents
- You want clean separation between what triggers an action and what performs it
- Your workflow involves specialized reasoning or processing that a general agent shouldn't handle

## When Not to Use It

- You have a simple linear workflow with no branching (use Direct API Wrapper or Composite Service)
- Sub-agents don't exist yet - build those first

## How It Works

```
MCP Server triggers tool → Output assessed → Routed to specialized agent → Focused action taken
```

## Configuration

Key fields:
- `trigger_tool` - the tool the MCP server uses to initiate the pattern
- `routing_rules` - conditions that determine which sub-agent receives the output
- `sub_agents` - list of registered specialized agents available for handoff
- `fallback_agent` - which agent handles output that matches no routing rule

## Common Use Cases

- Routing incoming data to either an alert agent or a reporting agent based on severity classification
- Separating the triggering of a scan from the specialized agent that interprets scan results
- Handing off customer inquiry output to a billing agent, a support agent, or a fraud-detection agent depending on the inquiry type
- Decoupling an event stream processor from the downstream agents that act on different event types

## Guardrail Considerations

- Monitor handoff payloads for sensitive data being passed between agents
- Alert if output is routed to an agent not in the `sub_agents` list
- Flag if the trigger tool fires more frequently than expected
