# Example: Real-Time Data Platform

## Platform Description

A platform that ingests real-time data from multiple external public data sources, processes it into meaningful indicators, and surfaces alerts when thresholds are crossed.

## Agents Used

| Agent | Role in This Platform |
|-------|----------------------|
| Guardrail | Monitors all agents - alert mode initially |
| Composite Service | Pulls from multiple data source APIs in one call |
| Event-Driven | Listens for threshold-crossing events and triggers alerts |
| Analytics Data Access | Tracks indicator trends over time |
| Hierarchical MCP | Coordinates between the data ingestion and alerting layers |

## Architecture Flow

```
External Data Sources
        ↓
Composite Service Agent (aggregates multiple sources)
        ↓
Event-Driven Agent (watches for threshold conditions)
        ↓
Analytics Data Access Agent (logs and trends the data)
        ↓
Hierarchical MCP Agent (coordinates between layers)
        ↓
Guardrail Agent (watching all of the above)
```

## Key Configuration Decisions

**Composite Service** - `partial_success: false` because if one data source fails, the combined indicator is unreliable. Better to surface an error than show incomplete data.

**Event-Driven** - `max_events_per_minute` set conservatively at first, then tuned up based on observed load. Cascading trigger alerts enabled.

**Analytics Data Access** - caching TTL set to 5 minutes to balance freshness with API load.

## Risk Scanner Findings (Typical for This Platform Type)

- API scope: ensure data source agents have read-only access only
- Loop detection: event-driven agents in real-time platforms are the most common source of cascading triggers - test this explicitly
- Data exposure: if the platform surfaces data publicly, verify no internal metadata leaks into the public payload

## Lessons from This Pattern

- Stand up the guardrail first, then the composite service, then event-driven last
- Tune your event filters aggressively early - it is easier to add events you are listening to than to calm down a noisy agent
- Analytics caching matters more than you think at scale - cold queries against a live data store on every request cause latency spikes
