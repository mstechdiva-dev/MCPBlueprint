# Template: Sensitive Data Platform

## Platform Type

Platforms that handle PII, HR data, health records, financial data, or any other category where data exposure has legal or compliance implications.

## Recommended Agents

1. Guardrail - in Intervene mode (not just Alert)
2. Local Resource Access - read-only to start
3. Analytics Data Access - with strict metric allowlisting
4. Direct API Wrapper - only after careful scope review

## Starting Configuration

```json
{
  "agents": {
    "guardrail": { "active": true, "mode": "intervene" },
    "local-resource-access": { "active": true, "access_mode": "read" },
    "analytics-data-access": { "active": true },
    "direct-api-wrapper": { "active": false }
  }
}
```

Activate Direct API Wrapper only after reviewing its scope against your compliance requirements.

## Risk Notes

This template carries the highest risk profile of any starting configuration:

- Run the scanner on `data-exposure` and `auth-patterns` categories before activating any agent
- Guardrail should be in Intervene mode from day one - don't start with Alert only
- Any agent handling PII should have `require_audit_log: true`
- Review the risk profile with your compliance or legal team before going live if applicable
- Never allow write access in Local Resource Access until it has been explicitly reviewed and approved

## Onboarding Prompt Answers

- Platform type: `sensitive-data`
- Data sensitivity: `high`
- PII handled: `yes`
- Compliance frameworks applicable: list any that apply (GDPR, HIPAA, CCPA, etc.)
- External API access needed: answer carefully - minimize to what is truly required

## Additional Recommendation

After your first scan, re-run the scanner monthly. Sensitive data platforms accumulate scope creep faster than any other type - new features add new data paths, and those paths need to be reviewed regularly.
