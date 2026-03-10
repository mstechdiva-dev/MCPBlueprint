# Production Deployment

## Before You Deploy

The test checklist in each agent folder is the minimum bar. Before any agent goes to production, three additional things need to be true:

1. The risk scanner has run against your production codebase - not a local copy, not staging
2. The guardrail agent is active and its alerts are reaching a destination someone actually monitors
3. At least one full end-to-end test has run with production credentials in a staging environment

If any of these are not true, you're not ready to deploy.

---

## Health Checks

Every active agent should expose a health check endpoint. Not for users - for your infrastructure. Load balancers, monitoring tools, and the guardrail agent itself use health checks to know whether an agent is responsive.

A health check should verify:
- The agent process is running
- Its connection to any external API or data source is alive
- Its auth configuration is valid (token present and not expired)
- The guardrail agent is receiving its activity logs

A health check that only confirms the process is running is not a health check - it is a heartbeat. Build real health checks that validate dependencies, not just uptime.

Health check response format:
```json
{
  "status": "healthy",
  "agent": "your-agent-name",
  "timestamp": "2026-03-07T10:00:00Z",
  "checks": {
    "process": "ok",
    "external_api": "ok",
    "auth": "ok",
    "guardrail_connection": "ok"
  }
}
```

If any check fails, return status `degraded` or `unhealthy` with the specific failing check identified. Do not return a generic error - the guardrail needs to know what specifically broke.

---

## Logging

Production agents need structured logs. Not `console.log` - structured JSON logs that can be parsed, filtered, and searched.

Every log entry should include:
- Timestamp (ISO 8601)
- Agent name and version
- Log level (info, warn, error)
- Action being performed
- Caller identity (never the credential itself)
- Result or error detail
- Duration in milliseconds

What to log at each level:

**Info** - normal operations worth having a record of
- Successful tool calls with duration
- Auth validations
- Agent activation and deactivation events
- Configuration changes

**Warn** - things that did not fail but should be looked at
- Retry attempts
- Slow responses above a defined threshold
- Approaching rate limits
- Unexpected but handled input

**Error** - things that failed and need attention
- Auth failures
- Unhandled exceptions
- Dependency connection failures
- Guardrail rule triggers

Do not log at error level for things that are not errors. Alert fatigue is real - if everything is an error, nothing is.

---

## Audit Trail

Separate from operational logs, sensitive data platforms need an audit trail. The audit trail answers a different question than logs do.

Logs answer: what did the system do and did it work?
Audit trail answers: who accessed what data, when, and why?

Audit entries should be:
- Written to a separate, append-only store
- Never modified after writing
- Retained according to your compliance requirements
- Accessible only to authorized reviewers - not to the agents themselves

Minimum fields per audit entry:
- Timestamp
- Agent identity
- Caller identity
- Data accessed (table, record type - not the record contents)
- Action taken (read, write, delete)
- Auth scope applied
- Request outcome

The guardrail agent feeds the audit trail. Every agent-to-agent handoff, every scope check, every auth event it monitors produces an audit entry. This is not optional for platforms handling PII, financial data, or regulated information.

---

## Environment Configuration

Production agents should never have credentials, endpoints, or configuration values hardcoded. Everything environment-specific goes in environment variables.

What goes in environment variables:
- API keys and tokens
- Database connection strings
- External service endpoints
- Auth provider URLs
- Alert webhook URLs

What goes in config files committed to the repo:
- Agent behavior settings (timeout values, retry limits, rate limits)
- Guardrail rule identifiers
- Feature flags
- Logging levels

Never commit a `.env` file. The local resource access agent's excluded paths should always include `.env` and any file matching credential patterns. The risk scanner's data-exposure rule flags hardcoded credentials as critical severity findings.

**Vercel deployments:** All environment variables listed in `.env.example` must be set in your Vercel project's Environment Variables dashboard before deploying. The admin panel reads these at runtime via `process.env`. The preferred path for all sensitive configuration is Vercel environment variables - not committed config files. See [admin-panel/README.md](../admin-panel/README.md) for the full variable list.

---

## Deployment Checklist

Work through this before pushing any agent to production:

**Pre-deployment**
- [ ] Risk scanner has run against production codebase
- [ ] All critical and high severity findings resolved or explicitly accepted with documented reason
- [ ] Guardrail agent active with alert destination confirmed working
- [ ] All agent test.md checklists completed

**Configuration**
- [ ] No credentials or tokens in committed code
- [ ] All environment variables set in production environment
- [ ] Auth validated against production auth provider
- [ ] Data scope verified against production data

**Observability**
- [ ] Health check endpoints responding correctly
- [ ] Structured logging confirmed working
- [ ] Audit trail writing to correct destination
- [ ] Guardrail alerts reaching monitoring destination

**Go-live**
- [ ] One full end-to-end test with production credentials in staging
- [ ] Rollback plan documented - how do you deactivate an agent quickly if something goes wrong?
- [ ] On-call contact identified for first 48 hours after deployment

---

## Rollback

Know before you deploy how you will roll back if something goes wrong. For MCPBlueprint agents, rollback is straightforward:

1. Set the agent's `active` field to `false` in `config/platform.json`
2. Restart the admin panel
3. The guardrail agent continues running and logs the deactivation event

No agent should be so deeply integrated into your platform that you cannot deactivate it independently. If an agent is that critical, that is a design problem to solve before deployment - not after.

---

## After Deployment

The work doesn't stop at deployment. Production agents need ongoing attention:

- Review guardrail alerts weekly for the first month
- Re-run the risk scanner after any significant code change
- Review auth logs monthly for anomalies
- Update agent definitions when behavior changes - don't let the documentation drift from the implementation
- Check health check logs for patterns - a health check that intermittently fails is a warning sign worth investigating before it becomes an outage
