import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Path resolution ──────────────────────────────────────────────────────────
// Supports both local and Vercel deployments. On Vercel, /tmp is writable.
// Prefer PLATFORM_CONFIG_PATH / RISK_PROFILE_PATH env vars when set.

const ROOT = path.join(__dirname, '..');

const CONFIG_PATH = process.env.PLATFORM_CONFIG_PATH
  || path.join(ROOT, 'config', 'platform.json');

const RISK_PROFILE_PATH = process.env.RISK_PROFILE_PATH
  || path.join(ROOT, 'risk-scanner', 'output', 'risk-profile.json');

const AGENTS_DIR = path.join(ROOT, 'agents');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const RULES_DIR = path.join(ROOT, 'risk-scanner', 'rules');

const UPLOAD_DIR = process.env.VERCEL
  ? '/tmp/mcpblueprint-uploads'
  : path.join(ROOT, 'risk-scanner', 'output');

const ALERT_WEBHOOK = process.env.GUARDRAIL_ALERT_WEBHOOK || null;
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

// ─── Multer (file uploads) ────────────────────────────────────────────────────

function sanitizeMarkdownFilename(originalname) {
  const base = path.basename(originalname);
  if (base !== originalname) return null; // contained path separators
  if (base.includes('..')) return null;
  if (!/^[a-zA-Z0-9._-]+\.md$/.test(base)) return null;
  return base;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeMarkdownFilename(file.originalname);
    if (!safeName) return cb(new Error('Invalid filename'));
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 },
  fileFilter: (req, file, cb) => {
    const safeName = sanitizeMarkdownFilename(file.originalname);
    if (!safeName) return cb(new Error('Only .md files with safe names are accepted'));
    cb(null, true);
  },
});

// ─── Optional auth gate ───────────────────────────────────────────────────────

function authGate(req, res, next) {
  if (!ADMIN_SECRET) return next();
  const provided = req.headers['x-admin-secret'];
  try {
    const expected = Buffer.from(ADMIN_SECRET);
    const received = Buffer.from(provided || '');
    if (expected.length === received.length && crypto.timingSafeEqual(expected, received)) return next();
  } catch { /* fall through to 401 */ }
  res.status(401).json({ error: 'Unauthorized. Set X-Admin-Secret header.' });
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return null; }
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function loadRiskProfile() {
  if (!fs.existsSync(RISK_PROFILE_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(RISK_PROFILE_PATH, 'utf8')); } catch { return null; }
}

function getAgentList() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

function getAgentStatus(config) {
  const agents = getAgentList();
  const configAgents = (config && config.agents) ? config.agents : {};
  return agents.map(name => ({
    name,
    active: configAgents[name] ? configAgents[name].active === true : false,
    mode: configAgents[name] ? configAgents[name].mode || null : null,
    hasDefinition: fs.existsSync(path.join(AGENTS_DIR, name, 'definition.md')),
    hasConfig: fs.existsSync(path.join(AGENTS_DIR, name, 'config.example.json')),
    hasTest: fs.existsSync(path.join(AGENTS_DIR, name, 'test.md')),
  }));
}

function validateUploadedDefinition(content) {
  const required = [
    '## What It Does',
    '## When to Use It',
    '## When Not to Use It',
    '## How It Works',
    '## Guardrail Considerations',
  ];
  const missing = required.filter(s => !content.includes(s));
  return missing;
}

// ─── Routes: API ──────────────────────────────────────────────────────────────

// Health check (no auth required)
app.get('/health', (req, res) => {
  const config = loadConfig();
  const profile = loadRiskProfile();
  res.json({
    status: 'healthy',
    service: 'mcpblueprint-admin',
    timestamp: new Date().toISOString(),
    checks: {
      config: config ? 'ok' : 'missing',
      risk_profile: profile ? 'ok' : 'missing',
      agents_dir: fs.existsSync(AGENTS_DIR) ? 'ok' : 'missing',
    },
    deployment: process.env.VERCEL ? 'vercel' : 'local',
  });
});

// Agents list
app.get('/api/agents', authGate, (req, res) => {
  const config = loadConfig();
  res.json(getAgentStatus(config));
});

// Toggle agent active state
app.post('/api/agents/:name/toggle', authGate, (req, res) => {
  const { name } = req.params;
  const agentList = getAgentList();
  if (!agentList.includes(name)) {
    return res.status(404).json({ error: `Agent "${name}" not found` });
  }
  let config = loadConfig();
  if (!config) config = { agents: {} };
  if (!config.agents) config.agents = {};
  const current = config.agents[name] ? config.agents[name].active : false;
  config.agents[name] = { ...(config.agents[name] || {}), active: !current };

  try {
    saveConfig(config);
    res.json({ name, active: !current });
  } catch (err) {
    res.status(500).json({ error: 'Could not save config. On Vercel, the filesystem is read-only after build. Use a writable config store or set PLATFORM_CONFIG_PATH to /tmp/platform.json.' });
  }
});

// Risk profile
app.get('/api/risk-profile', authGate, (req, res) => {
  const profile = loadRiskProfile();
  if (!profile) return res.status(404).json({ error: 'No risk profile found. Run the scanner first.' });
  res.json(profile);
});

// Platform config
app.get('/api/config', authGate, (req, res) => {
  const config = loadConfig();
  if (!config) return res.status(404).json({ error: 'No config found. Run onboarding first.' });
  res.json(config);
});

// File upload (definition.md, template, rule)
app.post('/api/upload', authGate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const filename = req.file.originalname;
  const content = fs.readFileSync(req.file.path, 'utf8');

  if (filename === 'definition.md') {
    const missing = validateUploadedDefinition(content);
    if (missing.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(422).json({ error: 'Validation failed', missing_sections: missing });
    }
    const target = req.body.agent_name;
    if (target && getAgentList().includes(target)) {
      const dest = path.join(AGENTS_DIR, target, 'definition.md');
      try {
        fs.copyFileSync(req.file.path, dest);
        fs.unlinkSync(req.file.path);
        return res.json({ message: `definition.md updated for agent: ${target}` });
      } catch {
        return res.status(500).json({ error: 'Could not write file. Check filesystem permissions.' });
      }
    }
    return res.status(400).json({ error: 'Provide agent_name in form body to target an agent.' });
  }

  if (filename.endsWith('-template.md')) {
    const dest = path.join(TEMPLATES_DIR, filename);
    try {
      fs.copyFileSync(req.file.path, dest);
      fs.unlinkSync(req.file.path);
      return res.json({ message: `Template saved: ${filename}` });
    } catch {
      return res.status(500).json({ error: 'Could not write template.' });
    }
  }

  // Assume risk scanner rule
  const dest = path.join(RULES_DIR, filename);
  try {
    fs.copyFileSync(req.file.path, dest);
    fs.unlinkSync(req.file.path);
    return res.json({ message: `Rule saved: ${filename}. It will be included in the next scanner run.` });
  } catch {
    return res.status(500).json({ error: 'Could not write rule file.' });
  }
});

// Dismiss a risk finding
app.delete('/api/risk-profile/findings/:index', authGate, (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const profile = loadRiskProfile();
  if (!profile) return res.status(404).json({ error: 'No risk profile found' });
  if (isNaN(idx) || idx < 0 || idx >= profile.findings.length) {
    return res.status(400).json({ error: 'Invalid finding index' });
  }
  profile.findings.splice(idx, 1);
  try {
    const dir = path.dirname(RISK_PROFILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RISK_PROFILE_PATH, JSON.stringify(profile, null, 2), 'utf8');
    res.json({ message: 'Finding dismissed' });
  } catch {
    res.status(500).json({ error: 'Could not update risk profile.' });
  }
});

// ─── Route: Dashboard (HTML) ──────────────────────────────────────────────────

app.get('/', authGate, (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(getDashboardHTML());
});

function getDashboardHTML() {
  const config = loadConfig();
  const profile = loadRiskProfile();
  const agentStatuses = getAgentStatus(config);

  const platformName = config ? config.platform_name : 'Not configured';
  const riskLevel = profile ? profile.risk_level : 'unknown';
  const scanDate = profile ? new Date(profile.scan_date).toLocaleString() : 'Never';
  const findingCount = profile ? profile.findings.length : 0;
  const criticalCount = profile ? profile.findings.filter(f => f.severity === 'critical').length : 0;
  const highCount = profile ? profile.findings.filter(f => f.severity === 'high').length : 0;

  const riskColors = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444', unknown: '#94a3b8' };
  const riskColor = riskColors[riskLevel] || riskColors.unknown;

  const activeCount = agentStatuses.filter(a => a.active).length;

  const agentCards = agentStatuses.map(agent => {
    const statusLabel = agent.active ? 'Active' : 'Inactive';
    const statusClass = agent.active ? 'active' : 'inactive';
    const modeTag = agent.mode ? `<span class="mode-tag">${agent.mode}</span>` : '';
    return `
      <div class="agent-card ${statusClass}" id="agent-${agent.name}">
        <div class="agent-header">
          <span class="agent-name">${agent.name}</span>
          ${modeTag}
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="agent-meta">
          ${agent.hasDefinition ? '<span class="chip">definition</span>' : ''}
          ${agent.hasConfig ? '<span class="chip">config</span>' : ''}
          ${agent.hasTest ? '<span class="chip">tests</span>' : ''}
        </div>
        <button class="toggle-btn" onclick="toggleAgent('${agent.name}', ${agent.active})">
          ${agent.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>`;
  }).join('\n');

  const findingRows = profile ? profile.findings.map((f, i) => {
    const sevClass = `sev-${f.severity}`;
    return `<tr>
      <td><span class="sev-badge ${sevClass}">${f.severity}</span></td>
      <td>${f.category}</td>
      <td>${escapeHtml(f.description)}</td>
      <td class="location">${escapeHtml(f.location)}</td>
      <td><button class="dismiss-btn" onclick="dismissFinding(${i})">Dismiss</button></td>
    </tr>`;
  }).join('\n') : '<tr><td colspan="5">No risk profile loaded. Run the scanner first.</td></tr>';

  const configJson = config
    ? escapeHtml(JSON.stringify(config, null, 2))
    : 'No configuration found. Run:\n  node admin-panel/onboarding.js';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MCPBlueprint Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
  header{background:#1e293b;border-bottom:1px solid #334155;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
  header h1{font-size:1.2rem;font-weight:700;color:#f8fafc}
  header span{font-size:.8rem;color:#94a3b8}
  nav{background:#1e293b;border-bottom:1px solid #334155;display:flex;gap:4px;padding:0 24px}
  nav button{background:none;border:none;color:#94a3b8;padding:12px 16px;cursor:pointer;font-size:.85rem;border-bottom:2px solid transparent;transition:all .15s}
  nav button:hover{color:#e2e8f0}
  nav button.active{color:#38bdf8;border-bottom-color:#38bdf8}
  main{padding:24px;max-width:1200px;margin:0 auto}
  .tab{display:none}.tab.active{display:block}
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:24px}
  .stat-card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px}
  .stat-card .label{font-size:.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
  .stat-card .value{font-size:1.8rem;font-weight:700;color:#f8fafc;margin-top:4px}
  .stat-card .sub{font-size:.75rem;color:#64748b;margin-top:2px}
  .risk-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.75rem;font-weight:600;color:#fff;background:${riskColor}}
  .agents-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
  .agent-card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;transition:border-color .15s}
  .agent-card.active{border-color:#22c55e44}
  .agent-card.inactive{border-color:#334155}
  .agent-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
  .agent-name{font-weight:600;color:#f8fafc;flex:1}
  .status-badge{font-size:.7rem;padding:2px 8px;border-radius:12px;font-weight:500}
  .status-badge.active{background:#dcfce7;color:#166534}
  .status-badge.inactive{background:#f1f5f9;color:#475569}
  .mode-tag{font-size:.7rem;padding:2px 6px;border-radius:4px;background:#0ea5e933;color:#38bdf8}
  .agent-meta{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
  .chip{font-size:.7rem;padding:2px 8px;border-radius:4px;background:#1e3a5f;color:#7dd3fc}
  .toggle-btn{background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;transition:background .15s}
  .toggle-btn:hover{background:#2563eb}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden}
  th{text-align:left;padding:10px 14px;font-size:.75rem;text-transform:uppercase;color:#94a3b8;background:#0f172a;border-bottom:1px solid #334155}
  td{padding:10px 14px;font-size:.82rem;border-bottom:1px solid #1e293b;vertical-align:top}
  tr:last-child td{border-bottom:none}
  td.location{font-family:monospace;font-size:.78rem;color:#94a3b8;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sev-badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:.72rem;font-weight:600;color:#fff}
  .sev-critical{background:#ef4444}.sev-high{background:#f97316}.sev-medium{background:#f59e0b;color:#000}.sev-low{background:#3b82f6}
  .dismiss-btn{background:none;border:1px solid #475569;color:#94a3b8;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:.75rem}
  .dismiss-btn:hover{border-color:#ef4444;color:#ef4444}
  pre{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;overflow-x:auto;font-size:.8rem;line-height:1.6;color:#94a3b8}
  .upload-form{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;max-width:520px}
  .upload-form h3{margin-bottom:16px;font-size:.95rem;color:#f8fafc}
  .form-group{margin-bottom:14px}
  .form-group label{display:block;font-size:.8rem;color:#94a3b8;margin-bottom:6px}
  .form-group input,.form-group select{width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:8px 10px;font-size:.85rem}
  .submit-btn{background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 18px;cursor:pointer;font-size:.85rem;font-weight:500}
  .submit-btn:hover{background:#2563eb}
  #upload-result{margin-top:12px;font-size:.82rem;padding:8px 12px;border-radius:6px;display:none}
  .result-ok{background:#dcfce7;color:#166534}.result-err{background:#fee2e2;color:#991b1b}
  .section-title{font-size:.85rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
  .alert-banner{background:#1e293b;border:1px solid #f59e0b44;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:.82rem;color:#fbbf24}
</style>
</head>
<body>
<header>
  <h1>MCPBlueprint Admin</h1>
  <span>${escapeHtml(platformName)} &nbsp;|&nbsp; Risk: <span class="risk-badge">${riskLevel.toUpperCase()}</span></span>
</header>
<nav>
  <button class="active" onclick="showTab('dashboard',this)">Dashboard</button>
  <button onclick="showTab('agents',this)">Agents</button>
  <button onclick="showTab('risk',this)">Risk</button>
  <button onclick="showTab('settings',this)">Settings</button>
</nav>
<main>

<!-- DASHBOARD TAB -->
<div id="tab-dashboard" class="tab active">
  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">Active Agents</div>
      <div class="value">${activeCount}</div>
      <div class="sub">of ${agentStatuses.length} available</div>
    </div>
    <div class="stat-card">
      <div class="label">Risk Level</div>
      <div class="value"><span class="risk-badge" style="font-size:1rem">${riskLevel.toUpperCase()}</span></div>
      <div class="sub">Last scan: ${scanDate}</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Findings</div>
      <div class="value">${findingCount}</div>
      <div class="sub">${criticalCount} critical · ${highCount} high</div>
    </div>
    <div class="stat-card">
      <div class="label">Guardrail</div>
      <div class="value" style="font-size:1rem">${agentStatuses.find(a => a.name === 'guardrail') ? (agentStatuses.find(a => a.name === 'guardrail').active ? '✓ Active' : '✗ Inactive') : 'N/A'}</div>
      <div class="sub">${config && config.guardrail_mode ? 'Mode: ' + config.guardrail_mode : ''}</div>
    </div>
  </div>

  ${!config ? '<div class="alert-banner">⚠ No platform config found. Run <code>node admin-panel/onboarding.js</code> to generate one.</div>' : ''}
  ${!profile ? '<div class="alert-banner">⚠ No risk profile found. Run <code>node risk-scanner/scanner.js --target /path/to/project</code> to generate one.</div>' : ''}

  <div class="section-title">Agent Status Overview</div>
  <div class="agents-grid">${agentCards}</div>
</div>

<!-- AGENTS TAB -->
<div id="tab-agents" class="tab">
  <div class="section-title" style="margin-bottom:16px">All Agents</div>
  <div class="agents-grid">${agentCards}</div>
</div>

<!-- RISK TAB -->
<div id="tab-risk" class="tab">
  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">Overall Risk</div>
      <div class="value"><span class="risk-badge" style="font-size:1rem">${riskLevel.toUpperCase()}</span></div>
    </div>
    <div class="stat-card">
      <div class="label">Last Scan</div>
      <div class="value" style="font-size:1rem">${scanDate}</div>
    </div>
    <div class="stat-card">
      <div class="label">Findings</div>
      <div class="value">${findingCount}</div>
    </div>
  </div>
  <div class="section-title">Findings</div>
  <table>
    <thead>
      <tr><th>Severity</th><th>Category</th><th>Description</th><th>Location</th><th></th></tr>
    </thead>
    <tbody id="findings-tbody">${findingRows}</tbody>
  </table>
</div>

<!-- SETTINGS TAB -->
<div id="tab-settings" class="tab">
  <div class="section-title">Upload File</div>
  <div class="upload-form">
    <h3>Upload Agent Definition / Template / Rule</h3>
    <form id="upload-form" onsubmit="uploadFile(event)">
      <div class="form-group">
        <label>File (.md only)</label>
        <input type="file" name="file" accept=".md" required/>
      </div>
      <div class="form-group">
        <label>Agent name (required when uploading definition.md)</label>
        <select name="agent_name">
          <option value="">- select agent -</option>
          ${agentStatuses.map(a => `<option value="${a.name}">${a.name}</option>`).join('\n')}
        </select>
      </div>
      <button type="submit" class="submit-btn">Upload</button>
    </form>
    <div id="upload-result"></div>
  </div>

  <div class="section-title" style="margin-top:28px">Current Configuration</div>
  <pre>${configJson}</pre>

  <div class="section-title" style="margin-top:28px">Environment</div>
  <pre>Deployment:      ${process.env.VERCEL ? 'Vercel' : 'Local'}
Config path:     ${CONFIG_PATH}
Risk profile:    ${RISK_PROFILE_PATH}
Alert webhook:   ${ALERT_WEBHOOK ? '(configured)' : '(not set)'}
Auth gate:       ${ADMIN_SECRET ? 'enabled' : 'disabled'}</pre>
</div>

</main>

<script>
function showTab(id, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

function toggleAgent(name, currentlyActive) {
  fetch('/api/agents/' + name + '/toggle', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if (data.error) { alert(data.error); return; }
      location.reload();
    })
    .catch(() => alert('Request failed'));
}

function dismissFinding(idx) {
  if (!confirm('Remove this finding from the risk profile?')) return;
  fetch('/api/risk-profile/findings/' + idx, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      if (data.error) { alert(data.error); return; }
      location.reload();
    })
    .catch(() => alert('Request failed'));
}

function uploadFile(e) {
  e.preventDefault();
  const form = document.getElementById('upload-form');
  const formData = new FormData(form);
  const result = document.getElementById('upload-result');
  result.style.display = 'none';

  fetch('/api/upload', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
      result.style.display = 'block';
      if (data.error) {
        result.className = 'result-err';
        result.textContent = data.error + (data.missing_sections ? ' Missing: ' + data.missing_sections.join(', ') : '');
      } else {
        result.className = 'result-ok';
        result.textContent = data.message;
        form.reset();
      }
    })
    .catch(() => {
      result.style.display = 'block';
      result.className = 'result-err';
      result.textContent = 'Upload failed - network error';
    });
}
</script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Start server (local) / export for Vercel ─────────────────────────────────

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`MCPBlueprint Admin Panel`);
    console.log(`Running at http://localhost:${PORT}`);
    console.log('');
    console.log('Press Ctrl+C to stop.');
  });
}

export default app;
