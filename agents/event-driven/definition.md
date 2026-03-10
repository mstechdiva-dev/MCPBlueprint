# Event-Driven Integration Agent

## What It Does

The Event-Driven Integration agent listens to event streams and triggers actions when specific conditions are met. It is built for asynchronous, real-time workflows where waiting for a request/response cycle is not an option.

## When to Use It

- Your platform needs to react to things as they happen, not on a polling schedule
- You are processing streams of data where timing matters
- Actions need to trigger automatically based on conditions, not user requests

## When Not to Use It

- Your workflow is synchronous and request-driven (use Direct API Wrapper instead)
- Events are infrequent enough that polling is more appropriate

## How It Works

```
Event stream → Agent listens → Condition met → Action triggered → Result logged
```

## Configuration

Key fields:
- `event_source` - where the event stream comes from
- `event_filters` - which events to act on (ignore everything else)
- `trigger_conditions` - the logic that determines when an action fires
- `actions` - what the agent does when a condition is met
- `max_events_per_minute` - rate limit to prevent runaway processing

## Common Use Cases

- Real-time data monitoring and alerting
- Reacting to user activity events
- Processing incoming data feeds as they arrive
- Triggering downstream workflows based on system state changes

## Guardrail Considerations

- Alert if event processing rate exceeds `max_events_per_minute`
- Flag if actions are firing on events outside the defined `event_filters`
- Monitor for cascading triggers where one action creates another event that re-triggers the agent
