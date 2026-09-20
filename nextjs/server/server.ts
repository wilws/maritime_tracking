import { createServer } from "http";
import next from "next";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { clients } from "./realtime";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST;
const port = Number(process.env.SERVER_PORT);

//creates the Next.js app instance with its config.
const app = next({ dev, hostname, port });
await app.prepare();

// gets the function that turns a request into a page or API response.
const handle = app.getRequestHandler();

// Create a normal server
const httpServer = createServer((req, res) => {
  handle(req, res);
});

// Create a websocket server sharing the same port
const wss = new WebSocketServer({
  noServer: true 
});


// fires when a request has Upgrade: websocket.
httpServer.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);

  if (pathname === "/ws") {
    //performs the WebSocket handshake on that raw connection. When done, it calls your callback with a ready ws object.
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  }
});

/**
 * .on listens. .emit fires.
 * wss.on("connection", handler)   // when this happens, run handler
 * wss.emit("connection", ws, req) // make it happen now
 * Normally the library emits and you only write .on. With noServer: true nothing emits, so you do it manually.
 */

// Socket registry lives in realtime.ts so API routes can import it
// without dragging this file's bootstrap into Next.js's bundle.

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

httpServer.listen(port, () => {
  console.log(`\x1b[32m> http://localhost:${port}\x1b[0m`);
  console.log(`\x1b[32m> WebSocket: ws://localhost:${port}/ws\x1b[0m`);
});
