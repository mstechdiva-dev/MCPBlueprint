# Composite Service Agent - Test Checklist

## 1. Multi-API Connectivity
- [ ] All services in the `services` list respond successfully
- [ ] Authentication for each service is accepted independently

## 2. Merge Behavior
- [ ] Response correctly combines data from all configured services
- [ ] The configured `merge_strategy` produces the expected output structure

## 3. Parallel vs Sequential
- [ ] If `parallel: true`, all service calls fire simultaneously
- [ ] Response time reflects parallel execution (not sum of all individual call times)

## 4. Partial Failure Handling
- [ ] If `partial_success: false`, one failed service causes the full call to fail gracefully
- [ ] If `partial_success: true`, partial results are returned with a clear indication of what failed

## 5. Guardrail Integration
- [ ] Guardrail receives logs of which services were called on each request
- [ ] A simulated call to an unlisted service triggers a guardrail alert
- [ ] Repeated failure of one service triggers the `failure_threshold` alert

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready.
