/**
 * VERCEL SERVERLESS FUNCTION ENTRYPOINT
 * Bridges incoming Vercel Serverless HTTP requests to the unified native HTTP server.
 */
const server = require('../server.js');

module.exports = (req, res) => {
  if (req.headers['x-matched-path']) {
    const orig = req.headers['x-matched-path'];
    const qIndex = req.url ? req.url.indexOf('?') : -1;
    req.url = orig + (qIndex !== -1 ? req.url.slice(qIndex) : '');
  }
  server.emit('request', req, res);
};

