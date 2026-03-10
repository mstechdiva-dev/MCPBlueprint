# File Upload Specification

The admin panel accepts markdown file uploads to update agent definitions, add templates, and extend the risk scanner's rule set.

---

## Uploading an Agent Definition

File must be named exactly: `definition.md`

The file will replace the existing definition for the agent type matching the upload target selected in the panel.

Required sections in the file:
- `## What It Does` - plain description of the agent
- `## When to Use It` - conditions where this agent is appropriate
- `## When Not to Use It` - conditions where a different agent is better
- `## How It Works` - brief flow description
- `## Guardrail Considerations` - what the guardrail should watch for

Missing any required section will cause the upload to be rejected with a validation error listing what is missing.

---

## Uploading a Template

File must follow the naming pattern: `[platform-type]-template.md`

The file will be added to the `/templates` folder and appear in the templates list on the dashboard.

Required sections:
- `## Platform Type` - what kind of platform this template is for
- `## Recommended Agents` - which agents to activate for this platform type
- `## Starting Configuration` - key config values recommended for this platform type
- `## Risk Notes` - known risk areas for this platform type to watch

---

## Uploading a Risk Scanner Rule

File must be named: `[rule-name].md`

The file will be added to `risk-scanner/rules/` and included in the next scanner run.

Required sections:
- `## What This Rule Checks`
- `## What It Looks For`
- `## Severity Levels` - table format matching existing rules
- `## Guardrail Rules Generated` - list of rule identifiers this creates

---

## File Size Limit

Maximum upload size: 500KB per file. Agent definitions and rules should never approach this limit - if your file is large, it is probably doing too much.

---

## What Does Not Get Updated by Upload

- `config.example.json` files - edit these directly
- `test.md` files - edit these directly
- The risk profile output - re-run the scanner instead
- `config/platform.json` - edit directly or re-run onboarding
