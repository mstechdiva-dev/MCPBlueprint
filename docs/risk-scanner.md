# Risk Scanner

## What It Does

The risk scanner is a standalone agent that runs before your guardrail is configured. It analyzes your codebase and/or config files to identify real exposure areas - not a generic checklist, but findings based on what is actually in your project.

The output is a risk profile in JSON format. That profile becomes the source material for your guardrail agent's rules.

---

## Why This Exists

Most guardrail systems ask users to define their own rules. The problem is that users may not know what is actually at risk in their codebase. A developer building a data pipeline may not realize their agent has broader API scope than it needs. A team handling user data may not notice that one agent's output payload includes fields it shouldn't expose.

The scanner finds these things so the guardrail can be built around real findings.

---

## What It Scans

The scanner checks across four categories:

### 1. Data Exposure
- Are sensitive fields (PII, credentials, tokens) appearing in agent output payloads?
- Are there data paths that write to external locations without validation?
- Is any data persisted in a location outside the expected scope?

### 2. API Scope
- Do agents have broader API permissions than their defined task requires?
- Are there API calls to endpoints not listed in the agent's expected call list?
- Are any API keys or tokens hardcoded rather than pulled from environment variables?

### 3. Auth Patterns
- Are agent actions gated by authentication checks?
- Are admin-level actions accessible without a verified session?
- Are there endpoints the agent can reach that bypass standard auth flow?

### 4. Loop Detection
- Are there call patterns that could result in an agent triggering itself repeatedly?
- Are retry mechanisms bounded with a maximum attempt count?
- Are there circular dependencies between agents?

---

## Output Format

Results are saved to `risk-scanner/output/risk-profile.json`

See [output-schema.md](../risk-scanner/output-schema.md) for the full schema.

Example output:
```json
{
  "scan_date": "2026-03-07",
  "target": "./my-project",
  "risk_level": "medium",
  "findings": [
    {
      "category": "api-scope",
      "severity": "high",
      "description": "Agent has write access to endpoint that only requires read access",
      "location": "agents/data-agent/config.json",
      "recommendation": "Restrict API scope to read-only for this agent"
    }
  ],
  "guardrail_rules_generated": 4
}
```

---

## After the Scan

Review the findings before they are applied to your guardrail configuration. If a finding is a false positive, remove it from the risk profile before continuing. If you want to add a rule the scanner missed, add it manually following the schema in [output-schema.md](../risk-scanner/output-schema.md).

Once you are satisfied with the risk profile, the guardrail agent will use it to generate its active rule set automatically.

---

> **Pre-deploy footnote (local, one-time):** The scanner runs locally before your first Vercel deploy - not as part of ongoing Vercel operation. See [docs/getting-started.md](getting-started.md) for the full pre-deploy sequence.
>
> ```bash
> node risk-scanner/scanner.js --target /path/to/your/project
> ```
>
> Optional flags:
> ```
> --output /custom/path/risk-profile.json   Change output location
> --skip data-exposure                       Skip a specific rule category
> --verbose                                  Show detailed findings in terminal
> ```
