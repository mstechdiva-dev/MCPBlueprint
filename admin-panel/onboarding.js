#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'platform.json');

// ─── Question definitions ────────────────────────────────────────────────────

const QUESTIONS = [
  // Section 1 - Platform Identity
  {
    key: 'platform_name',
    section: 'Platform Identity',
    prompt: 'Q1: What is your platform name?',
    type: 'text',
  },
  {
    key: 'platform_type',
    section: null,
    prompt: 'Q2: What type of platform are you building?',
    type: 'choice',
    choices: ['api-consumer', 'data-pipeline', 'sensitive-data', 'monitoring', 'other'],
  },
  {
    key: 'platform_description',
    section: null,
    prompt: 'Q3: Briefly describe what your platform does (one or two sentences):',
    type: 'text',
  },

  // Section 2 - Data Profile
  {
    key: 'data_sensitivity',
    section: 'Data Profile',
    prompt: 'Q4: What level of data sensitivity does your platform handle?',
    type: 'choice',
    choices: ['low (public data only)', 'medium (internal data, no PII)', 'high (PII or regulated data)'],
  },
  {
    key: 'data_categories',
    section: null,
    prompt: 'Q5: Does your platform handle any of the following? (comma-separated numbers, or "none")',
    type: 'multi',
    choices: [
      'personal identifiable information (PII)',
      'financial records',
      'health data',
      'authentication credentials',
      'none of the above',
    ],
  },
  {
    key: 'write_access_needed',
    section: null,
    prompt: 'Q6: Does your platform write data to any external location (database, API, file system)?',
    type: 'choice',
    choices: ['yes', 'no', 'read-only'],
  },

  // Section 3 - External Connections
  {
    key: 'external_services',
    section: 'External Connections',
    prompt: 'Q7: List the external APIs or services your platform connects to (comma-separated, or "none"):',
    type: 'list',
  },
  {
    key: 'api_connection_count',
    section: null,
    prompt: 'Q8: How many external API connections do you expect to have?',
    type: 'choice',
    choices: ['1', '2-5', '6 or more'],
  },

  // Section 4 - Agent Preferences
  {
    key: 'processing_model',
    section: 'Agent Preferences',
    prompt: 'Q9: Do you need agents to react to events in real time, or is scheduled/on-demand enough?',
    type: 'choice',
    choices: ['real-time events', 'scheduled', 'on-demand', 'mix of both'],
  },
  {
    key: 'coordination_needed',
    section: null,
    prompt: 'Q10: Do you expect to run multiple agents that need to coordinate with each other?',
    type: 'choice',
    choices: ['yes', 'no', 'not sure'],
  },
  {
    key: 'guardrail_mode',
    section: null,
    prompt: 'Q11: How would you like to start with guardrail monitoring?',
    type: 'choice',
    choices: ['alert only (recommended)', 'alert and intervene'],
  },
];

// ─── Recommendation engine ───────────────────────────────────────────────────

function buildRecommendations(answers) {
  const recommended = new Set(['guardrail']);

  if (answers.api_connection_count === '1') recommended.add('direct-api-wrapper');
  if (['2-5', '6 or more'].includes(answers.api_connection_count)) recommended.add('composite-service');
  if (answers.processing_model === 'real-time events') recommended.add('event-driven');
  if (answers.processing_model === 'mix of both') {
    recommended.add('event-driven');
    recommended.add('direct-api-wrapper');
  }
  if (answers.coordination_needed === 'yes') recommended.add('hierarchical-mcp');
  if (answers.data_sensitivity === 'high') {
    recommended.add('local-resource-access');
  }
  if (answers.data_categories && answers.data_categories.some(c => c.includes('PII') || c.includes('health') || c.includes('financial'))) {
    recommended.add('local-resource-access');
  }

  // Template recommendation
  let template = 'minimal-setup';
  if (answers.platform_type === 'api-consumer') template = 'api-platform';
  if (answers.platform_type === 'data-pipeline') template = 'data-pipeline';
  if (answers.platform_type === 'sensitive-data') template = 'hr-sensitive';
  if (answers.data_sensitivity === 'high') template = 'hr-sensitive';

  return { recommended: [...recommended], template };
}

function buildAgentsBlock(recommendations, guardrailMode) {
  const agents = {
    guardrail: {
      active: true,
      mode: guardrailMode.startsWith('alert and') ? 'intervene' : 'alert',
    },
  };
  for (const agent of recommendations) {
    if (agent === 'guardrail') continue;
    agents[agent] = { active: true };
  }
  return agents;
}

// ─── I/O helpers ─────────────────────────────────────────────────────────────

function printHeader() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║      MCPBlueprint Onboarding Flow          ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  Answer 11 questions about your platform.  ║');
  console.log('║  Your config will be saved automatically.  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
}

function printSection(title) {
  console.log('');
  console.log(`── ${title} ─────────────────────────────`);
}

function printChoices(choices) {
  choices.forEach((c, i) => console.log(`  [${i + 1}] ${c}`));
}

async function askQuestion(rl, q) {
  return new Promise(resolve => {
    if (q.section) printSection(q.section);
    console.log('');
    console.log(q.prompt);

    if (q.type === 'choice') {
      printChoices(q.choices);
      rl.question('Enter number: ', answer => {
        const idx = parseInt(answer.trim(), 10) - 1;
        if (idx >= 0 && idx < q.choices.length) {
          console.log(`  → ${q.choices[idx]}`);
          resolve(q.choices[idx]);
        } else {
          console.log('  Invalid choice. Defaulting to first option.');
          resolve(q.choices[0]);
        }
      });
    } else if (q.type === 'multi') {
      printChoices(q.choices);
      rl.question('Enter numbers (comma-separated) or "none": ', answer => {
        const raw = answer.trim().toLowerCase();
        if (raw === 'none') {
          resolve(['none of the above']);
          return;
        }
        const indices = raw.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => i >= 0 && i < q.choices.length);
        const selected = indices.length > 0 ? indices.map(i => q.choices[i]) : ['none of the above'];
        console.log(`  → ${selected.join(', ')}`);
        resolve(selected);
      });
    } else if (q.type === 'list') {
      rl.question('Answer: ', answer => {
        const raw = answer.trim().toLowerCase();
        if (raw === 'none' || !raw) {
          resolve([]);
        } else {
          resolve(answer.split(',').map(s => s.trim()).filter(Boolean));
        }
      });
    } else {
      rl.question('Answer: ', answer => {
        resolve(answer.trim() || '(not specified)');
      });
    }
  });
}

async function confirmOverwrite(rl) {
  return new Promise(resolve => {
    rl.question(`config/platform.json already exists. Overwrite it? [y/N] `, answer => {
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printHeader();

  if (fs.existsSync(CONFIG_PATH)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const overwrite = await confirmOverwrite(rl);
    rl.close();
    if (!overwrite) {
      console.log('\nOnboarding cancelled. Existing config preserved.');
      process.exit(0);
    }
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answers = {};

  try {
    for (const q of QUESTIONS) {
      answers[q.key] = await askQuestion(rl, q);
    }
  } finally {
    rl.close();
  }

  const { recommended, template } = buildRecommendations(answers);
  const guardrailMode = answers.guardrail_mode || 'alert only (recommended)';
  const agents = buildAgentsBlock(recommended, guardrailMode);

  const config = {
    platform_name: answers.platform_name,
    platform_type: answers.platform_type,
    platform_description: answers.platform_description,
    data_sensitivity: answers.data_sensitivity,
    data_categories: Array.isArray(answers.data_categories) ? answers.data_categories : [answers.data_categories],
    write_access_needed: answers.write_access_needed,
    external_services: Array.isArray(answers.external_services) ? answers.external_services : [],
    api_connection_count: answers.api_connection_count,
    processing_model: answers.processing_model,
    coordination_needed: answers.coordination_needed,
    guardrail_mode: guardrailMode.startsWith('alert and') ? 'intervene' : 'alert',
    recommended_agents: recommended,
    recommended_template: template,
    agents,
  };

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

  console.log('');
  console.log('════════════════════════════════════════════');
  console.log(' Configuration saved to config/platform.json');
  console.log('════════════════════════════════════════════');
  console.log('');
  console.log(' Recommended agents:');
  recommended.forEach(a => console.log(`   • ${a}`));
  console.log('');
  console.log(` Recommended template: ${template}`);
  console.log(` Guardrail mode:       ${config.guardrail_mode}`);
  console.log('');
  console.log(' Next steps:');
  console.log('   1. Run the risk scanner against your codebase:');
  console.log('      node risk-scanner/scanner.js --target /path/to/your/project');
  console.log('   2. Review risk-scanner/output/risk-profile.json');
  console.log('   3. Start the admin panel:');
  console.log('      node admin-panel/index.js');
  console.log('');
}

main().catch(err => {
  console.error('Onboarding failed:', err.message);
  process.exit(1);
});
