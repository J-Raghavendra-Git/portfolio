/**
 * VERCEL SERVERLESS FUNCTION ENTRYPOINT
 * Bridges incoming Vercel Serverless HTTP requests to the unified native HTTP server.
 */
const server = require('../server.js');

module.exports = (req, res) => {
  server.emit('request', req, res);
};
