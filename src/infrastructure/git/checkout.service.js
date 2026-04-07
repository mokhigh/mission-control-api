/**
 * Git Checkout Service
 *
 * Clones or pulls a project repository into a local workspace directory.
 * Used by the execution pipeline so Claude CLI has a real cwd with project files.
 *
 * Layout:  <WORKSPACES_ROOT>/<projectSlug>/<repoName>/
 */
import { execFile } from 'child_process';
import { mkdir, access } from 'fs/promises';
import path from 'path';
import { logger } from '../logger.js';

const WORKSPACES_ROOT = process.env.WORKSPACES_ROOT || path.join(process.cwd(), '.workspaces');

/**
 * Ensures a fresh checkout of the given repository exists on disk.
 *
 * @param {{ slug: string, repository: { name: string, url: string, branch?: string } }} opts
 * @returns {Promise<string>} absolute path to the repo working directory
 */
export async function ensureCheckout({ slug, repository }) {
  const { name, url, branch = 'main' } = repository;
  const repoDir = path.join(WORKSPACES_ROOT, slug, name);

  if (await dirExists(repoDir)) {
    await git(repoDir, ['fetch', '--prune']);
    await git(repoDir, ['checkout', branch]);
    await git(repoDir, ['reset', '--hard', `origin/${branch}`]);
    await git(repoDir, ['clean', '-fd']);
    logger.info(`[checkout] pulled ${name} @ ${branch}`, { repoDir });
  } else {
    await mkdir(path.dirname(repoDir), { recursive: true });
    await git(null, ['clone', '--branch', branch, '--single-branch', url, repoDir]);
    logger.info(`[checkout] cloned ${name} @ ${branch}`, { repoDir });
  }

  return repoDir;
}

/**
 * Returns the workspace root for a project (may contain multiple repos).
 */
export function getWorkspaceDir(slug) {
  return path.join(WORKSPACES_ROOT, slug);
}

// ── helpers ────────────────────────────────────────────────────────────────

function git(cwd, args) {
  return new Promise((resolve, reject) => {
    const opts = cwd ? { cwd, timeout: 120_000 } : { timeout: 120_000 };
    execFile('git', args, opts, (err, stdout, stderr) => {
      if (err) {
        logger.error(`[git] ${args.join(' ')} failed`, { stderr: stderr?.trim() });
        return reject(err);
      }
      resolve(stdout.trim());
    });
  });
}

async function dirExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
