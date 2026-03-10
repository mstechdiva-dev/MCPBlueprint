# Rule: API Scope

## What This Rule Checks

Whether agents have broader API access than their defined task requires.

## What It Looks For

- HTTP methods (POST, PUT, DELETE) granted to agents that only need GET
- API endpoints accessible to an agent that are not listed in its `allowed_endpoints`
- Hardcoded API keys or tokens in source files rather than environment variables
- API permissions that include admin or elevated scopes not needed for the agent's function

## Severity Levels

| Finding | Severity |
|---------|----------|
| Write method granted to read-only agent | high |
| Unlisted endpoint accessible | medium |
| Hardcoded credential in source file | critical |
| Elevated API scope not needed | medium |

## Guardrail Rules Generated

- `alert_on_write_to_readonly_endpoint`
- `alert_on_unlisted_endpoint_call`
- `block_hardcoded_credential`
- `alert_on_elevated_scope_usage`
