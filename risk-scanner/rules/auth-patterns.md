# Rule: Auth Patterns

## What This Rule Checks

Whether agent actions are properly gated by authentication and authorization checks.

## What It Looks For

- Agent endpoints or actions reachable without an active authenticated session
- Admin-level operations accessible without role verification
- Auth tokens passed in query strings rather than headers
- Session validation that can be bypassed with a specific parameter or header
- Agents sharing auth credentials across contexts where they should each have their own

## Severity Levels

| Finding | Severity |
|---------|----------|
| Action reachable without auth | high |
| Admin action without role check | critical |
| Token in query string | medium |
| Bypassable session validation | critical |
| Shared credentials across contexts | medium |

## Guardrail Rules Generated

- `alert_on_unauthenticated_action`
- `alert_on_admin_action_without_role_check`
- `alert_on_token_in_query_string`
- `alert_on_unexpected_agent_activation`
