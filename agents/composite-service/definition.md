# Composite Service Agent

## What It Does

The Composite Service agent unifies multiple API calls into a single service layer. Instead of the agent juggling multiple external calls separately, this pattern wraps them into one coordinated request that returns a unified response.

## When to Use It

- Your workflow requires data from more than one external API to produce a single result
- You want to simplify what downstream agents or your application receives
- You are dealing with chaotic multi-API workflows that are hard to reason about

## When Not to Use It

- You only need one API (use Direct API Wrapper instead)
- The APIs are completely unrelated and don't need to be combined
- Latency is critical and sequential API calls would be too slow - consider async patterns

## How It Works

```
Agent → MCP Server → [API 1, API 2, API 3] → Merged response → Agent
```

The MCP server handles the orchestration of multiple calls and merges results before returning them.

## Configuration

See `config.example.json` for a working example.

Key fields:
- `services` - array of external APIs to call
- `merge_strategy` - how results are combined (merge, concat, first_wins)
- `parallel` - whether to call APIs simultaneously or sequentially
- `timeout_ms` - applies to the entire composite call, not individual services
- `partial_success` - whether to return partial results if one API fails

## Common Use Cases

- Aggregating data from multiple data sources into one response
- Combining user data from different services into a single profile
- Pulling metrics from multiple monitoring endpoints into one dashboard payload

## Guardrail Considerations

- Monitor that the agent is not calling services outside the defined `services` list
- Alert if one service in the composite consistently fails - may indicate a dependency issue
- Watch for response size growth that could indicate unexpected data being included
