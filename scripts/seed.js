/**
 * Seed script — run once to bootstrap the DB.
 *
 *   node scripts/seed.js
 *
 * Creates:
 *   - 1 default Project
 *   - 1 Orchestrator Agent  (auto-scheduled on every new task)
 *   - 1 Backend Agent       (example specialist)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Project } from '../src/domain/project/Project.model.js';
import { Agent } from '../src/domain/agent/Agent.model.js';

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB');

// ── Project ────────────────────────────────────────────────────────────────
const project = await Project.findOneAndUpdate(
  { name: 'mission-control' },
  {
    $setOnInsert: {
      name: 'mission-control',
      type: 'multirepo',
      repositories: [
        { name: 'mission-control-api', url: 'https://github.com/yourorg/mission-control-api' },
        { name: 'trello-watcher',      url: 'https://github.com/yourorg/trello-watcher' },
      ],
      environments: [
        { name: 'dev' },
        { name: 'staging' },
        { name: 'prod' },
      ],
    },
  },
  { upsert: true, new: true }
);
console.log(`Project: ${project.name}  (${project._id})`);

// ── Orchestrator Agent ─────────────────────────────────────────────────────
const orchestrator = await Agent.findOneAndUpdate(
  { name: 'orchestrator' },
  {
    $setOnInsert: {
      name: 'orchestrator',
      type: 'orchestrator',
      capabilities: ['task-analysis', 'agent-routing', 'planning'],
      projectId: null, // global
      systemPrompt: `You are the orchestrator agent for mission-control.
Your job is to analyze a task and produce a structured execution plan.

Given a task title and description, output a JSON object with this shape:
{
  "summary": "<one-sentence summary>",
  "agents": [
    { "name": "<agent-name>", "reason": "<why this agent is needed>" }
  ],
  "steps": ["<step 1>", "<step 2>", "..."]
}

Be concise. Do not add explanations outside the JSON.`,
    },
  },
  { upsert: true, new: true }
);
console.log(`Agent: ${orchestrator.name}  (${orchestrator._id})`);

// ── Backend Agent ──────────────────────────────────────────────────────────
const backendAgent = await Agent.findOneAndUpdate(
  { name: 'backend:general' },
  {
    $setOnInsert: {
      name: 'backend:general',
      type: 'backend',
      capabilities: ['node.js', 'express', 'mongoose', 'bullmq'],
      projectId: null,
      systemPrompt: `You are a senior Node.js backend engineer.
You implement backend features, fix bugs, and write clean, production-ready code.
Always use ESM (import/export). Follow the existing architecture in the repo.`,
    },
  },
  { upsert: true, new: true }
);
console.log(`Agent: ${backendAgent.name}  (${backendAgent._id})`);

console.log('\nDone. Copy these IDs if you need them for manual API calls.');
await mongoose.disconnect();
