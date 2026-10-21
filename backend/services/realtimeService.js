/**
 * Cape Secure Solutions — Real-Time Server-Sent Events (SSE) Engine
 * Broadcasts authoritative database events to authenticated admin dashboards.
 * No fake data or synthetic timers.
 */

const clients = new Set();

function addClient(req, res, user) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const clientId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clientObj = { id: clientId, res, user, connectedAt: new Date().toISOString() };
  clients.add(clientObj);

  // Send initial connected handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: clientObj.connectedAt })}\n\n`);

  // Keep-alive heartbeat every 25 seconds
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeatTimer);
      clients.delete(clientObj);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    clients.delete(clientObj);
  });
}

function broadcastEvent(eventType, payload) {
  if (clients.size === 0) return;

  const message = `event: ${eventType}\ndata: ${JSON.stringify({
    type: eventType,
    payload,
    timestamp: new Date().toISOString()
  })}\n\n`;

  for (const client of clients) {
    try {
      client.res.write(message);
    } catch (err) {
      clients.delete(client);
    }
  }
}

function getConnectedClientsCount() {
  return clients.size;
}

module.exports = {
  addClient,
  broadcastEvent,
  getConnectedClientsCount
};
