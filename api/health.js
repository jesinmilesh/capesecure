/**
 * Cape Secure Solutions — Production Health Check Handler
 * Vercel Serverless Function: /api/health
 */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    database: 'connected',
    service: 'Cape Secure Solutions API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
}
