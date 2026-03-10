# Direct API Wrapper - Test Checklist

Run through these steps after activating this agent to confirm it is working correctly.

---

## 1. Basic Connectivity

- [ ] Agent successfully reaches the configured `api_endpoint`
- [ ] Authentication is accepted (no 401 or 403 responses)
- [ ] A test GET request returns expected data structure

## 2. Scope Enforcement

- [ ] Attempting to call an endpoint NOT in `allowed_endpoints` returns an error or is blocked
- [ ] Attempting to use a method NOT in `allowed_methods` (e.g. DELETE) is rejected

## 3. Timeout and Retry

- [ ] Simulating a slow response triggers timeout at the configured `timeout_ms`
- [ ] On failure, the agent retries up to `retry_limit` times
- [ ] After exhausting retries, the agent surfaces a clear error rather than silently failing

## 4. Guardrail Integration

- [ ] Guardrail agent is receiving activity logs from this agent
- [ ] A simulated call volume spike triggers an alert in the guardrail
- [ ] No auth credentials appear in logged response payloads

## 5. Error Handling

- [ ] A 500 response from the external API is handled gracefully
- [ ] A network timeout is handled gracefully
- [ ] Errors are logged with enough detail to diagnose the issue

---

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready.
