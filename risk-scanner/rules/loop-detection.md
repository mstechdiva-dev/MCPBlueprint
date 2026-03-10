# Rule: Loop Detection

## What This Rule Checks

Whether agent call patterns could result in infinite loops, runaway retries, or circular dependencies between agents.

## What It Looks For

- Retry mechanisms with no maximum attempt limit defined
- An agent that can trigger itself directly or indirectly through another agent
- Two or more agents that call each other without a termination condition
- Event-driven agents whose actions produce events that re-trigger the same agent
- Polling patterns with no backoff strategy

## Severity Levels

| Finding | Severity |
|---------|----------|
| Unbounded retry (no max limit) | high |
| Direct self-trigger possible | high |
| Circular dependency between agents | critical |
| Event re-trigger without termination | high |
| Polling without backoff | medium |

## Guardrail Rules Generated

- `alert_on_repeated_failed_calls`
- `alert_on_call_volume_spike`
- `alert_on_cascading_trigger`
- `alert_on_silent_failures`

## Notes

Loop detection is the hardest category to get right because loops often only appear under specific load or timing conditions. If the scanner flags a potential loop, treat it seriously even if it has not occurred in testing.
