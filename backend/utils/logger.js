/**
 * Cape Secure Solutions — Production Structured Logger
 * Logs request details, metrics, and errors without leaking credentials or secrets.
 */

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const safeMeta = { ...meta };
  
  // Strip sensitive fields
  const sensitiveKeys = ['password', 'token', 'authorization', 'apiKey', 'secret', 'jwt'];
  for (const k of Object.keys(safeMeta)) {
    if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
      safeMeta[k] = '[REDACTED]';
    }
  }

  return JSON.stringify({
    timestamp,
    level,
    message,
    ...safeMeta
  });
}

const logger = {
  info: (msg, meta) => {
    console.log(formatLog('INFO', msg, meta));
  },
  warn: (msg, meta) => {
    console.warn(formatLog('WARN', msg, meta));
  },
  error: (msg, meta) => {
    console.error(formatLog('ERROR', msg, meta));
  },
  request: (req, status, durationMs, extra = {}) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    console.log(formatLog('HTTP', `${req.method} ${req.url} -> ${status} (${durationMs}ms)`, {
      method: req.method,
      url: req.url,
      status,
      durationMs,
      ip,
      ...extra
    }));
  }
};

module.exports = logger;
