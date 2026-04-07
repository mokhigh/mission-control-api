/**
 * Server-Sent Events hub for streaming execution logs in real time.
 *
 * Usage:
 *   sseHub.subscribe(executionId, res)  — from the controller
 *   sseHub.publish(executionId, logDoc) — from execution service
 */

class SseHub {
  /** @type {Map<string, Set<import('express').Response>>} */
  #clients = new Map();

  subscribe(executionId, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!this.#clients.has(executionId)) {
      this.#clients.set(executionId, new Set());
    }
    this.#clients.get(executionId).add(res);

    res.write('event: connected\ndata: {}\n\n');

    res.on('close', () => {
      this.#clients.get(executionId)?.delete(res);
    });
  }

  publish(executionId, logDoc) {
    const clients = this.#clients.get(executionId);
    if (!clients?.size) return;

    const payload = `data: ${JSON.stringify(logDoc)}\n\n`;
    for (const res of clients) {
      res.write(payload);
    }
  }
}

export const sseHub = new SseHub();
