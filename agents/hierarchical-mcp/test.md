# Hierarchical MCP Agent - Test Checklist

## 1. Domain Agent Registration
- [ ] All agents in `domain_agents` are reachable from the coordinator
- [ ] Each domain agent responds to a test handoff correctly

## 2. Routing
- [ ] Each routing rule correctly identifies task type and routes to the right domain agent
- [ ] Tasks with no matching rule are handled gracefully (error, fallback, or log)

## 3. Output Merging
- [ ] If `merge_output: true`, results from domain agents are correctly combined
- [ ] Merged output structure is consistent and predictable

## 4. Scope Enforcement
- [ ] Coordinator cannot route to agents outside `domain_agents`
- [ ] Any bypass attempt triggers a guardrail alert

## 5. Coordination Logging
- [ ] Every routing decision is logged with task type, destination agent, and timestamp
- [ ] Logs are accessible from the admin panel

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready.
