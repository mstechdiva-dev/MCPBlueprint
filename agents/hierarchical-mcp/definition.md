# Hierarchical MCP Agent

## What It Does

The Hierarchical MCP agent coordinates multiple domain-specific MCP servers, allowing different specialized agents to collaborate within one system. It provides a coordination layer above individual agents so they can work together without needing to know about each other directly.

## When to Use It

- You have two or more agents operating in different domains that need to share context or hand off work
- Your system has grown to the point where individual agents need orchestration
- You want a single coordination point rather than agents calling each other directly

## When Not to Use It

- You only have one or two agents - the overhead is not worth it
- Agents are completely independent with no need to share information

## How It Works

```
Coordinator agent → Domain MCP 1 + Domain MCP 2 + Domain MCP N → Results coordinated → Unified output
```

The coordinator doesn't execute domain logic itself - it routes, sequences, and merges work from domain-specific agents.

## Configuration

Key fields:
- `coordinator_role` - what decisions the coordinator makes (routing, sequencing, merging)
- `domain_agents` - the registered agents this coordinator manages
- `routing_logic` - how work is distributed across domain agents
- `merge_output` - whether outputs are combined into a single response

## Common Use Cases

- Coordinating a data-fetch agent and a reporting agent so that reports always reflect the latest fetched data
- Running a risk assessment agent and a notification agent in sequence, where notifications only send if the assessment crosses a threshold
- Managing three domain-specific agents (ingestion, transformation, storage) in a data pipeline without any agent needing to know about the others
- Providing a single entry point for a complex workflow that would otherwise require the calling system to know about every agent involved

## Guardrail Considerations

- This agent has the broadest visibility in the system - monitor it closely
- Alert if it attempts to route work to an agent not in `domain_agents`
- Flag any coordination decision that bypasses a domain agent's defined scope
- This is the highest-value target for the guardrail agent to watch
