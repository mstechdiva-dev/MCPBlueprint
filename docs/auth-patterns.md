# Authentication Patterns for MCP Agents

## Why Auth Lives in the Agent Layer

Most platforms handle authentication at the network or application level and assume that anything reaching an agent is already verified. That assumption is exactly what the risk scanner's auth-patterns rule is designed to catch.

In an agent system, requests can come from multiple sources - other agents, the MCP server, event triggers, the admin panel. Network-level auth doesn't distinguish between these. Agent-level auth does.

Every agent that touches internal or sensitive data should verify the request independently, at the point of access, every time.

---

## Three Auth Patterns MCPBlueprint Supports

### Pattern 1 - Bearer Token

The simplest and most common starting point. A token is attached to every request. The agent verifies the token before processing anything.

How it works:
```
Request arrives → Agent checks for Authorization header → 
Token validated → Request proceeds or fails immediately
```

When to use it:
- Internal tools and service-to-service communication
- Platforms where users authenticate once and the token is passed downstream
- Development and staging environments before OAuth is implemented

Key config fields:
```json
{
  "auth_method": "bearer_token",
  "token_source": "env:YOUR_API_TOKEN",
  "validate_on_every_call": true,
  "fail_behavior": "reject_immediately"
}
```

`validate_on_every_call: true` is not optional. Validating once at startup and trusting subsequent calls is a pattern the scanner flags as an auth gap.

---

### Pattern 2 - OAuth 2.0

More complex to implement but the right choice for any agent that acts on behalf of a user or accesses data scoped to a specific identity.

How it works:
```
User authenticates → OAuth provider issues token → 
Token scoped to user's permissions → Agent validates token and scope → 
Data access limited to what that user is allowed to see
```

When to use it:
- Agents that access user-specific data
- Multi-tenant platforms where different callers should see different data
- Any agent handling PII or regulated data
- Production deployments where audit trails matter

Key config fields:
```json
{
  "auth_method": "oauth2",
  "provider_endpoint": "env:OAUTH_PROVIDER_URL",
  "required_scopes": ["read:data", "write:records"],
  "token_expiry_check": true,
  "refresh_on_expiry": false
}
```

`refresh_on_expiry: false` is intentional for agents - automatic token refresh in an agent context can mask session problems. Let expired tokens fail and surface the error clearly.

---

### Pattern 3 - Scoped Data Access Per Agent

Beyond authenticating who is calling, scope what each agent is allowed to see. Two authenticated callers shouldn't necessarily see the same data.

How it works:
```
Caller authenticated → Agent checks caller's data scope → 
Query filtered to allowed data → Results returned within scope only
```

Example:
- An analytics agent authenticated as a reporting service should only see aggregate data, never individual records
- A search agent authenticated as a user should only return records that user has permission to view
- A monitoring agent should only read status fields, never configuration or credential fields

Key config fields:
```json
{
  "data_scope": {
    "allowed_tables": ["metrics", "status"],
    "denied_fields": ["credentials", "tokens", "pii_fields"],
    "row_filter": "tenant_id = :caller_tenant_id"
  }
}
```

This is the pattern the risk scanner's auth-patterns rule checks for most carefully on sensitive data platforms.

---

## What the Risk Scanner Looks For

The scanner flags these auth patterns as findings:

| Pattern | Severity |
|---------|----------|
| Agent action reachable without any auth check | high |
| Token validated at startup only, not per-call | medium |
| Admin-level operation without role verification | critical |
| Token or credential passed in query string rather than header | medium |
| Agent shares auth credentials with another agent | medium |
| No data scope defined for agents touching user data | high |

Each finding maps to a guardrail rule. See [risk-scanner/rules/auth-patterns.md](../risk-scanner/rules/auth-patterns.md) for the full rule set.

---

## Auth and the Guardrail Agent

The guardrail agent monitors auth behavior across all active agents. Baseline rules that are always active regardless of what the scanner finds:

- Alert on any agent action that executes without a logged auth check
- Alert on admin-level actions outside a verified session
- Block any token or credential string appearing in an agent output payload
- Alert on unexpected agent activation without a recorded auth event

If you are running in intervene mode, the guardrail blocks unauthenticated calls rather than just logging them.

---

## Audit Logging

Every auth event should produce a log entry. Not just failures - successes too. An audit trail of successful auth events is what lets you identify anomalies when something goes wrong.

Minimum fields per auth log entry:
- Timestamp
- Agent identity
- Caller identity (token ID or user ID, never the token value itself)
- Action attempted
- Auth result (success or failure with reason)
- Data scope applied

These logs are what your guardrail alert context is built from. Without them, an alert tells you something happened but not who triggered it or what they were trying to do.

---

## Auth Checklist

Before activating any agent that touches internal data:

- [ ] Auth check runs before any data access, every call
- [ ] Tokens sourced from environment variables, never hardcoded
- [ ] Data scope defined and enforced at the query level
- [ ] Admin operations require explicit role verification
- [ ] Auth events are logged with sufficient detail for audit
- [ ] Guardrail baseline auth rules are active
- [ ] Token expiry is handled explicitly - expired tokens fail clearly
