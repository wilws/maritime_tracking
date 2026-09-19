import { createServer } from "http";
import next from "next";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST;
const port = Number(process.env.SERVER_PORT);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

// Create a normal server
const httpServer = createServer((req, res) => {
  handle(req, res);
});

// Create a websocket server sharing the same port
const wss = new WebSocketServer({
  server: httpServer,
  path: "/ws",
});

export const clients = new Set<WebSocket>();

wss.on("connection", (socket: WebSocket) => {
  clients.add(socket);
  console.log(`\x1b[32m✓ client connected. ${clients.size} total\x1b[0m`);

  socket.send(
    JSON.stringify({
      type: "CONNECTED",
      message: "WebSocket connected",
    }),
  );

  socket.on("close", () => {
    clients.delete(socket);
    console.log(`client disconnected. ${clients.size} remain`);
  });
});

// Called when the broadcast Lambda delivers vessel updates
export function publish(vessels: unknown[]) {
  const msg = JSON.stringify({ vessels });

  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}

httpServer.listen(port, () => {
  console.log(`\x1b[32m> http://localhost:${port}\x1b[0m`);
  console.log(`\x1b[32m> WebSocket: ws://localhost:${port}/ws\x1b[0m`);
});
