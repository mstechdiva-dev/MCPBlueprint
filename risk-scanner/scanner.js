#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CLI argument parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function hasFlag(flag) {
  return args.includes(flag);
}

const targetDir = getArg('--target') || process.cwd();
const outputPath = getArg('--output') || path.join(__dirname, 'output', 'risk-profile.json');
const skipCategory = getArg('--skip');
const verbose = hasFlag('--verbose');

// ─── Utilities ───────────────────────────────────────────────────────────────

const SCAN_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.java', '.cs', '.php',
  '.json', '.yaml', '.yml', '.env', '.toml', '.ini', '.cfg',
  '.sh', '.bash', '.zsh',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.cache',
  'vendor', '__pycache__', '.tox', 'venv', '.venv',
]);

function walkDir(dir, fileList = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return fileList;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, fileList);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      fileList.push(full);
    }
  }
  return fileList;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function relPath(filePath) {
  return path.relative(targetDir, filePath);
}

function addFinding(findings, category, severity, description, location, recommendation, guardrailRule) {
  findings.push({ category, severity, description, location, recommendation, guardrail_rule: guardrailRule });
  if (verbose) {
    const icons = { low: '⚪', medium: '🟡', high: '🟠', critical: '🔴' };
    console.log(`  ${icons[severity] || '●'} [${severity.toUpperCase()}] ${category}: ${description}`);
    console.log(`     Location: ${location}`);
  }
}

// ─── Rule: Data Exposure ──────────────────────────────────────────────────────

const PII_FIELD_PATTERNS = [
  /\b(email|phone|ssn|social_security|dob|date_of_birth|birthdate)\b/i,
  /\b(first_?name|last_?name|full_?name|address|zip_?code|postal_?code)\b/i,
  /\b(passport|driver_?license|national_?id)\b/i,
];

const CREDENTIAL_PATTERNS = [
  { re: /(['"`])[A-Za-z0-9+/]{32,}={0,2}\1/, label: 'base64-like token', sev: 'high' },
  { re: /api[_-]?key\s*[:=]\s*['"`][^'"`]{8,}['"`]/i, label: 'hardcoded API key', sev: 'critical' },
  { re: /secret\s*[:=]\s*['"`][^'"`]{8,}['"`]/i, label: 'hardcoded secret', sev: 'critical' },
  { re: /password\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/i, label: 'hardcoded password', sev: 'critical' },
  { re: /token\s*[:=]\s*['"`][A-Za-z0-9\-._~+/]{16,}['"`]/i, label: 'hardcoded token', sev: 'critical' },
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, label: 'private key in file', sev: 'critical' },
  { re: /AKIA[0-9A-Z]{16}/, label: 'AWS access key', sev: 'critical' },
  { re: /sk-[a-zA-Z0-9]{32,}/, label: 'OpenAI-style secret key', sev: 'critical' },
];

function checkDataExposure(filePath, content, findings) {
  const rel = relPath(filePath);
  const lines = content.split('\n');

  // Check for credential patterns (line-by-line)
  lines.forEach((line, i) => {
    // Skip env-var references - these are safe patterns
    if (/process\.env\.|env:[\w]+|os\.environ/i.test(line)) return;
    // Skip comments
    if (/^\s*(#|\/\/|\/\*)/.test(line)) return;

    for (const { re, label, sev } of CREDENTIAL_PATTERNS) {
      if (re.test(line)) {
        addFinding(findings, 'data-exposure', sev,
          `Possible ${label} found on line ${i + 1}`,
          `${rel}:${i + 1}`,
          'Move this value to an environment variable. Never commit credentials to source control.',
          'block_credential_exposure'
        );
        break; // one finding per line
      }
    }
  });

  // Check for PII field names in output-like contexts
  lines.forEach((line, i) => {
    if (/res\.json|response\.send|return.*payload|output\[/i.test(line)) {
      for (const pattern of PII_FIELD_PATTERNS) {
        if (pattern.test(line)) {
          addFinding(findings, 'data-exposure', 'medium',
            `PII field name in apparent output payload on line ${i + 1}`,
            `${rel}:${i + 1}`,
            'Verify that PII is intentionally included in this payload. Strip fields not required by the receiver.',
            'alert_on_pii_in_payload'
          );
          break;
        }
      }
    }
  });

  // Detect writes to paths that look unvalidated
  lines.forEach((line, i) => {
    if (/fs\.(write|append)FileSync?|open.*'w'|fopen.*w/i.test(line)) {
      if (!/allowed_paths|ALLOWED_PATH|whitelist/i.test(line)) {
        addFinding(findings, 'data-exposure', 'low',
          `File write operation without apparent path validation on line ${i + 1}`,
          `${rel}:${i + 1}`,
          'Ensure write paths are validated against an allowlist before writing.',
          'alert_on_undeclared_write_path'
        );
      }
    }
  });
}

// ─── Rule: API Scope ──────────────────────────────────────────────────────────

function checkApiScope(filePath, content, findings) {
  const rel = relPath(filePath);
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    // Skip env-var references
    if (/process\.env\.|env:[\w]+/i.test(line)) return;
    // Skip comments
    if (/^\s*(#|\/\/|\/\*)/.test(line)) return;

    // Hardcoded API keys / tokens in source
    for (const { re, label, sev } of CREDENTIAL_PATTERNS) {
      if (re.test(line)) {
        addFinding(findings, 'api-scope', sev,
          `${label} hardcoded in source on line ${i + 1}`,
          `${rel}:${i + 1}`,
          'Store credentials as environment variables, never in source files.',
          'block_hardcoded_credential'
        );
        return;
      }
    }

    // Write methods on endpoints declared as read-only
    if (/allowed_methods.*GET|method.*GET.*only/i.test(line)) {
      if (/POST|PUT|DELETE|PATCH/i.test(line)) {
        addFinding(findings, 'api-scope', 'high',
          `Write HTTP method appears alongside a read-only declaration on line ${i + 1}`,
          `${rel}:${i + 1}`,
          'Restrict this agent to GET only, or explicitly document why write access is needed.',
          'alert_on_write_to_readonly_endpoint'
        );
      }
    }

    // Admin / elevated scope flags
    if (/scope.*admin|role.*admin|admin.*scope/i.test(line) && !/check|verify|require|guard/i.test(line)) {
      addFinding(findings, 'api-scope', 'medium',
        `Elevated admin scope referenced without apparent check on line ${i + 1}`,
        `${rel}:${i + 1}`,
        'Verify that admin scope is explicitly required and guarded by a role check.',
        'alert_on_elevated_scope_usage'
      );
    }
  });

  // Check for endpoints called outside an allowed list (config files)
  if (path.extname(filePath) === '.json') {
    try {
      const parsed = JSON.parse(content);
      if (parsed.allowed_endpoints && Array.isArray(parsed.allowed_endpoints)) {
        // Config looks correct - nothing to flag here
      } else if (parsed.api_endpoint && !parsed.allowed_endpoints) {
        addFinding(findings, 'api-scope', 'medium',
          'API config defines api_endpoint but no allowed_endpoints list',
          rel,
          'Add an allowed_endpoints array to restrict which endpoints this agent can call.',
          'alert_on_unlisted_endpoint_call'
        );
      }
    } catch {
      // Not valid JSON, skip
    }
  }
}

// ─── Rule: Auth Patterns ──────────────────────────────────────────────────────

const AUTH_MIDDLEWARE_NAMES = [
  'authenticate', 'authorize', 'requireAuth', 'isAuthenticated',
  'authMiddleware', 'verifyToken', 'checkAuth', 'passport',
  'jwt', 'session', 'auth',
];

function checkAuthPatterns(filePath, content, findings) {
  const rel = relPath(filePath);
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    // Token in query string
    if (/[?&]token=|[?&]api_key=|[?&]access_token=/i.test(line)) {
      addFinding(findings, 'auth-patterns', 'medium',
        `Auth token passed as query string parameter on line ${i + 1}`,
        `${rel}:${i + 1}`,
        'Pass tokens in Authorization headers, not query strings. Query strings appear in logs and browser history.',
        'alert_on_token_in_query_string'
      );
    }

    // Bypassable session check patterns
    if (/skip.*auth|bypass.*auth|auth.*skip|no.*auth.*check/i.test(line) && !/comment|test|spec/i.test(filePath)) {
      addFinding(findings, 'auth-patterns', 'critical',
        `Potential auth bypass pattern detected on line ${i + 1}`,
        `${rel}:${i + 1}`,
        'Remove any conditional auth skip. Every request through this path should be authenticated.',
        'alert_on_unauthenticated_action'
      );
    }

    // Admin route without role check
    if (/route.*admin|app\.(get|post|put|delete).*\/admin/i.test(line)) {
      const surroundingLines = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      const hasRoleCheck = AUTH_MIDDLEWARE_NAMES.some(name =>
        new RegExp(name, 'i').test(surroundingLines)
      );
      if (!hasRoleCheck) {
        addFinding(findings, 'auth-patterns', 'critical',
          `Admin route defined without apparent auth middleware near line ${i + 1}`,
          `${rel}:${i + 1}`,
          'Add authentication and role verification middleware before all admin routes.',
          'alert_on_admin_action_without_role_check'
        );
      }
    }

    // Credentials shared across contexts
    if (/shared.*credential|global.*token|module.*exports.*token/i.test(line) && !/env/i.test(line)) {
      addFinding(findings, 'auth-patterns', 'medium',
        `Possible shared credential across contexts on line ${i + 1}`,
        `${rel}:${i + 1}`,
        'Each agent or service context should use its own scoped credentials, not a shared token.',
        'alert_on_unexpected_agent_activation'
      );
    }
  });
}

// ─── Rule: Loop Detection ─────────────────────────────────────────────────────

function checkLoopDetection(filePath, content, findings) {
  const rel = relPath(filePath);
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    // Unbounded while loops
    if (/while\s*\(\s*true\s*\)|while\s*1/i.test(line)) {
      const blockLines = lines.slice(i, i + 20).join('\n');
      const hasBreak = /break|return|throw/i.test(blockLines);
      if (!hasBreak) {
        addFinding(findings, 'loop-detection', 'high',
          `Potentially unbounded while(true) loop on line ${i + 1} with no visible exit condition`,
          `${rel}:${i + 1}`,
          'Add an explicit exit condition, max iteration count, or timeout to prevent runaway execution.',
          'alert_on_call_volume_spike'
        );
      }
    }

    // Retry without max limit
    if (/retry|setInterval|setTimeout.*\d+/i.test(line)) {
      const surroundingLines = lines.slice(Math.max(0, i - 2), i + 5).join('\n');
      if (!/max.*retry|retry.*limit|retry.*count|maxAttempts|MAX_RETRY/i.test(surroundingLines)) {
        if (/retry/i.test(line)) {
          addFinding(findings, 'loop-detection', 'high',
            `Retry pattern near line ${i + 1} without visible max-retry limit`,
            `${rel}:${i + 1}`,
            'Set an explicit maximum retry count. Unbounded retries can cause runaway loops.',
            'alert_on_repeated_failed_calls'
          );
        }
      }
    }

    // Polling without backoff
    if (/setInterval|poll|polling/i.test(line) && !/backoff|jitter|delay/i.test(line)) {
      const surroundingLines = lines.slice(Math.max(0, i - 2), i + 5).join('\n');
      if (!/backoff|jitter|exponential/i.test(surroundingLines)) {
        addFinding(findings, 'loop-detection', 'medium',
          `Polling pattern near line ${i + 1} without apparent backoff strategy`,
          `${rel}:${i + 1}`,
          'Add exponential backoff to polling loops to prevent hammering external services.',
          'alert_on_cascading_trigger'
        );
      }
    }

    // Cascading event re-trigger
    if (/emit|dispatch|trigger|publish/i.test(line)) {
      const fn = lines.slice(Math.max(0, i - 30), i).join('\n');
      if (/on\s*\(|addEventListener|subscribe/i.test(fn)) {
        const eventNameMatch = line.match(/emit\(['"`]([^'"`]+)['"`]/);
        const listenerMatch = fn.match(/on\(['"`]([^'"`]+)['"`]/);
        if (eventNameMatch && listenerMatch && eventNameMatch[1] === listenerMatch[1]) {
          addFinding(findings, 'loop-detection', 'critical',
            `Event handler on "${eventNameMatch[1]}" may emit the same event, creating an infinite loop near line ${i + 1}`,
            `${rel}:${i + 1}`,
            'Ensure event handlers do not emit the same event they listen to without a termination condition.',
            'alert_on_cascading_trigger'
          );
        }
      }
    }
  });

  // Detect silent failures: empty catch blocks
  const emptyOrSilentCatch = /catch\s*\([^)]*\)\s*\{\s*\}/g;
  let match;
  const fullContent = content;
  while ((match = emptyOrSilentCatch.exec(fullContent)) !== null) {
    const lineNum = fullContent.substring(0, match.index).split('\n').length;
    addFinding(findings, 'loop-detection', 'medium',
      `Empty catch block (silent failure) on line ${lineNum}`,
      `${rel}:${lineNum}`,
      'Log or surface errors from catch blocks. Silent failures hide broken dependencies.',
      'alert_on_silent_failures'
    );
  }
}

// ─── Risk level calculation ───────────────────────────────────────────────────

function calculateRiskLevel(findings) {
  const severities = new Set(findings.map(f => f.severity));
  if (severities.has('critical')) return 'critical';
  if (severities.has('high')) return 'high';
  if (severities.has('medium')) return 'medium';
  if (severities.has('low')) return 'low';
  return 'low';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const absTarget = path.resolve(targetDir);

  if (!fs.existsSync(absTarget)) {
    console.error(`Error: target directory not found: ${absTarget}`);
    process.exit(1);
  }

  console.log(`MCPBlueprint Risk Scanner`);
  console.log(`Target: ${absTarget}`);
  console.log(`Output: ${outputPath}`);
  if (skipCategory) console.log(`Skipping category: ${skipCategory}`);
  console.log('');

  const allFiles = walkDir(absTarget);
  console.log(`Scanning ${allFiles.length} files...`);
  if (verbose) console.log('');

  const findings = [];
  const skipped = new Set(skipCategory ? [skipCategory] : []);

  const ruleMap = {
    'data-exposure': checkDataExposure,
    'api-scope': checkApiScope,
    'auth-patterns': checkAuthPatterns,
    'loop-detection': checkLoopDetection,
  };

  for (const filePath of allFiles) {
    const content = readFileSafe(filePath);
    if (!content) continue;
    for (const [category, fn] of Object.entries(ruleMap)) {
      if (!skipped.has(category)) {
        fn(filePath, content, findings);
      }
    }
  }

  const riskLevel = calculateRiskLevel(findings);
  const generatedRules = new Set(findings.map(f => f.guardrail_rule));
  const BASELINE_RULES = 5; // must match BASELINE_RULES array length in agents/guardrail/agent.js

  const profile = {
    scan_date: new Date().toISOString(),
    target: absTarget,
    risk_level: riskLevel,
    findings,
    guardrail_rules_generated: generatedRules.size,
    baseline_rules_applied: BASELINE_RULES,
  };

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2), 'utf8');

  console.log('');
  console.log(`Scan complete.`);
  console.log(`  Risk level:       ${riskLevel.toUpperCase()}`);
  console.log(`  Total findings:   ${findings.length}`);
  console.log(`  Critical:         ${findings.filter(f => f.severity === 'critical').length}`);
  console.log(`  High:             ${findings.filter(f => f.severity === 'high').length}`);
  console.log(`  Medium:           ${findings.filter(f => f.severity === 'medium').length}`);
  console.log(`  Low:              ${findings.filter(f => f.severity === 'low').length}`);
  console.log(`  Rules generated:  ${generatedRules.size}`);
  console.log('');
  console.log(`Output saved to: ${outputPath}`);
  console.log('');
  console.log('Review findings before applying to your guardrail. Remove false positives from the');
  console.log('output file before the guardrail agent reads it on next start.');
}

main();
