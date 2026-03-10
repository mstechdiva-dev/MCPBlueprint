# Template: Data Pipeline Platform

## Platform Type

Platforms that ingest, process, and output data continuously - real-time feeds, batch processing, or streaming analytics.

## Recommended Agents

1. Guardrail
2. Event-Driven (to process incoming data as it arrives)
3. Analytics Data Access (to monitor pipeline health and trends)
4. Configuration Use (to self-tune based on data volume and load)
5. Hierarchical MCP (if multiple pipeline stages need coordination)

## Starting Configuration

```json
{
  "agents": {
    "guardrail": { "active": true, "mode": "alert" },
    "event-driven": { "active": true },
    "analytics-data-access": { "active": true },
    "configuration-use": { "active": false },
    "hierarchical-mcp": { "active": false }
  }
}
```

Activate Configuration Use and Hierarchical MCP after the first two are stable.

## Risk Notes

- Loop detection is the highest risk for data pipelines - a runaway event trigger can overwhelm your system quickly
- Run the scanner specifically for `loop-detection` before going live
- Set conservative `max_events_per_minute` values and raise them gradually

## Onboarding Prompt Answers

- Platform type: `data-pipeline`
- Data sensitivity: depends on your data - answer accurately
- Real-time processing needed: `yes`
- Expected event volume per minute: provide your estimate
