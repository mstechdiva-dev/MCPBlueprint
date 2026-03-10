# Risk Scanner

The risk scanner produces `risk-scanner/output/risk-profile.json` - the file committed to your repo before Vercel deployment. That risk profile becomes the source for your guardrail agent's rules on Vercel.

## Rule Categories

See [docs/risk-scanner.md](../docs/risk-scanner.md) for a full breakdown of what each category checks.

## After the Scan

Review findings before applying them to your guardrail. Edit the risk profile directly to remove false positives or add anything the scanner missed.

See [output-schema.md](output-schema.md) for the full output format.

---

> **Pre-deploy footnote (local, one-time):** The scanner runs locally before your first Vercel deploy. See [docs/getting-started.md](../docs/getting-started.md) for the full pre-deploy sequence.
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

## Output

Results are saved to `risk-scanner/output/risk-profile.json`

## Rule Categories

The scanner checks four categories:

- **data-exposure** - sensitive fields in payloads, unvalidated write paths
- **api-scope** - overly broad permissions, calls to unlisted endpoints
- **auth-patterns** - missing auth gates, admin access without session validation
- **loop-detection** - circular dependencies, unbounded retry patterns

See the `/rules` folder for full details on each category.

## After the Scan

Review findings before applying them to your guardrail. Edit the risk profile directly to remove false positives or add anything the scanner missed.

See [output-schema.md](output-schema.md) for the full output format.
