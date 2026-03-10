/**
 * Local Resource Access Agent
 *
 * Provides strictly scoped, access-controlled reads (and optionally writes)
 * to local files and resources. Every access is logged regardless of config.
 *
 * Deployed as a Vercel serverless function.
 * Customize: edit ALLOWED_PATHS, EXCLUDED_PATHS, and ACCESS_MODE.
 *
 * Security note: this is the highest-risk agent type. Review path definitions
 * carefully before deploying. Default is read-only.
 */

import fs from 'fs';
import path from 'path';
import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { reportToGuardrail } from '../../lib/agent-bus.js';

const AGENT_ID = 'local-resource-access';

// Customize: directories or files this agent is permitted to access
// Use absolute paths. Vercel's writable area is /tmp.
const ALLOWED_PATHS = [
  path.join(process.cwd(), 'config'),                // Platform config files
  path.join(process.cwd(), 'risk-scanner/output'),   // Risk profile output
  '/tmp/agent-workspace',                             // Writable scratch space
];

// Customize: paths blocked even if they fall inside an ALLOWED_PATH
const EXCLUDED_PATHS = [
  '.env',
  '.env.local',
  'config/secrets',
  // Add any credential files, key files, or system config here
];

// Customize: 'read' | 'write' | 'read-write'
const ACCESS_MODE = 'read';

const INTERNAL_TOKEN = process.env.INTERNAL_AGENT_TOKEN;

if (!INTERNAL_TOKEN) {
  throw new Error('[local-resource-access] INTERNAL_AGENT_TOKEN env var is required');
}

// ─── Access control ─────────────────────────────────────────────────────────

function isPathAllowed(requestedPath) {
  const resolved = path.resolve(requestedPath);

  // Check against excluded patterns first
  for (const excluded of EXCLUDED_PATHS) {
    if (resolved.includes(excluded)) return false;
  }

  // Check against credential/key file patterns - always blocked
  if (/\.(pem|key|p12|pfx|crt)$|id_rsa|id_ed25519/.test(resolved)) return false;

  // Must fall within at least one allowed path, using a boundary-safe check
  return ALLOWED_PATHS.some((allowed) => {
    const allowedResolved = path.resolve(allowed);
    const relative = path.relative(allowedResolved, resolved);
    if (path.isAbsolute(relative)) return false;
    if (relative === '') return true; // exact match
    return !relative.startsWith('..');
  });
}

function canWrite() {
  return ACCESS_MODE === 'write' || ACCESS_MODE === 'read-write';
}

// ─── Audit logging ───────────────────────────────────────────────────────────
// Logs every access attempt regardless of REQUIRE_AUDIT_LOG - never rely on
// config alone for security logging (per the agent definition).

function auditLog(action, requestedPath, allowed, log, detail = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    agent: 'local-resource-access',
    action,
    path: requestedPath,
    allowed,
    detail,
  };
  log.log('AUDIT:', JSON.stringify(entry));
}

// ─── File operations ─────────────────────────────────────────────────────────

function readFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Guard: never return content that looks like credentials
  if (/api[_-]?key\s*[:=]\s*\S+|password\s*[:=]\s*\S+/i.test(content)) {
    throw new Error('File content matches credential pattern - access blocked');
  }
  return content;
}

function writeFile(filePath, content) {
  // Restrict writes to /tmp - never write outside it
  if (!filePath.startsWith('/tmp')) {
    throw new Error('Write operations are restricted to /tmp');
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// ─── Vercel serverless handler ───────────────────────────────────────────────

export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);

  // Verify internal caller
  if (!INTERNAL_TOKEN || req.headers['authorization'] !== `Bearer ${INTERNAL_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, path: requestedPath, content } = req.body || {};

  if (!action || !requestedPath) {
    return res.status(400).json({ error: 'action and path are required' });
  }

  // Access control check - logged regardless of outcome
  const allowed = isPathAllowed(requestedPath);
  auditLog(action, requestedPath, allowed, log);

  if (!allowed) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (action === 'read') {
    try {
      const fileContent = readFile(requestedPath);
      await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'file.read', accessed_resource: requestedPath, allowed_resources: ALLOWED_PATHS }, correlationId);
      log.log('read:', requestedPath);
      return res.status(200).json({ success: true, path: requestedPath, content: fileContent, correlation_id: correlationId });
    } catch (err) {
      auditLog('read-error', requestedPath, true, log, err.message);
      return res.status(500).json({ error: 'Read failed' });
    }
  }

  if (action === 'write') {
    if (!canWrite()) {
      auditLog('write-denied', requestedPath, false, log, 'access_mode is read-only');
      await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'file.write-denied', accessed_resource: requestedPath }, correlationId);
      return res.status(403).json({ error: 'Write access not enabled for this agent' });
    }
    if (!content) {
      return res.status(400).json({ error: 'content is required for write action' });
    }
    try {
      writeFile(requestedPath, content);
      auditLog('write-success', requestedPath, true, log);
      await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'file.write', accessed_resource: requestedPath, allowed_resources: ALLOWED_PATHS }, correlationId);
      log.log('write:', requestedPath);
      return res.status(200).json({ success: true, path: requestedPath, correlation_id: correlationId });
    } catch (err) {
      auditLog('write-error', requestedPath, true, log, err.message);
      return res.status(500).json({ error: 'Write failed' });
    }
  }

  if (action === 'list') {
    try {
      if (!isPathAllowed(requestedPath)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const entries = fs.readdirSync(requestedPath);
      log.log('list:', requestedPath);
      return res.status(200).json({ success: true, path: requestedPath, entries, correlation_id: correlationId });
    } catch (err) {
      return res.status(500).json({ error: 'List failed' });
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}. Supported: read, write, list` });
}
