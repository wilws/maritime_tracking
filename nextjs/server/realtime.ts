import type { WebSocket } from "ws";

/**
 * The live socket registry.
 *
 * Next.js bundles API routes separately from the custom server, so a plain
 * module-level Set would give each side its own copy. Hanging it off
 * globalThis gives both the same instance — they share one process.
 * tsx server/server.ts is one process, and Next.js runs inside it — same globalThis. That's why the trick works.
 */
const globalForRealtime = globalThis as typeof globalThis & {
  __vesselClients?: Set<WebSocket>;
};

// This is to export to server.ts
export const clients: Set<WebSocket> = (globalForRealtime.__vesselClients ??=
  new Set<WebSocket>());

export function publish(vessels: unknown[]) {
  const msg = JSON.stringify({ vessels });

  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}
