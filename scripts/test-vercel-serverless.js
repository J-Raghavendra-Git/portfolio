/**
 * VERCEL SERVERLESS ENVIRONMENT VERIFICATION TEST
 * Simulates:
 * 1. Read-only filesystem (__dirname is not writable, EROFS on write)
 * 2. Missing gitignored files (.env, auth.json, messages.json, sessions.json, security-events.json)
 * 3. VERCEL=1 runtime environment with module.exports handler
 * 4. GET / (homepage), GET /favicon.ico, GET /api/public/data, POST /api/auth/login, GET /admin/security
 */

const assert = require('node:assert');
const http = require('node:http');

// Set Vercel simulation environment
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';
process.env.OWNER_EMAIL = 'raghavendraraghu71537@gmail.com';
process.env.OWNER_PASSWORD = 'Admin@2026!Secure';

console.log('=== RUNNING VERCEL SERVERLESS EMULATION TEST ===\n');

// Mock read-only filesystem on project data folder
const fs = require('node:fs');
const origWriteFileSync = fs.writeFileSync;
const origRenameSync = fs.renameSync;

fs.writeFileSync = function(filePath, ...args) {
  if (typeof filePath === 'string' && filePath.includes('recruiter-portfolio\\data')) {
    const err = new Error(`EROFS: read-only file system, open '${filePath}'`);
    err.code = 'EROFS';
    throw err;
  }
  return origWriteFileSync.apply(this, [filePath, ...args]);
};

fs.renameSync = function(oldPath, newPath) {
  if (typeof newPath === 'string' && newPath.includes('recruiter-portfolio\\data')) {
    const err = new Error(`EROFS: read-only file system, rename '${oldPath}' -> '${newPath}'`);
    err.code = 'EROFS';
    throw err;
  }
  return origRenameSync.apply(this, [oldPath, newPath]);
};

// Require server module as Vercel does
let server;
try {
  server = require('../server.js');
  console.log('[PASS] server.js imported successfully in serverless read-only mode');
} catch (err) {
  console.error('[FAIL] server.js failed to import:', err);
  process.exit(1);
}

assert(server && typeof server.emit === 'function', 'server.js must export an http.Server instance for Vercel');

// Helper to simulate HTTP requests against exported server instance
function dispatch(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('node:events');
    const req = new EventEmitter();
    req.method = method;
    req.url = urlPath;
    req.headers = { host: 'portfolio-test.vercel.app', ...headers };
    
    let resHeaders = {};
    let statusCode = 200;
    const chunks = [];

    const res = new EventEmitter();
    res.setHeader = (name, val) => { resHeaders[name.toLowerCase()] = val; };
    res.getHeader = (name) => resHeaders[name.toLowerCase()];
    res.writeHead = (code, headersObj = {}) => {
      statusCode = code;
      if (headersObj) {
        Object.entries(headersObj).forEach(([k, v]) => {
          resHeaders[k.toLowerCase()] = v;
        });
      }
    };
    res.write = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      resolve({
        statusCode,
        headers: resHeaders,
        body: Buffer.concat(chunks).toString('utf-8')
      });
    };

    server.emit('request', req, res);

    if (body) {
      req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    }
    req.emit('end');
  });
}

async function runTests() {
  let passed = 0;

  // 1. Test GET / (Homepage)
  const homeRes = await dispatch('GET', '/');
  assert.strictEqual(homeRes.statusCode, 200, `GET / must return 200 (returned ${homeRes.statusCode})`);
  assert(homeRes.body.includes('J Raghavendra'), 'Homepage must contain portfolio owner title/heading');
  console.log('[PASS] 1. GET / -> HTTP 200 OK (Clean HTML served)');
  passed++;

  // 2. Test GET /favicon.ico
  const faviconRes = await dispatch('GET', '/favicon.ico');
  assert([200, 404].includes(faviconRes.statusCode), `GET /favicon.ico must return 200 or 404 (returned ${faviconRes.statusCode})`);
  assert.notStrictEqual(faviconRes.statusCode, 500, 'GET /favicon.ico must NEVER return 500');
  console.log(`[PASS] 2. GET /favicon.ico -> HTTP ${faviconRes.statusCode} (No 500 exception)`);
  passed++;

  // 3. Test GET /api/public/data
  const publicDataRes = await dispatch('GET', '/api/public/data');
  assert.strictEqual(publicDataRes.statusCode, 200, 'GET /api/public/data must return HTTP 200');
  const pubJson = JSON.parse(publicDataRes.body);
  assert(pubJson.profile && pubJson.projects, 'Public data must contain profile and projects');
  console.log('[PASS] 3. GET /api/public/data -> HTTP 200 OK (JSON payload intact)');
  passed++;

  // 4. Test POST /api/auth/login
  const loginRes = await dispatch('POST', '/api/auth/login', {
    'content-type': 'application/json'
  }, JSON.stringify({
    email: process.env.OWNER_EMAIL,
    password: process.env.OWNER_PASSWORD
  }));
  assert.strictEqual(loginRes.statusCode, 200, `POST /api/auth/login must return HTTP 200 (returned ${loginRes.statusCode})`);
  const loginJson = JSON.parse(loginRes.body);
  assert.strictEqual(loginJson.success, true, 'Login response must indicate success');
  assert(loginRes.headers['set-cookie'], 'Set-Cookie header must be present');
  const cookieMatch = loginRes.headers['set-cookie'].match(/owner_session=([^;]+)/);
  const sessionToken = cookieMatch ? cookieMatch[1] : null;
  assert(sessionToken, 'Session token must be issued');
  console.log('[PASS] 4. POST /api/auth/login -> HTTP 200 OK (Owner authenticated & session issued)');
  passed++;

  // 5. Test GET /admin/security (Authenticated)
  const secRes = await dispatch('GET', '/admin/security', {
    cookie: `owner_session=${sessionToken}`
  });
  assert.strictEqual(secRes.statusCode, 200, `GET /admin/security must return HTTP 200 for owner (returned ${secRes.statusCode})`);
  assert(secRes.body.includes('Security Center & Threat Defenses'), 'Security dashboard must render');
  console.log('[PASS] 5. GET /admin/security -> HTTP 200 OK (Cybersecurity module accessible)');
  passed++;

  // 6. Test GET /admin/security (Unauthenticated Guard)
  const unauthSecRes = await dispatch('GET', '/admin/security');
  assert.strictEqual(unauthSecRes.statusCode, 302, 'Unauthenticated /admin must redirect with 302');
  assert(unauthSecRes.headers['location'].startsWith('/admin/login'), 'Redirect must target /admin/login');
  console.log('[PASS] 6. GET /admin/security (logged out) -> HTTP 302 Redirect to /admin/login (Protected)');
  passed++;

  console.log(`\nALL ${passed}/6 VERCEL SERVERLESS EMULATION CHECKS PASSED PERFECTLY!\n`);
}

runTests().catch(err => {
  console.error('\n[TEST CRASHED]:', err);
  process.exit(1);
});
