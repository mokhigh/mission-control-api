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
    $set: {
      name: 'orchestrator',
      type: 'orchestrator',
      capabilities: ['task-analysis', 'agent-routing', 'planning'],
      projectId: null, // global
      systemPrompt: `You are the orchestrator agent for mission-control.
Your job is to analyze a task and produce a structured execution plan.

You MUST pick agents only from this roster: frontend, backend, devops, reviewer.
Do NOT invent agent names outside this list.

Given a task title and description, output a JSON object with this shape:
{
  "summary": "<one-sentence summary>",
  "agents": [
    { "name": "frontend|backend|devops|reviewer", "reason": "<why this agent is needed>" }
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
  { name: 'backend' },
  {
    $setOnInsert: {
      name: 'backend',
      type: 'backend',
      capabilities: ['node.js', 'express', 'mongoose', 'bullmq'],
      projectId: null,
      systemPrompt: `You are a senior Node.js backend engineer.
You implement backend features, fix bugs, and write clean, production-ready code.
Always use ESM (import/export). Follow the existing architecture in the repo.
You have full file access — read, edit, and create files as needed.`,
    },
  },
  { upsert: true, new: true }
);
console.log(`Agent: ${backendAgent.name}  (${backendAgent._id})`);

const frontendAgent = await Agent.findOneAndUpdate(
  { name: 'frontend' },
  {
    $setOnInsert: {
      name: 'frontend',
      type: 'frontend',
      capabilities: ['react', 'next.js', 'css', 'html', 'javascript'],
      projectId: null,
      systemPrompt: `You are a senior frontend engineer specializing in React and Next.js.
You implement UI features, fix visual/layout bugs, and write clean component code.
Follow the existing project conventions. Use the component and styling patterns already in the repo.
You have full file access — read, edit, and create files as needed.`,
    },
  },
  { upsert: true, new: true }
);
console.log(`Agent: ${frontendAgent.name}  (${frontendAgent._id})`);

const devopsAgent = await Agent.findOneAndUpdate(
  { name: 'devops' },
  {
    $setOnInsert: {
      name: 'devops',
      type: 'devops',
      capabilities: ['docker', 'ci/cd', 'nginx', 'shell', 'infrastructure'],
      projectId: null,
      systemPrompt: `You are a senior DevOps engineer.
You handle CI/CD pipelines, Docker configurations, deployment scripts, and infrastructure.
You have full file access — read, edit, and create files as needed.`,
    },
  },
  { upsert: true, new: true }
);
console.log(`Agent: ${devopsAgent.name}  (${devopsAgent._id})`);

const reviewerAgent = await Agent.findOneAndUpdate(
  { name: 'reviewer' },
  {
    $setOnInsert: {
      name: 'reviewer',
      type: 'reviewer',
      capabilities: ['code-review', 'testing', 'quality'],
      projectId: null,
      systemPrompt: `You are a senior code reviewer.
You review code changes for correctness, security issues, and best practices.
Provide clear, actionable feedback. Check for edge cases and potential bugs.
You have full file access — read files to perform thorough reviews.`,
    },
  },
  { upsert: true, new: true }
);
console.log(`Agent: ${reviewerAgent.name}  (${reviewerAgent._id})`);

console.log('\nDone. Copy these IDs if you need them for manual API calls.');
await mongoose.disconnect();
