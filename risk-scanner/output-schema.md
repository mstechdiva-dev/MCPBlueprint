# Risk Scanner Output Schema

The scanner produces a JSON file at `risk-scanner/output/risk-profile.json`

---

## Top-Level Fields

```json
{
  "scan_date": "string - ISO date of when the scan ran",
  "target": "string - path that was scanned",
  "risk_level": "string - overall risk level: low | medium | high | critical",
  "findings": [ ...array of finding objects... ],
  "guardrail_rules_generated": "integer - number of rules auto-generated from findings",
  "baseline_rules_applied": "integer - number of baseline rules always active"
}
```

---

## Finding Object

```json
{
  "category": "string - data-exposure | api-scope | auth-patterns | loop-detection",
  "severity": "string - low | medium | high | critical",
  "description": "string - plain language description of what was found",
  "location": "string - file path or config section where the issue was found",
  "recommendation": "string - suggested fix",
  "guardrail_rule": "string - the rule identifier this finding maps to in the guardrail config"
}
```

---

## Risk Level Calculation

Overall `risk_level` is determined by the highest severity finding:

| Highest Finding Severity | Overall Risk Level |
|--------------------------|-------------------|
| low only | low |
| medium (no high/critical) | medium |
| high (no critical) | high |
| any critical | critical |

---

## Manually Adding a Finding

If the scanner missed something you know is a risk, add it to the findings array following the schema above. The guardrail agent will include it in its rule set on next startup.

---

## Removing a False Positive

Delete the finding object from the array and save the file. The guardrail agent won't generate a rule for it on next startup.
