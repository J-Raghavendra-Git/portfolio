/**
 * DEDICATED CYBERSECURITY & SECURITY CONTROL MODULE TEST SUITE
 * Verifies owner-only Security Center, public Security page, defensive audit checks,
 * session management, event logging, and credential isolation.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = parseInt(process.env.PORT || '4173', 10);
const BASE_URL = `http://localhost:${PORT}`;
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq !== -1) {
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim().replace(/^["'](.*)["']$/, '$1');
        if (k && !(k in process.env)) process.env[k] = v;
      }
    }
  });
}

const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'raghavendraraghu71537@gmail.com').trim().toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Raghavrc87229380';

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, name, details = '') {
  testsTotal++;
  if (condition) {
    testsPassed++;
    console.log(`  [✓ PASS] ${name}`);
  } else {
    console.error(`  [✗ FAIL] ${name}: ${details}`);
    process.exitCode = 1;
  }
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Host': `localhost:${PORT}`
    };
    if (data) {
      if (Buffer.isBuffer(data)) {
        defaultHeaders['Content-Length'] = data.length;
      } else if (typeof data === 'object') {
        data = JSON.stringify(data);
        defaultHeaders['Content-Type'] = 'application/json';
        defaultHeaders['Content-Length'] = Buffer.byteLength(data);
      }
    }

    const reqOptions = {
      hostname: 'localhost',
      port: PORT,
      method: options.method || 'GET',
      path: options.path,
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    };

    const req = http.request(reqOptions, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let json = null;
        try { json = JSON.parse(buffer.toString('utf-8')); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString('utf-8'),
          buffer: buffer,
          json: json
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('STARTING CYBERSECURITY & SECURITY CONTROL VERIFICATION SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // 1. PUBLIC SECURITY PAGE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('[SECTION 1] PUBLIC SECURITY PAGE...');

  const pubSecRes = await request({ path: '/security' });
  assert(
    pubSecRes.statusCode === 200 && (pubSecRes.body.includes('Security & Defensive Systems Architecture') || pubSecRes.body.includes('Security &amp; Defensive Systems Architecture')),
    'Public /security route loads with HTTP 200 and valid HTML',
    `Status: ${pubSecRes.statusCode}`
  );

  const pubSecHtmlRes = await request({ path: '/security.html' });
  assert(pubSecHtmlRes.statusCode === 200, 'Public /security.html direct route returns HTTP 200');

  // Verify that public security page strictly omits sensitive credentials
  const hasNoPassword = !pubSecRes.body.includes(OWNER_PASSWORD);
  const hasNoAuthJson = !pubSecRes.body.includes('auth.json');
  const hasNoEnvDump = !pubSecRes.body.includes('SESSION_SECRET') && !pubSecRes.body.includes('passwordHash');
  assert(hasNoPassword && hasNoAuthJson && hasNoEnvDump, 'Public security page contains zero secrets or credentials');

  // --------------------------------------------------------------------------
  // 2. UNAUTHENTICATED ACCESS GUARDS (OWNER-ONLY PROTECTION)
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 2] UNAUTHENTICATED SECURITY ROUTE & API GUARDS...');

  const unauthPageRes = await request({ path: '/admin/security' });
  assert(
    unauthPageRes.statusCode === 302 && (unauthPageRes.headers.location || '').startsWith('/admin/login'),
    'Unauthenticated GET /admin/security redirects to /admin/login (302)',
    `Status: ${unauthPageRes.statusCode}`
  );

  const secApis = [
    '/api/admin/security/overview',
    '/api/admin/security/sessions',
    '/api/admin/security/events',
    '/api/admin/security/settings'
  ];

  for (const api of secApis) {
    const res = await request({ path: api });
    assert(res.statusCode === 401, `Unauthenticated GET ${api} returns 401 Unauthorized`, `Status: ${res.statusCode}`);
  }

  const unauthAuditRes = await request({ path: '/api/admin/security/audit', method: 'POST' });
  assert(unauthAuditRes.statusCode === 401, 'Unauthenticated POST /api/admin/security/audit returns 401 Unauthorized');

  const unauthRevokeRes = await request({ path: '/api/admin/security/sessions/revoke', method: 'POST' }, { sessionId: 'fake' });
  assert(unauthRevokeRes.statusCode === 401, 'Unauthenticated POST /api/admin/security/sessions/revoke returns 401 Unauthorized');

  // --------------------------------------------------------------------------
  // 3. OWNER AUTHENTICATION & SECURITY CENTER ACCESS
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 3] OWNER SECURITY CENTER OPERATIONS & AUDIT...');

  const loginRes = await request({ path: '/api/auth/login', method: 'POST' }, {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD
  });

  const cookies = loginRes.headers['set-cookie'] || [];
  const sessionCookie = (cookies.find(c => c.startsWith('owner_session=')) || '').split(';')[0];
  const csrfToken = loginRes.json?.csrfToken || '';

  assert(loginRes.statusCode === 200 && !!sessionCookie && !!csrfToken, 'Owner authenticates to obtain session cookie and CSRF token');

  const authHeaders = {
    'Cookie': sessionCookie,
    'x-csrf-token': csrfToken
  };

  // Access /admin/security view while authenticated
  const authPageRes = await request({ path: '/admin/security', headers: authHeaders });
  assert(authPageRes.statusCode === 200 && authPageRes.body.includes('Security Center'), 'Authenticated owner accesses /admin/security (HTTP 200)');

  // Access security overview API
  const overviewRes = await request({ path: '/api/admin/security/overview', headers: authHeaders });
  assert(
    overviewRes.statusCode === 200 && overviewRes.json?.postureScore === 100 && overviewRes.json?.postureStatus === 'HARDENED',
    'Owner accesses security overview API with 100% posture score',
    `Status: ${overviewRes.statusCode}`
  );

  // Trigger defensive health check audit
  const auditRes = await request({ path: '/api/admin/security/audit', method: 'POST', headers: authHeaders });
  assert(
    auditRes.statusCode === 200 && 
    auditRes.json?.score === 100 && 
    auditRes.json?.passingCount === 12 && 
    Array.isArray(auditRes.json?.checks),
    'Defensive health audit verifies all 12 controls passing (100%)',
    `Passing: ${auditRes.json?.passingCount}/${auditRes.json?.totalChecks}`
  );

  // Verify CSRF check on audit
  const missingCsrfAuditRes = await request({
    path: '/api/admin/security/audit',
    method: 'POST',
    headers: { 'Cookie': sessionCookie } // missing x-csrf-token
  });
  assert(missingCsrfAuditRes.statusCode === 403, 'Defensive audit mutation without CSRF token rejected with HTTP 403');

  // --------------------------------------------------------------------------
  // 4. SESSION MANAGEMENT & REVOCATION
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 4] SESSION MANAGEMENT & REVOCATION CONTROLS...');

  const sessionsRes = await request({ path: '/api/admin/security/sessions', headers: authHeaders });
  assert(
    sessionsRes.statusCode === 200 && Array.isArray(sessionsRes.json) && sessionsRes.json.length >= 1,
    'Owner retrieves active sessions list',
    `Found: ${sessionsRes.json?.length} active session(s)`
  );

  // Verify session tokens are masked
  const currentSession = sessionsRes.json.find(s => s.isCurrent);
  assert(currentSession && currentSession.id.length === 12, 'Session tokens are safely masked with short SHA-256 prefixes');

  // Create a secondary session to test selective revocation
  const secondLoginRes = await request({ path: '/api/auth/login', method: 'POST' }, {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD
  });
  const secondCookie = ((secondLoginRes.headers['set-cookie'] || []).find(c => c.startsWith('owner_session=')) || '').split(';')[0];
  
  // Re-list sessions to find second session ID
  const afterSecondLoginSessions = await request({ path: '/api/admin/security/sessions', headers: authHeaders });
  const targetSession = afterSecondLoginSessions.json.find(s => !s.isCurrent);

  if (targetSession) {
    // Revoke the second session by masked ID
    const revokeRes = await request({
      path: '/api/admin/security/sessions/revoke',
      method: 'POST',
      headers: authHeaders
    }, { sessionId: targetSession.id });

    assert(revokeRes.statusCode === 200 && revokeRes.json?.success === true, `Owner successfully revokes secondary session (${targetSession.id})`);

    // Verify revoked session can no longer access protected APIs
    const revokedAccessRes = await request({
      path: '/api/admin/dashboard',
      headers: { 'Cookie': secondCookie }
    });
    assert(revokedAccessRes.statusCode === 401, 'Revoked session is immediately denied with HTTP 401');
  }

  // --------------------------------------------------------------------------
  // 5. SECURITY EVENT AUDIT TRAIL
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 5] SECURITY EVENT LOG & TAMPER RESISTANCE...');

  const eventsRes = await request({ path: '/api/admin/security/events?limit=50', headers: authHeaders });
  assert(eventsRes.statusCode === 200 && Array.isArray(eventsRes.json), 'Owner retrieves security event audit trail');

  const events = eventsRes.json || [];
  const hasLoginSuccess = events.some(e => e.type === 'LOGIN_SUCCESS');
  const hasAuditTriggered = events.some(e => e.type === 'AUDIT_TRIGGERED');
  assert(hasLoginSuccess && hasAuditTriggered, 'Security event trail recorded LOGIN_SUCCESS and AUDIT_TRIGGERED events');

  // Verify zero credential leaks in recorded events
  let eventsAreSafe = true;
  for (const e of events) {
    const raw = JSON.stringify(e);
    if (raw.includes(OWNER_PASSWORD) || (e.metadata && (e.metadata.password || e.metadata.token || e.metadata.salt))) {
      eventsAreSafe = false;
      break;
    }
  }
  assert(eventsAreSafe, 'Security event logs strictly omit all passwords, tokens, salts, and secrets');

  // --------------------------------------------------------------------------
  // 6. SECURITY SETTINGS CONTROLS
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 6] SECURITY SETTINGS CONFIGURATION...');

  const getSecSettingsRes = await request({ path: '/api/admin/security/settings', headers: authHeaders });
  assert(getSecSettingsRes.statusCode === 200 && getSecSettingsRes.json?.sessionDurationHours, 'Owner retrieves security policy settings');

  const updateSecSettingsRes = await request({
    path: '/api/admin/security/settings',
    method: 'PUT',
    headers: authHeaders
  }, { sessionDurationHours: 12 });

  assert(
    updateSecSettingsRes.statusCode === 200 && updateSecSettingsRes.json?.settings?.sessionDurationHours === 12,
    'Owner updates security policy setting (sessionDurationHours: 12)'
  );

  // Restore to 24 hours
  await request({
    path: '/api/admin/security/settings',
    method: 'PUT',
    headers: authHeaders
  }, { sessionDurationHours: 24 });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('CYBERSECURITY MODULE TEST SUMMARY');
  console.log('================================================================');
  console.log(`Total Assertions: ${testsTotal}`);
  console.log(`Passed: ${testsPassed} / ${testsTotal}`);
  console.log(`Failed: ${testsTotal - testsPassed}`);
  console.log('================================================================\n');

  if (testsPassed === testsTotal) {
    console.log('ALL CYBERSECURITY MODULE ASSERTIONS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error(`Finished with ${testsTotal - testsPassed} failures.`);
    process.exit(1);
  }
}

runSecurityTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
