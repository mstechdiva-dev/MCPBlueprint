# Analytics Data Access Agent

## What It Does

The Analytics Data Access agent pulls analytics and metrics data so agents can make informed, data-driven decisions rather than operating blind. It provides a structured layer for accessing trend data, usage metrics, and performance indicators.

## When to Use It

- Agents need historical or trend data to inform their current actions
- You want decisions based on data patterns rather than single data points
- Your platform generates metrics that should feed back into agent behavior

## When Not to Use It

- You only need raw, real-time data with no trend analysis (use Direct API Wrapper)
- The data access doesn't influence any decisions - it is just for display

## How It Works

```
Agent requests analytics → Data layer queries metrics store → Aggregated data returned → Agent uses data in decision
```

## Configuration

Key fields:
- `data_sources` - where analytics data comes from
- `metrics` - which specific metrics the agent is authorized to access
- `aggregation` - how data is summarized (average, sum, percentile, etc.)
- `time_range` - default lookback period for trend queries
- `cache_ttl_seconds` - how long results are cached before a fresh query is made

## Common Use Cases

- Adjusting guardrail alert thresholds based on observed error rates over the past 24 hours
- Recommending which agent to activate next based on platform usage trends
- Surfacing anomaly signals to a monitoring agent when a metric crosses a defined threshold
- Pre-loading trend context before a composite service call so the result is interpreted correctly

## Guardrail Considerations

- Alert if the agent queries metrics outside its defined `metrics` list
- Flag queries that return unusually large datasets (possible scope creep)
- Monitor cache invalidation patterns - excessive cache bypassing may indicate misuse
