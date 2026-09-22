/**
 * COMPREHENSIVE SECURITY & FUNCTIONAL VERIFICATION SUITE
 * Tests owner-only authentication, route guards, message privacy,
 * CSRF protection, admin CRUD operations, and public non-regression.
 */

const http = require('node:http');

const BASE_URL = 'http://localhost:4173';
let sessionCookie = '';
let csrfToken = '';
let testsRun = 0;
let testsPassed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('1. TESTING UNAUTHENTICATED ROUTE GUARDS (302 REDIRECT)');
  console.log('====================================================');

  const adminRoutes = [
    '/admin',
    '/admin/dashboard',
    '/admin/profile',
    '/admin/projects',
    '/admin/experience',
    '/admin/skills',
    '/admin/achievements',
    '/admin/about',
    '/admin/resume',
    '/admin/messages',
    '/admin/settings'
  ];

  for (const route of adminRoutes) {
    const res = await request({
      hostname: 'localhost',
      port: 4173,
      path: route,
      method: 'GET'
    });
    assert(
      res.statusCode === 302 && res.headers.location && res.headers.location.startsWith('/admin/login'),
      `Unauthenticated GET ${route} -> 302 Redirect to /admin/login (Got ${res.statusCode}, Location: ${res.headers.location})`
    );
  }

  // Public login page should return 200
  const loginRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/admin/login',
    method: 'GET'
  });
  assert(loginRes.statusCode === 200, `GET /admin/login returns HTTP 200 for public visitors`);

  console.log('\n====================================================');
  console.log('2. TESTING UNAUTHENTICATED API SECURITY (401 UNAUTHORIZED)');
  console.log('====================================================');

  const protectedApis = [
    '/api/admin/dashboard',
    '/api/admin/profile',
    '/api/admin/projects',
    '/api/admin/experience',
    '/api/admin/skills',
    '/api/admin/achievements',
    '/api/admin/about',
    '/api/admin/resume',
    '/api/admin/messages',
    '/api/admin/settings'
  ];

  for (const api of protectedApis) {
    const res = await request({
      hostname: 'localhost',
      port: 4173,
      path: api,
      method: 'GET'
    });
    assert(
      res.statusCode === 401 && res.json && res.json.error,
      `Unauthenticated GET ${api} -> 401 Unauthorized (Got ${res.statusCode})`
    );
  }

  console.log('\n====================================================');
  console.log('3. TESTING PUBLIC DATA PRIVACY & SANITIZATION');
  console.log('====================================================');

  const pubDataRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/public/data',
    method: 'GET'
  });
  assert(pubDataRes.statusCode === 200, `GET /api/public/data returns HTTP 200`);
  assert(pubDataRes.json && pubDataRes.json.profile && pubDataRes.json.projects, `Public data contains profile and projects`);
  assert(!pubDataRes.json.messages, `Public data strictly OMITTED private messages`);
  assert(!pubDataRes.json.auth, `Public data strictly OMITTED auth credentials`);
  assert(!pubDataRes.json.sessions, `Public data strictly OMITTED session registry`);

  console.log('\n====================================================');
  console.log('4. TESTING PUBLIC CONTACT INQUIRY SUBMISSION');
  console.log('====================================================');

  const contactRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/contact',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Emily Watson',
    email: 'emily.watson@tier1-infra.com',
    subject: 'Staff SWE Role — Distributed Storage Systems',
    message: 'Hello Alex, we thoroughly evaluated your TraceFlow case study and Raft simulation work. We would love to discuss our high-throughput storage openings for 2026/2027.'
  });
  assert(contactRes.statusCode === 200, `POST /api/contact successfully accepted valid recruiter inquiry`);
  assert(contactRes.json && contactRes.json.success === true, `Response confirms inquiry recorded`);

  console.log('\n====================================================');
  console.log('5. TESTING OWNER AUTHENTICATION & SESSION MANAGEMENT');
  console.log('====================================================');

  const db = require('./server/db');
  const authRecord = db.getAuth();
  const testEmail = authRecord ? authRecord.email : 'raghavendraraghu71537@gmail.com';

  const badLoginRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testEmail,
    password: 'IncorrectPassword123!'
  });
  assert(badLoginRes.statusCode === 401, `Invalid password rejected with HTTP 401`);

  // Valid login
  const validLoginRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testEmail,
    password: process.env.OWNER_PASSWORD || 'Admin@2026!Secure'
  });
  assert(validLoginRes.statusCode === 200, `Valid owner login returns HTTP 200`);
  assert(validLoginRes.json && validLoginRes.json.success === true, `Login JSON confirms success`);
  assert(validLoginRes.json.csrfToken, `Received CSRF token for state-mutating requests`);
  csrfToken = validLoginRes.json.csrfToken;

  const cookieHeader = validLoginRes.headers['set-cookie'];
  assert(cookieHeader && cookieHeader.length > 0, `Set-Cookie header received`);
  sessionCookie = cookieHeader[0].split(';')[0];
  assert(sessionCookie.startsWith('owner_session='), `owner_session cookie received`);
  assert(cookieHeader[0].includes('HttpOnly'), `Cookie is marked HttpOnly`);
  assert(cookieHeader[0].includes('SameSite=Strict'), `Cookie has SameSite=Strict protection`);

  console.log('\n====================================================');
  console.log('6. TESTING AUTHENTICATED ACCESS TO PROTECTED ADMIN PAGES');
  console.log('====================================================');

  for (const route of adminRoutes) {
    const res = await request({
      hostname: 'localhost',
      port: 4173,
      path: route,
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    assert(
      res.statusCode === 200,
      `Authenticated GET ${route} -> HTTP 200 OK (Served admin view)`
    );
  }

  // When logged in, /admin/login should redirect to /admin/dashboard
  const loggedInLoginRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/admin/login',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });
  assert(
    loggedInLoginRes.statusCode === 302 && loggedInLoginRes.headers.location === '/admin/dashboard',
    `Authenticated visit to /admin/login redirects to /admin/dashboard`
  );

  console.log('\n====================================================');
  console.log('7. TESTING AUTHENTICATED ADMIN REST OPERATIONS & CSRF');
  console.log('====================================================');

  // Dashboard Stats
  const dashRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/admin/dashboard',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });
  assert(dashRes.statusCode === 200, `GET /api/admin/dashboard returns HTTP 200`);
  assert(dashRes.json && dashRes.json.stats && dashRes.json.stats.projectsCount >= 3, `Stats include project count >= 3`);
  assert(dashRes.json.stats.totalMessages >= 1, `Stats reflect stored recruiter inquiries`);

  // Messages Inbox
  const msgListRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/admin/messages',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });
  assert(msgListRes.statusCode === 200, `GET /api/admin/messages returns HTTP 200`);
  assert(Array.isArray(msgListRes.json) && msgListRes.json.length >= 1, `Messages array contains incoming inquiries`);
  const receivedMsg = msgListRes.json.find(m => m.email === 'emily.watson@tier1-infra.com');
  assert(receivedMsg !== undefined, `Found submitted inquiry from Emily Watson`);

  // CSRF Protection Check: Attempt mutation without CSRF token
  const noCsrfRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    }
  }, { recruiterSlaText: 'Malicious modification without CSRF' });
  assert(noCsrfRes.statusCode === 403, `Mutation without CSRF token rejected with HTTP 403 Forbidden`);

  // Valid mutation with CSRF token
  const updateSettingsRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/admin/settings',
    method: 'PUT',
    headers: {
      'Cookie': sessionCookie,
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json'
    }
  }, { recruiterSlaText: 'Typically within 12 hours' });
  assert(updateSettingsRes.statusCode === 200, `Mutation with valid CSRF token accepted (HTTP 200)`);
  assert(updateSettingsRes.json.settings.recruiterSlaText === 'Typically within 12 hours', `Setting value successfully updated`);

  // Resume Metadata
  const resumeRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/admin/resume',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });
  assert(resumeRes.statusCode === 200, `GET /api/admin/resume returns HTTP 200`);

  console.log('\n====================================================');
  console.log('8. TESTING PUBLIC PORTFOLIO NON-REGRESSION (READ-ONLY)');
  console.log('====================================================');

  const publicPages = [
    '/',
    '/index.html',
    '/about',
    '/about.html',
    '/projects',
    '/projects.html',
    '/experience',
    '/experience.html',
    '/skills',
    '/skills.html',
    '/achievements',
    '/achievements.html',
    '/resume',
    '/resume.html',
    '/contact',
    '/contact.html',
    '/case-study.html'
  ];

  for (const p of publicPages) {
    const res = await request({
      hostname: 'localhost',
      port: 4173,
      path: p,
      method: 'GET'
    });
    assert(
      res.statusCode === 200 && res.body.includes('<!DOCTYPE html>'),
      `Public page GET ${p} -> HTTP 200 OK with valid HTML`
    );
  }

  console.log('\n====================================================');
  console.log('9. TESTING LOGOUT & SESSION INVALIDATION');
  console.log('====================================================');

  const logoutRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Cookie': sessionCookie }
  });
  assert(logoutRes.statusCode === 200, `POST /api/auth/logout returns HTTP 200`);

  const postLogoutRes = await request({
    hostname: 'localhost',
    port: 4173,
    path: '/admin/dashboard',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });
  assert(
    postLogoutRes.statusCode === 302 && postLogoutRes.headers.location.startsWith('/admin/login'),
    `Post-logout request to /admin/dashboard redirects to /admin/login (Session revoked)`
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${testsPassed} / ${testsRun} PASSED`);
  console.log('====================================================');

  if (testsPassed === testsRun) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
