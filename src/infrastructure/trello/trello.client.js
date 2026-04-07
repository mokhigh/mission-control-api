import { logger } from '../logger.js';

const BASE_URL = 'https://api.trello.com/1';

function credentials() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_API_TOKEN;
  return { key, token };
}

/**
 * Moves a Trello card to the given list and marks it as complete.
 * Non-throwing: logs a warning on failure so callers stay unblocked.
 */
export async function completeCard(cardId, finishedListId) {
  const { key, token } = credentials();

  if (!key || !token) {
    logger.warn('[trello] TRELLO_API_KEY / TRELLO_API_TOKEN not set — skipping card move');
    return;
  }

  const params = new URLSearchParams({ key, token, idList: finishedListId, dueComplete: 'true' });
  const url = `${BASE_URL}/cards/${cardId}?${params}`;

  try {
    const res = await fetch(url, { method: 'PUT' });
    if (!res.ok) {
      const body = await res.text();
      logger.warn('[trello] card move failed', { cardId, finishedListId, status: res.status, body });
    } else {
      logger.info('[trello] card moved to finished list', { cardId, finishedListId });
    }
  } catch (err) {
    logger.warn('[trello] card move error', { cardId, err: err.message });
  }
}
