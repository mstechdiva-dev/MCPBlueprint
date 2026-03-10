# Configuration Use Agent - Test Checklist

## 1. Context Reading
- [ ] Agent correctly reads each configured `context_signals` value
- [ ] Signal values are accurately reflected in rule evaluation

## 2. Rule Evaluation
- [ ] Each config rule fires when its condition is met
- [ ] Rules do NOT fire when conditions are not met

## 3. Adjustment Scope
- [ ] Adjustments stay within the defined `adjustment_scope`
- [ ] Any attempt to adjust a setting outside scope is blocked and logged

## 4. Audit Log
- [ ] Every configuration change is logged with timestamp and context reason
- [ ] Logs are accessible from the admin panel

## 5. Stability
- [ ] Agent settles on a configuration and doesn't loop through adjustments repeatedly
- [ ] Rapid reconfiguration above the threshold triggers a guardrail alert

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready.
