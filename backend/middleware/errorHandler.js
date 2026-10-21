/**
 * Cape Secure Solutions — Production Error Handling Middleware
 * Prevents information disclosure (stack traces, server paths, DB credentials) to clients.
 */

const logger = require('../utils/logger');

function handleError(err, req, res) {
  const isProduction = process.env.NODE_ENV === 'production';
  const status = err.status || err.statusCode || 500;

  logger.error(err.message, {
    url: req.url,
    method: req.method,
    stack: isProduction ? undefined : err.stack
  });

  const clientMessage = status >= 500
    ? 'An unexpected error occurred. Please try again or contact support.'
    : err.message || 'Bad Request';

  if (!res.headersSent) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify({
      success: false,
      message: clientMessage
    }));
  }
}

module.exports = {
  handleError
};
