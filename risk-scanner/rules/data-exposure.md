# Rule: Data Exposure

## What This Rule Checks

Whether sensitive data is appearing in places it shouldn't - agent output payloads, logs, error messages, or external responses.

## What It Looks For

- Field names commonly associated with PII: `email`, `phone`, `ssn`, `dob`, `address`, `name` combined with identifiers
- Token and credential patterns: strings matching common API key formats, bearer tokens, password fields
- Write operations to paths outside the project's defined data output locations
- Response payloads that include more fields than the requesting agent declared it needed

## Severity Levels

| Finding | Severity |
|---------|----------|
| PII field name in output payload | medium |
| Actual PII value pattern detected in payload | high |
| Credential string pattern in output | critical |
| Write to undeclared external path | high |
| Broader response fields than declared | low |

## Guardrail Rules Generated

- `alert_on_pii_in_payload`
- `block_credential_exposure`
- `alert_on_undeclared_write_path`
- `alert_on_payload_scope_excess`

## False Positive Notes

Field names alone (like `name` or `email`) in internal processing objects are not necessarily a risk - context matters. Review medium-severity findings here carefully before applying them as rules.
