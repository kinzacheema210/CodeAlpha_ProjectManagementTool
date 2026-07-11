// broadcaster.js — keeps track of connected WebSocket clients
// and lets any route broadcast a JSON event to everyone (simple, no rooms).

let clients = new Set();

function register(ws) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === 1) { // OPEN
      ws.send(payload);
    }
  }
}

module.exports = { register, broadcast };
