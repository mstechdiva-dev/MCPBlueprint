# Guardrail Agent

## What It Does

The Guardrail agent monitors all other active agents in real time, flagging or intervening when activity puts the system, data, or outputs at risk. Its rules are generated from the risk scanner's findings - not written by hand based on assumptions.

## When to Use It

Always. The Guardrail agent should be the first agent activated and the last one deactivated. It's the safety layer for everything else.

## When Not to Use It

There's no situation where you should skip the Guardrail agent entirely. However, reduce its scope or sensitivity rather than disabling it when:

- You are prototyping locally with no real data and no external connections. In this case, keep it active in alert mode but reduce alert verbosity. Activate it in its full form before any code reaches staging.
- Alert volume is creating noise. Tune the escalation threshold and rule specificity rather than turning the guardrail off.

Do not deactivate the guardrail to simplify debugging. Switch to alert mode and review logs instead.

## How It Works

```
Risk scanner runs → Risk profile generated → Guardrail rules built from profile → 
Guardrail monitors all active agents → Flags or intervenes when rules are triggered
```

## Two Operating Modes

### Monitor and Alert (recommended starting point)
The agent logs suspicious activity and surfaces alerts for human review. Nothing is automatically stopped. Good for initial deployment while you build confidence in the rule set.

### Monitor and Intervene
The agent can pause, reroute, or block another agent mid-task when a rule is triggered. Use this once you have validated your rules are accurate and your alert thresholds are well-calibrated.

Start with Monitor and Alert. Graduate to Monitor and Intervene after at least two weeks of validated alerts.

## Rule Sources

Rules come from two places:
1. **Risk scanner output** - automatically generated from your codebase scan
2. **Shared baseline rules** - apply to all agents regardless of platform (see below)

## Shared Baseline Rules (always active)

These rules apply across every platform regardless of what the risk scanner finds:

- Log all agent-to-agent handoffs with timestamps
- Alert on any unhandled exception that fails silently
- Flag repeated identical failed calls (sign of a loop or broken dependency)
- Alert if an agent attempts to access a resource outside its defined scope
- Block any agent from exposing credentials or tokens in output payloads
- Alert if an agent that was previously inactive suddenly becomes active without a recorded activation event

## Configuration

Key fields:
- `mode` - `alert` or `intervene`
- `rules` - generated from risk scanner output, supplemented manually if needed
- `alert_destination` - where alerts are sent (webhook, log file, admin panel)
- `intervention_actions` - what the agent does when intervening (pause, block, reroute)
- `escalation_threshold` - how many alerts in a time window before escalating severity

## Guardrail for the Guardrail

The guardrail agent itself should be monitored. Recommended practices:
- Log all guardrail decisions independently
- Do not give the guardrail agent write access to other agents' configurations
- Review guardrail logs weekly during the first month of operation

## Risk Profile Integration

After running the risk scanner, your `risk-profile.json` is automatically read by the guardrail agent to populate its rules. See [risk-scanner/output-schema.md](../../risk-scanner/output-schema.md) for the expected format.

If you update your codebase significantly, re-run the scanner and update the risk profile. The guardrail rules will update on next restart.
