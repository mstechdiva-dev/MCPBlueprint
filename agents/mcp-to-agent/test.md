# MCP-to-Agent - Test Checklist

## 1. Trigger
- [ ] The configured `trigger_tool` fires correctly when expected
- [ ] Output from the trigger tool is captured and passed to routing logic

## 2. Routing
- [ ] Each routing rule correctly identifies its condition and routes to the right sub-agent
- [ ] Output that matches no rule is routed to `fallback_agent`

## 3. Sub-Agent Handoff
- [ ] Each registered sub-agent receives its payload correctly
- [ ] Sub-agents process and complete their focused action without error

## 4. Guardrail Integration
- [ ] Handoff payloads are logged
- [ ] A simulated handoff to an unregistered agent triggers an alert
- [ ] A trigger frequency spike triggers an alert

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready.
