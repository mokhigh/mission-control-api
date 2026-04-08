/**
 * Server-Sent Events hub.
 *
 * Per-execution log stream:
 *   sseHub.subscribe(executionId, res)  — from the execution controller
 *   sseHub.publish(executionId, logDoc) — from execution service
 *
 * Global dashboard channel (task/deployment state changes):
 *   sseHub.subscribeGlobal(res)               — from the events controller
 *   sseHub.publishGlobal(eventType, data)     — from any service
 */

class SseHub {
  /** @type {Map<string, Set<import('express').Response>>} */
  #clients = new Map();
  /** @type {Set<import('express').Response>} */
  #globalClients = new Set();

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

  subscribeGlobal(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.#globalClients.add(res);
    res.write('event: connected\ndata: {}\n\n');

    res.on('close', () => {
      this.#globalClients.delete(res);
    });
  }

  publishGlobal(eventType, data) {
    if (!this.#globalClients.size) return;
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of this.#globalClients) {
      res.write(payload);
    }
  }
}

export const sseHub = new SseHub();
