# Guardrail Agent - Test Checklist

The guardrail agent has the most thorough testing requirements. Do not skip steps.

## 1. Risk Profile Loading
- [ ] Guardrail reads `risk-profile.json` on startup without errors
- [ ] All generated rules from the risk profile are active
- [ ] All baseline rules are active

## 2. Alert Delivery
- [ ] A test alert successfully reaches the configured `alert_destination`
- [ ] Fallback alert destination works if primary fails

## 3. Baseline Rule Testing

Test each baseline rule individually by simulating the condition:

- [ ] A simulated agent-to-agent handoff is logged with timestamp
- [ ] A simulated silent failure triggers an alert
- [ ] Three identical failed calls in sequence trigger an alert
- [ ] A simulated scope violation triggers an alert
- [ ] A credential string in an agent output payload is blocked
- [ ] An unexpected agent activation triggers an alert

## 4. Platform Rule Testing

For each rule generated from the risk scanner:

- [ ] The condition that triggers the rule can be simulated
- [ ] The simulated condition fires the alert correctly
- [ ] The alert includes enough detail to diagnose the issue

## 5. Escalation

- [ ] Five alerts within ten minutes triggers escalation
- [ ] Escalation action (notify-admin or equivalent) executes correctly

## 6. Mode Verification

- [ ] If `mode: alert`, no intervention occurs - alerts only
- [ ] If `mode: intervene`, a triggered rule results in the configured intervention action

## 7. Guardrail Self-Logging
- [ ] All guardrail decisions are independently logged
- [ ] Logs are accessible from the admin panel

## Pass Criteria

All checkboxes above must pass. The guardrail agent is your last line of defense - it needs to work correctly before any other agent goes to production.
