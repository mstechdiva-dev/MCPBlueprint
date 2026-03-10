# Example: API Monitoring Platform

## Platform Description

A platform that monitors the health, availability, and performance of external APIs and cloud services, surfacing status changes and alerting when SLA thresholds are at risk.

## Agents Used

| Agent | Role in This Platform |
|-------|----------------------|
| Guardrail | Alert mode |
| Direct API Wrapper | One per monitored service endpoint |
| Event-Driven | Reacts to status change events |
| Analytics Data Access | Tracks uptime, latency trends, and error rates |

## Architecture Flow

```
Direct API Wrapper Agents (polling monitored endpoints)
        ↓
Event-Driven Agent (detects status changes and threshold breaches)
        ↓
Analytics Data Access Agent (trends latency and availability over time)
        ↓
Guardrail Agent (watching all agents and the monitoring data itself)
```

## Key Configuration Decisions

**Multiple Direct API Wrapper instances** - one per monitored service. Keeping them separate means a problem with one monitored service doesn't affect monitoring of others.

**Event-Driven filters** - narrow filters are critical here. Only react to `status.changed` and `threshold.exceeded` events. Ignore everything else.

**Analytics caching** - short TTL (60 seconds or less) for monitoring data because staleness defeats the purpose.

## Risk Scanner Findings (Typical for This Platform Type)

- Loop detection: polling agents are the most likely source of runaway behavior - ensure `retry_limit` is set on every Direct API Wrapper instance
- API scope: monitoring agents only need read access - no write permissions should exist
- Auth patterns: monitoring dashboards are often less auth-hardened than the systems they monitor - review access controls

## Lessons from This Pattern

- Do not monitor the monitoring agents with the same agents doing the monitoring - the guardrail is your independent observer
- Latency trending is more useful than point-in-time checks - a service that is slow but not down is often a leading indicator of a bigger issue
- Set `retry_limit` conservatively (2-3) for monitoring agents - aggressive retries against an already-struggling service make things worse
