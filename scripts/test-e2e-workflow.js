/**
 * FINAL END-TO-END OWNER WORKFLOW VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Owner login works (valid/invalid, cookies, CSRF).
 * 2. Owner can access every admin section (all 12 HTML routes & APIs).
 * 3. Owner CRUD operations persist correctly (Create, Read, Update, Delete).
 * 4. Public pages reflect published changes (and revert cleanly).
 * 5. Contact messages are strictly private to the owner.
 * 6. Logout invalidates the admin session.
 * 7. Unauthenticated users cannot access protected admin operations.
 * 8. Public users cannot mutate portfolio data (401/403 guards).
 * 9. No secrets or passwords are exposed (public API, static files, security logs).
 * 10. Zero residual fake data remains after testing.
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
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Admin@2026!Secure';

let passedCount = 0;
let totalCount = 0;
const resultsLog = [];

function recordResult(passed, category, description, extra = '') {
  totalCount++;
  if (passed) {
    passedCount++;
    const msg = `[PASS] ${category} > ${description}`;
    console.log(`  ✓ ${msg}`);
    resultsLog.push({ status: 'PASS', category, description, extra });
  } else {
    const msg = `[FAIL] ${category} > ${description} ${extra ? `(${extra})` : ''}`;
    console.error(`  ✗ ${msg}`);
    resultsLog.push({ status: 'FAIL', category, description, extra });
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

function extractCookie(res, cookieName) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    if (c.startsWith(`${cookieName}=`)) {
      const match = c.match(new RegExp(`^${cookieName}=([^;]+)`));
      return match ? match[1] : null;
    }
  }
  return null;
}

async function runE2EWorkflow() {
  console.log('================================================================');
  console.log('STARTING FINAL END-TO-END OWNER WORKFLOW VERIFICATION');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Owner:  ${OWNER_EMAIL}`);
  console.log('================================================================\n');

  // ==========================================================================
  // 1. OWNER LOGIN VERIFICATION
  // ==========================================================================
  console.log('[SECTION 1] VERIFYING OWNER LOGIN...');

  // 1a. Invalid credentials rejection
  const badLoginRes = await request({
    method: 'POST',
    path: '/api/auth/login'
  }, { email: OWNER_EMAIL, password: 'WrongPassword123!' });

  recordResult(
    badLoginRes.statusCode === 401 && badLoginRes.json?.error?.startsWith('Invalid email or password'),
    'Owner Login',
    'Invalid password rejected with HTTP 401 and generic error',
    `Status: ${badLoginRes.statusCode}, Error: ${badLoginRes.json?.error}`
  );

  // 1b. Valid owner authentication
  const goodLoginRes = await request({
    method: 'POST',
    path: '/api/auth/login'
  }, { email: OWNER_EMAIL, password: OWNER_PASSWORD });

  const sessionToken = extractCookie(goodLoginRes, 'owner_session');
  const csrfToken = goodLoginRes.json?.csrfToken;
  const rawSetCookie = Array.isArray(goodLoginRes.headers['set-cookie']) 
    ? goodLoginRes.headers['set-cookie'].join('; ') 
    : (goodLoginRes.headers['set-cookie'] || '');

  recordResult(
    goodLoginRes.statusCode === 200 && goodLoginRes.json?.success === true,
    'Owner Login',
    'Owner authenticates successfully with HTTP 200',
    `Status: ${goodLoginRes.statusCode}`
  );

  recordResult(
    Boolean(sessionToken),
    'Owner Login',
    'Received valid owner_session cookie upon authentication',
    `Token: ${sessionToken ? sessionToken.slice(0, 10) + '...' : 'none'}`
  );

  recordResult(
    rawSetCookie.includes('HttpOnly') && rawSetCookie.includes('SameSite=Strict'),
    'Owner Login',
    'Session cookie enforces HttpOnly and SameSite=Strict security flags'
  );

  recordResult(
    Boolean(csrfToken && typeof csrfToken === 'string' && csrfToken.length >= 32),
    'Owner Login',
    'Received cryptographic CSRF token for mutating requests'
  );

  const authHeaders = {
    'Cookie': `owner_session=${sessionToken}`,
    'X-CSRF-Token': csrfToken
  };

  // ==========================================================================
  // 2. OWNER ACCESS TO EVERY ADMIN SECTION
  // ==========================================================================
  console.log('\n[SECTION 2] VERIFYING OWNER ACCESS TO EVERY ADMIN SECTION...');

  const adminSections = [
    { route: '/admin', name: 'Admin Root (redirects or renders dashboard)' },
    { route: '/admin/dashboard', name: 'Dashboard' },
    { route: '/admin/profile', name: 'Profile Editor' },
    { route: '/admin/projects', name: 'Projects Manager' },
    { route: '/admin/experience', name: 'Experience Manager' },
    { route: '/admin/skills', name: 'Skills Taxonomy' },
    { route: '/admin/achievements', name: 'Achievements Editor' },
    { route: '/admin/about', name: 'About Editor' },
    { route: '/admin/resume', name: 'Resume Manager' },
    { route: '/admin/messages', name: 'Recruiter Messages' },
    { route: '/admin/settings', name: 'Settings & Security Policy' },
    { route: '/admin/security', name: 'Owner Security Center' }
  ];

  for (const sec of adminSections) {
    const secRes = await request({
      path: sec.route,
      headers: { 'Cookie': `owner_session=${sessionToken}` }
    });
    const isOk = secRes.statusCode === 200 || (secRes.statusCode === 302 && sec.route === '/admin');
    recordResult(
      isOk,
      'Admin Section Access',
      `Owner accesses ${sec.name} (${sec.route})`,
      `Status: ${secRes.statusCode}`
    );
  }

  // Also verify core API read endpoints for the sections
  const adminApis = [
    '/api/admin/dashboard',
    '/api/admin/profile',
    '/api/admin/projects',
    '/api/admin/experience',
    '/api/admin/skills',
    '/api/admin/achievements',
    '/api/admin/about',
    '/api/admin/resume',
    '/api/admin/messages',
    '/api/admin/settings',
    '/api/admin/security/overview'
  ];

  let apisPassed = true;
  for (const apiRoute of adminApis) {
    const apiRes = await request({
      path: apiRoute,
      headers: { 'Cookie': `owner_session=${sessionToken}` }
    });
    if (apiRes.statusCode !== 200) {
      apisPassed = false;
      console.error(`  ✗ API ${apiRoute} failed with status ${apiRes.statusCode}`);
    }
  }
  recordResult(
    apisPassed,
    'Admin API Access',
    'Owner accesses all 11 core admin REST API endpoints with HTTP 200'
  );

  // ==========================================================================
  // 3. OWNER CRUD OPERATIONS PERSIST CORRECTLY
  // ==========================================================================
  console.log('\n[SECTION 3] VERIFYING OWNER CRUD PERSISTENCE (CREATE, READ, UPDATE, DELETE)...');

  const testProjectPayload = {
    title: 'TEMP_E2E_VERIFICATION_PROJECT',
    slug: 'temp-e2e-verification-project',
    tagline: 'Temporary Project For Workflow Verification',
    category: 'Full-Stack Systems',
    status: 'Published',
    featured: true,
    summary: 'Created during automated E2E test to verify persistence.',
    role: 'Principal Engineer',
    team: 'Verification Suite',
    duration: '2026',
    problem: 'Need to verify end-to-end CRUD persistence without residue.',
    solution: 'Automated test creates, reads, updates, and deletes this entity.',
    technologies: ['Node.js', 'HTTP/1.1', 'JSON Database'],
    metrics: [{ label: 'Integrity', value: '100%' }],
    githubUrl: 'https://github.com/example/test-temp',
    liveUrl: 'https://example.com/test-temp'
  };

  // 3a. CREATE
  const createProjRes = await request({
    method: 'POST',
    path: '/api/admin/projects',
    headers: authHeaders
  }, testProjectPayload);

  const createdProject = createProjRes.json?.project;
  const createdProjId = createdProject?.id;

  recordResult(
    createProjRes.statusCode === 201 && Boolean(createdProjId),
    'Owner CRUD',
    'CREATE project succeeds (HTTP 201) and returns assigned ID',
    `ID: ${createdProjId}`
  );

  // 3b. READ
  const getProjRes = await request({
    path: `/api/admin/projects/${createdProjId}`,
    headers: authHeaders
  });

  recordResult(
    getProjRes.statusCode === 200 && getProjRes.json?.title === testProjectPayload.title,
    'Owner CRUD',
    'READ created project confirms persistence in storage',
    `Title: ${getProjRes.json?.title}`
  );

  // 3c. UPDATE
  const updatePayload = {
    ...testProjectPayload,
    title: 'TEMP_E2E_VERIFICATION_PROJECT_UPDATED',
    tagline: 'Updated Tagline For Persistence Verification'
  };

  const updateProjRes = await request({
    method: 'PUT',
    path: `/api/admin/projects/${createdProjId}`,
    headers: authHeaders
  }, updatePayload);

  recordResult(
    updateProjRes.statusCode === 200 && updateProjRes.json?.project?.title === updatePayload.title,
    'Owner CRUD',
    'UPDATE project modifies fields and persists to storage',
    `Updated Title: ${updateProjRes.json?.project?.title}`
  );

  // Verify updated read
  const verifyUpdateRes = await request({
    path: `/api/admin/projects/${createdProjId}`,
    headers: authHeaders
  });

  recordResult(
    verifyUpdateRes.statusCode === 200 && verifyUpdateRes.json?.tagline === updatePayload.tagline,
    'Owner CRUD',
    'READ after UPDATE confirms changes persisted in persistent database'
  );

  // ==========================================================================
  // 4. PUBLIC PAGES REFLECT PUBLISHED CHANGES
  // ==========================================================================
  console.log('\n[SECTION 4] VERIFYING PUBLIC PAGES REFLECT PUBLISHED CHANGES...');

  // Check public API while project is published
  const pubDataWithProj = await request({ path: '/api/public/data' });
  const foundInPublic = pubDataWithProj.json?.projects?.some(p => p.id === createdProjId && p.title === updatePayload.title);

  recordResult(
    pubDataWithProj.statusCode === 200 && foundInPublic,
    'Public Reflection',
    'Public API (/api/public/data) immediately reflects newly published project'
  );

  // Check public projects page
  const pubProjectsPage = await request({ path: '/projects' });
  recordResult(
    pubProjectsPage.statusCode === 200 && pubProjectsPage.body.includes('Projects'),
    'Public Reflection',
    'Public /projects page responds with HTTP 200 and valid layout'
  );

  // 3d. DELETE & CLEANUP TEMPORARY PROJECT
  const delProjRes = await request({
    method: 'DELETE',
    path: `/api/admin/projects/${createdProjId}`,
    headers: authHeaders
  });

  recordResult(
    delProjRes.statusCode === 200 && delProjRes.json?.success === true,
    'Owner CRUD',
    'DELETE project succeeds (HTTP 200) and removes entity'
  );

  // Verify public API no longer has the project
  const pubDataAfterDel = await request({ path: '/api/public/data' });
  const stillInPublic = pubDataAfterDel.json?.projects?.some(p => p.id === createdProjId);

  recordResult(
    !stillInPublic,
    'Public Reflection',
    'Deleted project is immediately removed from public API (no stale cache/data)'
  );

  // Verify admin GET confirms deletion
  const getAfterDel = await request({
    path: `/api/admin/projects/${createdProjId}`,
    headers: authHeaders
  });

  recordResult(
    getAfterDel.statusCode === 404,
    'Owner CRUD',
    'READ after DELETE returns HTTP 404 Not Found'
  );

  // ==========================================================================
  // 5. CONTACT MESSAGES ARE PRIVATE TO THE OWNER
  // ==========================================================================
  console.log('\n[SECTION 5] VERIFYING CONTACT MESSAGES PRIVACY...');

  // 5a. Submit a confidential recruiter inquiry
  const testMessagePayload = {
    name: 'E2E Confidential Recruiter',
    email: 'confidential.recruiter@tech-innovators.io',
    subject: 'CONFIDENTIAL_E2E_INQUIRY',
    message: 'This is a strictly private inquiry for testing owner message privacy.'
  };

  const contactSubmitRes = await request({
    method: 'POST',
    path: '/api/contact'
  }, testMessagePayload);

  recordResult(
    contactSubmitRes.statusCode === 200 && contactSubmitRes.json?.success === true,
    'Message Privacy',
    'Public contact inquiry submitted successfully (HTTP 200)'
  );

  // 5b. Unauthenticated visitor cannot read messages
  const unauthMessagesRes = await request({
    path: '/api/admin/messages'
  });

  recordResult(
    unauthMessagesRes.statusCode === 401,
    'Message Privacy',
    'Unauthenticated GET /api/admin/messages is blocked with HTTP 401'
  );

  // 5c. Public data strictly omits messages
  const pubDataCheck = await request({ path: '/api/public/data' });
  recordResult(
    pubDataCheck.statusCode === 200 && typeof pubDataCheck.json?.messages === 'undefined',
    'Message Privacy',
    'Public API (/api/public/data) strictly excludes private recruiter messages'
  );

  // 5d. Direct file access to messages.json is forbidden
  const staticMsgRes = await request({ path: '/data/messages.json' });
  recordResult(
    staticMsgRes.statusCode === 403,
    'Message Privacy',
    'Direct static access to /data/messages.json is blocked with HTTP 403'
  );

  // 5e. Authenticated owner reads messages & locates test inquiry
  const authMessagesRes = await request({
    path: '/api/admin/messages',
    headers: authHeaders
  });

  const foundMsg = Array.isArray(authMessagesRes.json) 
    ? authMessagesRes.json.find(m => m.subject === testMessagePayload.subject)
    : null;

  recordResult(
    authMessagesRes.statusCode === 200 && Boolean(foundMsg),
    'Message Privacy',
    'Authenticated owner reads inbox and retrieves confidential message',
    `Found ID: ${foundMsg?.id}`
  );

  // 5f. Clean up test message immediately
  if (foundMsg?.id) {
    const delMsgRes = await request({
      method: 'DELETE',
      path: `/api/admin/messages/${foundMsg.id}`,
      headers: authHeaders
    });
    recordResult(
      delMsgRes.statusCode === 200 && delMsgRes.json?.success === true,
      'Message Privacy',
      'Test message cleanly deleted from inbox (zero test residue)'
    );
  }

  // ==========================================================================
  // 6. LOGOUT INVALIDATES THE ADMIN SESSION
  // ==========================================================================
  console.log('\n[SECTION 6] VERIFYING LOGOUT SESSION INVALIDATION...');

  // Create a separate login session specifically to test logout
  const sessionToLogoutRes = await request({
    method: 'POST',
    path: '/api/auth/login'
  }, { email: OWNER_EMAIL, password: OWNER_PASSWORD });

  const logoutSessionToken = extractCookie(sessionToLogoutRes, 'owner_session');
  const logoutCsrf = sessionToLogoutRes.json?.csrfToken;

  const logoutHeaders = {
    'Cookie': `owner_session=${logoutSessionToken}`,
    'X-CSRF-Token': logoutCsrf
  };

  // Verify it works prior to logout
  const preLogoutCheck = await request({
    path: '/api/admin/dashboard',
    headers: logoutHeaders
  });
  recordResult(
    preLogoutCheck.statusCode === 200,
    'Session Invalidation',
    'Fresh session authenticated and authorized prior to logout'
  );

  // Perform logout
  const logoutRes = await request({
    method: 'POST',
    path: '/api/auth/logout',
    headers: logoutHeaders
  });

  recordResult(
    logoutRes.statusCode === 200 && logoutRes.json?.success === true,
    'Session Invalidation',
    'POST /api/auth/logout executes successfully with HTTP 200'
  );

  // Attempt API access with invalidated session
  const postLogoutApi = await request({
    path: '/api/admin/dashboard',
    headers: { 'Cookie': `owner_session=${logoutSessionToken}` }
  });

  recordResult(
    postLogoutApi.statusCode === 401,
    'Session Invalidation',
    'Revoked session immediately denied API access (HTTP 401)'
  );

  // Attempt HTML route access with invalidated session
  const postLogoutHtml = await request({
    path: '/admin/dashboard',
    headers: { 'Cookie': `owner_session=${logoutSessionToken}` }
  });

  recordResult(
    postLogoutHtml.statusCode === 302 && postLogoutHtml.headers.location?.includes('/admin/login'),
    'Session Invalidation',
    'Revoked session immediately redirected to /admin/login (HTTP 302)'
  );

  // ==========================================================================
  // 7. UNAUTHENTICATED USERS CANNOT ACCESS PROTECTED ADMIN OPERATIONS
  // ==========================================================================
  console.log('\n[SECTION 7] VERIFYING UNAUTHENTICATED GUARDS...');

  const protectedHtmlRoutes = [
    '/admin/dashboard',
    '/admin/profile',
    '/admin/projects',
    '/admin/experience',
    '/admin/skills',
    '/admin/achievements',
    '/admin/about',
    '/admin/resume',
    '/admin/messages',
    '/admin/settings',
    '/admin/security'
  ];

  let allGuardsPassed = true;
  for (const pRoute of protectedHtmlRoutes) {
    const res = await request({ path: pRoute });
    if (res.statusCode !== 302 || !res.headers.location?.includes('/admin/login')) {
      allGuardsPassed = false;
      console.error(`  ✗ Route ${pRoute} allowed unauthenticated access (Status: ${res.statusCode})`);
    }
  }

  recordResult(
    allGuardsPassed,
    'Unauthenticated Guards',
    'All 11 protected admin HTML views strictly redirect unauthenticated visitors to /admin/login (302)'
  );

  // ==========================================================================
  // 8. PUBLIC USERS CANNOT MUTATE PORTFOLIO DATA
  // ==========================================================================
  console.log('\n[SECTION 8] VERIFYING PUBLIC MUTATION REJECTION (401/403)...');

  const mutationTests = [
    { method: 'POST', path: '/api/admin/projects', payload: { title: 'Hack' }, desc: 'Create Project' },
    { method: 'PUT', path: '/api/admin/profile', payload: { fullName: 'Hacker' }, desc: 'Update Profile' },
    { method: 'DELETE', path: '/api/admin/projects/proj-1', desc: 'Delete Project' },
    { method: 'POST', path: '/api/admin/experience', payload: { role: 'Hacker' }, desc: 'Create Experience' },
    { method: 'PUT', path: '/api/admin/settings', payload: { maintenanceMode: true }, desc: 'Update Settings' },
    { method: 'POST', path: '/api/admin/security/audit', desc: 'Trigger Security Audit' },
    { method: 'POST', path: '/api/admin/security/sessions/revoke', payload: { sessionId: 'fake' }, desc: 'Revoke Session' }
  ];

  let mutationsBlocked = true;
  for (const mTest of mutationTests) {
    const res = await request({
      method: mTest.method,
      path: mTest.path
    }, mTest.payload || null);

    if (res.statusCode !== 401) {
      mutationsBlocked = false;
      console.error(`  ✗ Unauthenticated mutation ${mTest.method} ${mTest.path} returned ${res.statusCode}`);
    }
  }

  recordResult(
    mutationsBlocked,
    'Mutation Rejection',
    'All unauthenticated mutation attempts across projects, profile, settings, and security rejected with HTTP 401'
  );

  // Forged session token attempt
  const forgedRes = await request({
    method: 'POST',
    path: '/api/admin/projects',
    headers: {
      'Cookie': 'owner_session=forged_malicious_token_12345',
      'X-CSRF-Token': 'forged_csrf'
    }
  }, { title: 'Forged' });

  recordResult(
    forgedRes.statusCode === 401,
    'Mutation Rejection',
    'Forged session token rejected with HTTP 401 Unauthorized'
  );

  // Missing CSRF token with valid session
  const missingCsrfRes = await request({
    method: 'POST',
    path: '/api/admin/projects',
    headers: {
      'Cookie': `owner_session=${sessionToken}`
    }
  }, { title: 'Missing CSRF' });

  recordResult(
    missingCsrfRes.statusCode === 403,
    'Mutation Rejection',
    'Authenticated mutation missing CSRF token rejected with HTTP 403 Forbidden'
  );

  // ==========================================================================
  // 9. NO SECRETS OR PASSWORDS EXPOSED
  // ==========================================================================
  console.log('\n[SECTION 9] VERIFYING ZERO SECRETS OR PASSWORDS EXPOSED...');

  // 9a. Public API payload inspection
  const publicApiRes = await request({ path: '/api/public/data' });
  const rawPublicJson = JSON.stringify(publicApiRes.json || {});
  const publicExposesSecrets = 
    rawPublicJson.includes(OWNER_PASSWORD) ||
    rawPublicJson.includes('"password":') ||
    rawPublicJson.includes('"passwordHash":') ||
    rawPublicJson.includes('"salt":') ||
    rawPublicJson.includes('owner_session=') ||
    rawPublicJson.includes('"csrfToken":') ||
    typeof publicApiRes.json?.sessions !== 'undefined' ||
    typeof publicApiRes.json?.auth !== 'undefined' ||
    typeof publicApiRes.json?.messages !== 'undefined';

  recordResult(
    !publicExposesSecrets,
    'Secret Isolation',
    'Public API payload strictly contains zero passwords, salts, hashes, tokens, or sessions'
  );

  // 9b. Static file protection
  const sensitiveFiles = [
    '/.env',
    '/.env.example',
    '/data/auth.json',
    '/data/sessions.json',
    '/data/settings.json',
    '/server.js',
    '/server/auth.js',
    '/server/security.js',
    '/data/security-events.json'
  ];

  let sensitiveFilesProtected = true;
  for (const sFile of sensitiveFiles) {
    const sRes = await request({ path: sFile });
    if (sRes.statusCode !== 403) {
      sensitiveFilesProtected = false;
      console.error(`  ✗ Sensitive file ${sFile} returned status ${sRes.statusCode}`);
    }
  }

  recordResult(
    sensitiveFilesProtected,
    'Secret Isolation',
    'All sensitive files (.env, auth.json, sessions.json, security-events.json, server.js) blocked with HTTP 403'
  );

  // 9c. Public security page inspection
  const pubSecRes = await request({ path: '/security' });
  const secPageLeaked = 
    pubSecRes.body.includes(OWNER_PASSWORD) ||
    pubSecRes.body.includes(OWNER_EMAIL) ||
    pubSecRes.body.includes('sessionId') ||
    pubSecRes.body.includes('sessionToken');

  recordResult(
    !secPageLeaked,
    'Secret Isolation',
    'Public /security page strictly omits owner email, password, and session identifiers'
  );

  // ==========================================================================
  // 10. VERIFY CLEAN DATABASE STATE (ZERO RESIDUAL TEST DATA)
  // ==========================================================================
  console.log('\n[SECTION 10] VERIFYING CLEAN STATE & ZERO TEST RESIDUE...');

  const dbDataPath = path.join(ROOT_DIR, 'data', 'portfolio-db.json');
  const dbData = JSON.parse(fs.readFileSync(dbDataPath, 'utf-8'));
  const hasResidualTestProjects = (dbData.projects || []).some(p => p.title.includes('TEMP_'));
  const hasResidualTestAch = (dbData.achievements || []).some(a => a.title.includes('TEMP_'));

  const msgsPath = path.join(ROOT_DIR, 'data', 'messages.json');
  const msgsData = JSON.parse(fs.readFileSync(msgsPath, 'utf-8'));
  const hasResidualTestMessages = (msgsData || []).some(m => m.subject.includes('CONFIDENTIAL_E2E_INQUIRY'));

  const resumePdfPath = path.join(ROOT_DIR, 'assets', 'Alex_Rivera_Software_Engineer_Resume.pdf');
  const resumeSize = fs.existsSync(resumePdfPath) ? fs.statSync(resumePdfPath).size : 0;

  recordResult(
    !hasResidualTestProjects && !hasResidualTestAch,
    'Clean State',
    'Zero residual test projects or achievements in portfolio database'
  );

  recordResult(
    !hasResidualTestMessages,
    'Clean State',
    'Zero residual test messages in recruiter message storage'
  );

  recordResult(
    resumeSize > 4000,
    'Clean State',
    'Authentic ATS Resume PDF remains intact and preserved (>4000 bytes)',
    `Size: ${resumeSize} bytes`
  );

  // Clean up primary test session on completion
  await request({
    method: 'POST',
    path: '/api/auth/logout',
    headers: authHeaders
  });

  // ==========================================================================
  // FINAL E2E SUMMARY
  // ==========================================================================
  console.log('\n================================================================');
  console.log('FINAL END-TO-END WORKFLOW TEST SUMMARY');
  console.log('================================================================');
  console.log(`Total Verification Steps: ${totalCount}`);
  console.log(`Passed:                   ${passedCount} / ${totalCount}`);
  console.log(`Failed:                   ${totalCount - passedCount}`);
  console.log('================================================================\n');

  if (passedCount === totalCount) {
    console.log('>>> ALL END-TO-END OWNER WORKFLOW TESTS PASSED WITH 100% SUCCESS! <<<\n');
  } else {
    console.error('>>> SOME END-TO-END TESTS FAILED. PLEASE REVIEW LOGS ABOVE. <<<\n');
  }

  return { totalCount, passedCount, resultsLog };
}

runE2EWorkflow().catch(err => {
  console.error('Fatal execution error during E2E verification:', err);
  process.exit(1);
});
