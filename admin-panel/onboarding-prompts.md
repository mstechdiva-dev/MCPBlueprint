# MCPBlueprint Onboarding Prompt Flow

This document defines the questions the onboarding script asks and how the answers map to configuration output.

The script at `admin-panel/onboarding.js` generates `config/platform.json` - the configuration file committed to your repo before your first Vercel deploy. This is a one-time pre-deploy step, not a server-side operation.

Output is saved to `config/platform.json`.

> **Pre-deploy footnote:** Run this locally before your first Vercel deploy. See [docs/getting-started.md](../docs/getting-started.md) for the full pre-deploy sequence.
> ```bash
> node admin-panel/onboarding.js
> ```

---

## Question Set

### Section 1 - Platform Identity

**Q1: What is your platform name?**
- Free text input
- Maps to: `config.platform_name`
- Used in: admin panel display, alert messages

**Q2: What type of platform are you building?**
- Options: `api-consumer`, `data-pipeline`, `sensitive-data`, `monitoring`, `other`
- Maps to: `config.platform_type`
- Used in: template selection, default agent recommendations

**Q3: Briefly describe what your platform does (one or two sentences)**
- Free text input
- Maps to: `config.platform_description`
- Used in: admin panel display, documentation only - doesn't affect config logic

---

### Section 2 - Data Profile

**Q4: What level of data sensitivity does your platform handle?**
- Options: `low (public data only)`, `medium (internal data, no PII)`, `high (PII or regulated data)`
- Maps to: `config.data_sensitivity`
- Used in: guardrail mode recommendation, risk scanner priority categories

**Q5: Does your platform handle any of the following? (select all that apply)**
- Options: `personal identifiable information (PII)`, `financial records`, `health data`, `authentication credentials`, `none of the above`
- Maps to: `config.data_categories[]`
- Used in: guardrail rule set, scanner focus areas

**Q6: Does your platform write data to any external location (database, API, file system)?**
- Options: `yes`, `no`, `read-only`
- Maps to: `config.write_access_needed`
- Used in: agent scope recommendations, guardrail write-monitoring rules

---

### Section 3 - External Connections

**Q7: List the external APIs or services your platform connects to (comma separated)**
- Free text input
- Maps to: `config.external_services[]`
- Used in: Direct API Wrapper and Composite Service configuration stubs

**Q8: How many external API connections do you expect to have?**
- Options: `1`, `2-5`, `6 or more`
- Maps to: `config.api_connection_count`
- Used in: agent recommendations (Direct API Wrapper vs Composite Service)

---

### Section 4 - Agent Preferences

**Q9: Do you need agents to react to events in real time, or is scheduled/on-demand processing enough?**
- Options: `real-time events`, `scheduled`, `on-demand`, `mix of both`
- Maps to: `config.processing_model`
- Used in: Event-Driven agent recommendation

**Q10: Do you expect to run multiple agents that need to coordinate with each other?**
- Options: `yes`, `no`, `not sure`
- Maps to: `config.coordination_needed`
- Used in: Hierarchical MCP recommendation

**Q11: How would you like to start with guardrail monitoring?**
- Options: `alert only (recommended)`, `alert and intervene`
- Maps to: `config.guardrail_mode`
- Used in: guardrail agent configuration

---

## Output: config/platform.json

After answering all questions, the script generates:

```json
{
  "platform_name": "[your answer]",
  "platform_type": "[your answer]",
  "platform_description": "[your answer]",
  "data_sensitivity": "[your answer]",
  "data_categories": ["[your selections]"],
  "write_access_needed": "[your answer]",
  "external_services": ["[your list]"],
  "api_connection_count": "[your answer]",
  "processing_model": "[your answer]",
  "coordination_needed": "[your answer]",
  "guardrail_mode": "[your answer]",
  "recommended_agents": ["[generated from answers]"],
  "recommended_template": "[generated from answers]",
  "agents": {
    "guardrail": { "active": true, "mode": "[from Q11]" },
    "[recommended agents]": { "active": true }
  }
}
```

---

## How Recommendations Are Generated

| Condition | Recommendation |
|-----------|---------------|
| `api_connection_count = 1` | Direct API Wrapper |
| `api_connection_count = 2-5` | Composite Service |
| `processing_model = real-time` | Event-Driven |
| `coordination_needed = yes` | Hierarchical MCP |
| `data_sensitivity = high` | Local Resource Access + Guardrail in Intervene mode |
| `write_access_needed = yes` | Additional guardrail write-monitoring rules |
| `data_categories includes PII` | Sensitive Data template + scanner focus on data-exposure |

---

## Re-Running Onboarding

You can re-run the onboarding script at any time. It will ask if you want to overwrite the existing `config/platform.json` or create a new one. Re-running doesn't affect the risk profile or guardrail rules already in place - those update only when you re-run the scanner.
