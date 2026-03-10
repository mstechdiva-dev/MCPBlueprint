/**
 * Configuration Use Agent
 *
 * Reads context signals from the request, evaluates configuration rules,
 * adjusts its own settings accordingly, then runs with the resolved config.
 *
 * Deployed as a Vercel serverless function.
 * Customize: edit CONTEXT_SIGNALS, CONFIG_RULES, and ADJUSTMENT_SCOPE for your platform.
 */

import { getCorrelationId, correlatedLogger } from '../../lib/correlation.js';
import { reportToGuardrail } from '../../lib/agent-bus.js';

const AGENT_ID = 'configuration-use';

// Default config - the baseline before any context-based adjustment
const DEFAULT_CONFIG = {
  rate_limit_per_minute: 30,
  timeout_ms: 5000,
  log_level: 'standard',    // 'minimal' | 'standard' | 'verbose'
  features_enabled: ['core'],
};

// Customize: which context signals the agent reads and how to extract them
const CONTEXT_SIGNALS = {
  userRole:     (req) => req.headers['x-user-role'] || 'standard',
  dataCategory: (req) => req.body?.data_category || 'general',
  systemLoad:   (req) => { const v = parseFloat(req.headers['x-system-load']); return isNaN(v) ? 0 : Math.max(0, Math.min(1, v)); },
};

// Customize: rules that map context conditions to config adjustments
// Rules are evaluated in order - last match wins for each field
const CONFIG_RULES = [
  {
    name: 'admin-user',
    condition: (ctx) => ctx.userRole === 'admin',
    adjustments: {
      rate_limit_per_minute: 100,
      timeout_ms: 15000,
      log_level: 'verbose',
      features_enabled: ['core', 'admin-tools'],
    },
  },
  {
    name: 'sensitive-data-category',
    condition: (ctx) => ctx.dataCategory === 'pii' || ctx.dataCategory === 'financial',
    adjustments: {
      log_level: 'minimal',    // Reduce logging to avoid sensitive data in logs
      features_enabled: ['core'], // Restrict features on sensitive data
    },
  },
  {
    name: 'high-system-load',
    condition: (ctx) => ctx.systemLoad > 0.8,
    adjustments: {
      rate_limit_per_minute: 10, // Throttle under load
      timeout_ms: 3000,          // Fail faster under load
    },
  },
];

// Customize: which config fields this agent is allowed to change on its own
const ADJUSTMENT_SCOPE = [
  'rate_limit_per_minute',
  'timeout_ms',
  'log_level',
  'features_enabled',
];

function resolveConfig(ctx, log) {
  const resolved = { ...DEFAULT_CONFIG };
  const appliedRules = [];

  for (const rule of CONFIG_RULES) {
    if (rule.condition(ctx)) {
      for (const [key, value] of Object.entries(rule.adjustments)) {
        if (ADJUSTMENT_SCOPE.includes(key)) {
          resolved[key] = value;
          appliedRules.push(rule.name);
        } else {
          log.warn(`rule "${rule.name}" tried to set out-of-scope field: ${key}`);
        }
      }
    }
  }

  return { resolved, appliedRules: [...new Set(appliedRules)] };
}

// Customize: replace this stub with your actual agent work
// The resolved config is passed in so the work runs under the adjusted settings
async function runAgentWork(req, config) {
  // e.g. call an API with config.timeout_ms as the abort timeout
  // e.g. check config.features_enabled before using a specific feature
  // e.g. use config.rate_limit_per_minute to throttle output

  return {
    message: 'Agent work completed',
    ran_with: config,
    // Customize: return your actual result here
  };
}

// Vercel serverless handler
export default async function handler(req, res) {
  const correlationId = getCorrelationId(req);
  const log = correlatedLogger(correlationId, AGENT_ID);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read context signals from the request
  const ctx = {};
  for (const [signal, extractor] of Object.entries(CONTEXT_SIGNALS)) {
    try {
      ctx[signal] = extractor(req);
    } catch {
      ctx[signal] = null;
    }
  }

  // Resolve adjusted config from context
  const { resolved: config, appliedRules } = resolveConfig(ctx, log);

  if (appliedRules.length > 0) {
    log.log('config adjusted - rules applied:', appliedRules.join(', '));
  }

  // Run agent work under the resolved config
  let result;
  try {
    result = await runAgentWork(req, config);
  } catch (err) {
    log.error('work error:', err.message);
    await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'config.work-error', silent_failure: false }, correlationId);
    return res.status(500).json({ error: 'Agent work failed' });
  }

  await reportToGuardrail({ agent_id: AGENT_ID, event_type: 'config.resolved', output: { applied_rules: appliedRules } }, correlationId);

  return res.status(200).json({
    success: true,
    context: ctx,
    applied_rules: appliedRules,
    config_used: config,
    result,
    correlation_id: correlationId,
  });
}
