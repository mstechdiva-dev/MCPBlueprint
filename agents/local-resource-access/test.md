# Local Resource Access Agent - Test Checklist

## 1. Allowed Path Access
- [ ] Agent successfully reads files within configured `allowed_paths`
- [ ] Access is denied for paths outside the allowed list

## 2. Excluded Paths
- [ ] Files in `excluded_paths` are inaccessible even if they fall within an allowed directory
- [ ] Exclusion applies to nested files within excluded directories

## 3. Access Mode Enforcement
- [ ] If `access_mode: read`, write attempts are blocked
- [ ] Write is only possible when explicitly set to `write` or `read-write`

## 4. Audit Logging
- [ ] Every access attempt is logged with path, timestamp, and agent identity
- [ ] Failed access attempts are also logged

## 5. Guardrail Integration
- [ ] Out-of-scope access triggers immediate guardrail alert
- [ ] Access to credential file patterns triggers immediate guardrail alert
- [ ] Write attempts in read-only mode trigger a guardrail alert

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready. Given the security sensitivity of this agent, all items must pass with zero exceptions.
