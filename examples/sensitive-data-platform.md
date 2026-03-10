# Example: Sensitive Data Processing Platform

## Platform Description

A platform that processes structured records containing personally identifiable or otherwise sensitive information, evaluates them against defined criteria, and produces scored outputs for downstream review.

## Agents Used

| Agent | Role in This Platform |
|-------|----------------------|
| Guardrail | Intervene mode - blocks rather than just alerts |
| Local Resource Access | Read-only access to input record store |
| Analytics Data Access | Tracks evaluation patterns and score distributions |
| Configuration Use | Adjusts evaluation thresholds based on record category |

## Architecture Flow

```
Input Records (local store)
        ↓
Local Resource Access Agent (reads records securely)
        ↓
Configuration Use Agent (adjusts thresholds per record type)
        ↓
Evaluation Logic (outside agent layer - platform-specific)
        ↓
Analytics Data Access Agent (logs and tracks output patterns)
        ↓
Guardrail Agent (intervene mode - watching all of the above)
```

## Key Configuration Decisions

**Guardrail in Intervene mode** - the cost of a data exposure event on this platform type is too high to rely on alerts alone. Intervene mode means a scope violation is blocked, not just logged.

**Local Resource Access read-only** - input records are never modified by agents. Write operations belong to the application layer, not the agent layer.

**Configuration Use adjustment scope** - limited strictly to threshold values. The agent cannot adjust its own access permissions or logging behavior.

## Risk Scanner Findings (Typical for This Platform Type)

- Data exposure: highest priority - verify PII fields never appear in analytics logs or guardrail alert payloads
- Auth patterns: ensure evaluation outputs are only accessible to authenticated sessions
- API scope: if any external API is involved, review it carefully for data residency implications

## Lessons from This Pattern

- Audit logs for every record access are not optional - they are the primary defense in any compliance review
- Test the guardrail's intervene behavior before going live - verify it actually blocks, not just logs
- Score distribution analytics are valuable for catching model drift - if average scores shift significantly over time, something changed
