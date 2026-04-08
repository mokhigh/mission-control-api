/**
 * Git Branch Service
 *
 * After specialist agents edit files in a checkout, this service:
 *   1. Creates a feature branch
 *   2. Stages + commits all changes
 *   3. Pushes to origin
 *   4. Returns the commit hash and a diff summary
 */
import { execFile, spawn } from 'child_process';
import { logger } from '../logger.js';

/**
 * Creates a branch, commits all changes, and pushes.
 *
 * @param {{ cwd: string, branchName: string, commitMessage: string }} opts
 * @returns {Promise<{ commitHash: string, diffSummary: string, pushed: boolean }>}
 */
export async function commitAndPush({ cwd, branchName, commitMessage }) {
  // Check if there are any changes to commit
  const status = await git(cwd, ['status', '--porcelain']);
  if (!status.trim()) {
    logger.info('[git-branch] no changes to commit', { cwd });
    return { commitHash: null, diffSummary: '', files: [], pushed: false };
  }

  // Create and switch to feature branch
  await git(cwd, ['checkout', '-b', branchName]);

  // Stage all changes first so diff --cached picks up new files
  await git(cwd, ['add', '-A']);

  // Generate diff summary and structured diff from the staged changes
  const diffSummary = await git(cwd, ['diff', '--cached', '--stat']);
  const rawDiff = await git(cwd, ['diff', '--cached']);
  const files = parseUnifiedDiff(rawDiff);

  // Commit
  await git(cwd, ['commit', '-m', commitMessage]);

  // Get the commit hash
  const commitHash = await git(cwd, ['rev-parse', 'HEAD']);

  // Push to origin
  try {
    await git(cwd, ['push', '-u', 'origin', branchName]);
    logger.info('[git-branch] pushed branch', { branchName, commitHash });
    return { commitHash, diffSummary, files, pushed: true };
  } catch (err) {
    // Push may fail if no remote is configured or no credentials — still return commit info
    logger.warn('[git-branch] push failed (changes are committed locally)', {
      branchName,
      commitHash,
      error: err.message,
    });
    return { commitHash, diffSummary, files, pushed: false };
  }
}

/**
 * Generates a sanitized branch name from a task title.
 *
 * @param {string} taskId
 * @param {string} title
 * @returns {string}
 */
export function buildBranchName(taskId, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const shortId = taskId.slice(-6);
  return `feat/${slug}-${shortId}`;
}

/**
 * Uses Claude to generate a concise branch name and commit subject from a task title/description.
 * Falls back to buildBranchName on error.
 *
 * @param {string} taskId
 * @param {string} title
 * @param {string} [description]
 * @returns {Promise<{ branchName: string, commitSubject: string }>}
 */
export async function generateGitMeta(taskId, title, description) {
  const descPart = description ? `\nDescription: ${description.slice(0, 300)}` : '';
  const prompt =
    `Generate a concise git branch slug and commit subject for this task.\n` +
    `Title: ${title}${descPart}\n\n` +
    `Rules:\n` +
    `- branchSlug: 3-5 words, lowercase, hyphen-separated, verb-noun style, no prefix (e.g. "add-oauth2-auth", "fix-login-redirect")\n` +
    `- commitSubject: conventional commits style, imperative mood, max 60 chars, no period (e.g. "feat: add OAuth2 authentication")\n\n` +
    `Respond with ONLY valid JSON, no markdown:\n{"branchSlug":"...","commitSubject":"..."}`;

  try {
    const raw = await new Promise((resolve, reject) => {
      const child = spawn('claude', ['-p', prompt, '--model', 'claude-haiku-4-5-20251001'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });
      const chunks = [];
      child.stdout.on('data', (d) => chunks.push(d.toString()));
      child.on('close', (code) => {
        if (code === 0) resolve(chunks.join('').trim());
        else reject(new Error(`claude exited ${code}`));
      });
      child.on('error', reject);
    });

    const json = JSON.parse(raw.replace(/```(?:json)?\n?|```\n?/g, '').trim());
    const safeSlug = json.branchSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    const shortId = taskId.slice(-6);

    return {
      branchName: `feat/${safeSlug}-${shortId}`,
      commitSubject: json.commitSubject,
    };
  } catch (err) {
    logger.warn('[git-branch] generateGitMeta failed, falling back', { err: err.message });
    return {
      branchName: buildBranchName(taskId, title),
      commitSubject: `feat: ${title.slice(0, 60)}`,
    };
  }
}

// ── diff parser ────────────────────────────────────────────────────────────

/**
 * Parses a unified diff string into a structured array of file objects
 * compatible with the DiffViewer component.
 */
export function parseUnifiedDiff(raw) {
  if (!raw || !raw.trim()) return [];

  const files = [];
  // Split on "diff --git" boundaries
  const fileParts = raw.split(/^diff --git /m).filter(Boolean);

  for (const part of fileParts) {
    const lines = part.split('\n');

    // Extract file path from "a/path b/path" header
    const headerMatch = lines[0]?.match(/a\/(.+?)\s+b\/(.+)/);
    const filePath = headerMatch ? headerMatch[2] : 'unknown';

    let additions = 0;
    let deletions = 0;
    const hunks = [];
    let currentHunk = null;

    for (const line of lines) {
      // Hunk header
      if (line.startsWith('@@')) {
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
        currentHunk.lines.push({ type: 'add', content: line.slice(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
        currentHunk.lines.push({ type: 'remove', content: line.slice(1) });
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line });
      }
    }

    files.push({ path: filePath, additions, deletions, hunks });
  }

  return files;
}

// ── helper ─────────────────────────────────────────────────────────────────

function git(cwd, args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) {
        logger.error(`[git-branch] ${args.join(' ')} failed`, { stderr: stderr?.trim(), cwd });
        return reject(err);
      }
      resolve(stdout.trim());
    });
  });
}
