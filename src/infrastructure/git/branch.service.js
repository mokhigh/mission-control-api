/**
 * Git Branch Service
 *
 * After specialist agents edit files in a checkout, this service:
 *   1. Creates a feature branch
 *   2. Stages + commits all changes
 *   3. Pushes to origin
 *   4. Returns the commit hash and a diff summary
 */
import { execFile } from 'child_process';
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
    return { commitHash: null, diffSummary: '', pushed: false };
  }

  // Create and switch to feature branch
  await git(cwd, ['checkout', '-b', branchName]);

  // Generate diff summary before committing
  const diffSummary = await git(cwd, ['diff', '--stat']);

  // Stage all changes
  await git(cwd, ['add', '-A']);

  // Commit
  await git(cwd, ['commit', '-m', commitMessage]);

  // Get the commit hash
  const commitHash = await git(cwd, ['rev-parse', 'HEAD']);

  // Push to origin
  try {
    await git(cwd, ['push', '-u', 'origin', branchName]);
    logger.info('[git-branch] pushed branch', { branchName, commitHash });
    return { commitHash, diffSummary, pushed: true };
  } catch (err) {
    // Push may fail if no remote is configured or no credentials — still return commit info
    logger.warn('[git-branch] push failed (changes are committed locally)', {
      branchName,
      commitHash,
      error: err.message,
    });
    return { commitHash, diffSummary, pushed: false };
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
