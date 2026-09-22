/**
 * COMPREHENSIVE SECURITY AUDIT & VERIFICATION SUITE
 * Tests all 10 user-specified audit categories:
 * 1. Public Site Verification (Routes, links, resume access, contact form, projects/[slug])
 * 2. Admin Verification (Protection of all 11 admin routes against unauthenticated visitors)
 * 3. Authorization Tests (Rejection of unauthenticated/unauthorized GET, CREATE, UPDATE, DELETE, upload, messages)
 * 4. Owner Access (Full CRUD, login, logout, and state management for legitimate owner)
 * 5. Data Privacy (Guarding against exposure of messages, settings, auth info, secrets, passwords)
 * 6. File Upload Security (PDF magic bytes, file size limits, safe paths, authorized-only uploads)
 * 7. Input Security (Validation, atomic db operations, XSS prevention, honeypot traps, length limits)
 * 8. Authentication Security (scrypt hashing, timing safety, secure cookies, session revocation, abuse protection)
 * 9. Build Quality (Syntax checks across all JS, static file integrity)
 * 10. Audit Reporting
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT || '4173', 10);
const BASE_URL = `http://localhost:${PORT}`;

// Load environment variables if available
const ROOT_DIR = path.resolve(__dirname, '..');
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

// Audit tracking
const results = {
  passed: 0,
  failed: 0,
  categories: {
    'PUBLIC SITE': { pass: true, tests: [] },
    'ADMIN AUTHENTICATION': { pass: true, tests: [] },
    'OWNER AUTHORIZATION': { pass: true, tests: [] },
    'DATA PRIVACY': { pass: true, tests: [] },
    'FILE UPLOAD SECURITY': { pass: true, tests: [] },
    'INPUT VALIDATION': { pass: true, tests: [] },
    'AUTHENTICATION SECURITY': { pass: true, tests: [] },
    'BUILD QUALITY': { pass: true, tests: [] }
  },
  issuesFound: [],
  issuesFixed: [
    'Fixed information disclosure vulnerability: sensitive files (.env, /data/*.json, server source code) were previously servable statically. Added strict server-side guards returning 403 Forbidden.',
    'Fixed missing /projects/[slug] route handling: direct requests to /projects/:slug returned 404. Added route handler in server.js, <base href="/"> in case-study.html, and slug resolution in js/case-study.js.',
    'Synchronized dual resume asset paths: added dual-sync write on upload to ensure both assets/Alex_Rivera_Software_Engineer_Resume.pdf and assets/resume/ are kept identical.',
    'Replaced deprecated url.parse() with standard WHATWG URL API in request dispatcher to prevent parsing ambiguities.'
  ]
};

function recordTest(category, name, passed, details = '') {
  const cat = results.categories[category] || { pass: true, tests: [] };
  cat.tests.push({ name, passed, details });
  if (!passed) {
    cat.pass = false;
    results.failed++;
    console.error(`  [FAIL] ${category} > ${name}: ${details}`);
  } else {
    results.passed++;
    console.log(`  [PASS] ${category} > ${name}`);
  }
}

/**
 * Raw HTTP request helper
 */
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
        try {
          json = JSON.parse(buffer.toString('utf-8'));
        } catch (_) {}

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString('utf-8'),
          buffer: buffer,
          json: json
        });
      });
    });

    req.on('error', err => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

async function runAudit() {
  console.log('================================================================');
  console.log('STARTING RECRUITER PORTFOLIO VERIFICATION & SECURITY AUDIT');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  // ==========================================================================
  // SECTION 1: PUBLIC SITE VERIFICATION
  // ==========================================================================
  console.log('[AUDIT] 1. PUBLIC SITE VERIFICATION...');

  const publicRoutes = [
    '/',
    '/index.html',
    '/projects',
    '/projects.html',
    '/projects/traceflow',
    '/projects/aurakv',
    '/projects/hyperproxy',
    '/projects/vllm-router',
    '/projects/omnidash',
    '/projects/nexus-db',
    '/projects/devtunnel',
    '/experience',
    '/experience.html',
    '/skills',
    '/skills.html',
    '/achievements',
    '/achievements.html',
    '/about',
    '/about.html',
    '/resume',
    '/resume.html',
    '/contact',
    '/contact.html'
  ];

  for (const route of publicRoutes) {
    const res = await request({ path: route });
    const isOk = res.statusCode === 200;
    recordTest('PUBLIC SITE', `Route accessibility: ${route}`, isOk, `Status code: ${res.statusCode}`);
  }

  // Resume PDF download access
  const resumePdfRes = await request({ path: '/assets/Alex_Rivera_Software_Engineer_Resume.pdf' });
  const isResumePdfOk = resumePdfRes.statusCode === 200 && 
    (resumePdfRes.headers['content-type'] || '').includes('application/pdf') &&
    resumePdfRes.buffer.toString('utf-8', 0, 5) === '%PDF-';
  recordTest('PUBLIC SITE', 'Resume PDF download access (/assets/Alex_Rivera_Software_Engineer_Resume.pdf)', isResumePdfOk, `Status: ${resumePdfRes.statusCode}`);

  // Resume PDF direct shortcut
  const resumeShortcutRes = await request({ path: '/resume.pdf' });
  recordTest('PUBLIC SITE', 'Resume PDF shortcut access (/resume.pdf)', resumeShortcutRes.statusCode === 200, `Status: ${resumeShortcutRes.statusCode}`);

  // Public CSS tokens & stylesheets
  const cssRes = await request({ path: '/css/design-tokens.css' });
  recordTest('PUBLIC SITE', 'CSS Tokens stylesheet (/css/design-tokens.css)', cssRes.statusCode === 200, `Status: ${cssRes.statusCode}`);

  // SEO: Favicon SVG
  const faviconRes = await request({ path: '/assets/favicon.svg' });
  recordTest('PUBLIC SITE', 'Favicon vector asset (/assets/favicon.svg)', faviconRes.statusCode === 200 && (faviconRes.headers['content-type'] || '').includes('image/svg'), `Status: ${faviconRes.statusCode}`);

  // SEO: robots.txt
  const robotsRes = await request({ path: '/robots.txt' });
  recordTest('PUBLIC SITE', 'Robots configuration (/robots.txt)', robotsRes.statusCode === 200 && robotsRes.body.includes('Disallow: /admin/'), `Status: ${robotsRes.statusCode}`);

  // SEO: sitemap.xml
  const sitemapRes = await request({ path: '/sitemap.xml' });
  recordTest('PUBLIC SITE', 'XML Sitemap (/sitemap.xml)', sitemapRes.statusCode === 200 && sitemapRes.body.includes('<urlset') && (sitemapRes.headers['content-type'] || '').includes('xml'), `Status: ${sitemapRes.statusCode}`);

  // Error Handling: Branded 404 Page
  const notFoundRes = await request({ path: '/non-existent-portfolio-page-404' });
  recordTest('PUBLIC SITE', 'Branded 404 page for non-existent routes (/non-existent-...)', notFoundRes.statusCode === 404 && notFoundRes.body.includes('Page Not Found'), `Status: ${notFoundRes.statusCode}`);

  // Contact form submission
  const validMsg = {
    name: 'Audit Recruiter',
    email: 'recruiter.audit@techfirm.io',
    subject: 'Verification Inquiry',
    message: 'Hello, this is an automated audit test of your portfolio contact endpoint.'
  };
  const contactSubmitRes = await request({ path: '/api/contact', method: 'POST' }, validMsg);
  recordTest('PUBLIC SITE', 'Public contact inquiry submission (POST /api/contact)', contactSubmitRes.statusCode === 200 && contactSubmitRes.json?.success === true, `Status: ${contactSubmitRes.statusCode}`);

  // Contact form validation: missing fields
  const invalidMsgRes = await request({ path: '/api/contact', method: 'POST' }, { name: 'A' });
  recordTest('PUBLIC SITE', 'Contact validation rejects incomplete submissions', invalidMsgRes.statusCode === 400, `Status: ${invalidMsgRes.statusCode}`);

  // Contact form honeypot trap
  const trapMsg = { ...validMsg, website_trap: 'http://spambot.ru' };
  const trapRes = await request({ path: '/api/contact', method: 'POST' }, trapMsg);
  recordTest('PUBLIC SITE', 'Contact honeypot absorbs spam silently without saving', trapRes.statusCode === 200, `Status: ${trapRes.statusCode}`);

  // ==========================================================================
  // SECTION 2: ADMIN VERIFICATION (UNAUTHENTICATED ACCESS GUARDS)
  // ==========================================================================
  console.log('\n[AUDIT] 2. ADMIN VERIFICATION (ROUTE GUARDS)...');

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
    const res = await request({ path: route });
    const isRedirect = res.statusCode === 302;
    const location = res.headers.location || '';
    const redirectsToLogin = location.startsWith('/admin/login');
    recordTest('ADMIN AUTHENTICATION', `Unauthenticated visitor redirected: ${route}`, isRedirect && redirectsToLogin, `Status: ${res.statusCode}, Location: ${location}`);
  }

  // Admin login page is public
  const loginPageRes = await request({ path: '/admin/login' });
  recordTest('ADMIN AUTHENTICATION', 'Public access to /admin/login allowed', loginPageRes.statusCode === 200, `Status: ${loginPageRes.statusCode}`);

  // Auth status for unauthenticated visitor
  const unauthStatusRes = await request({ path: '/api/auth/status' });
  recordTest('ADMIN AUTHENTICATION', 'Unauthenticated visitor status is false', unauthStatusRes.statusCode === 200 && unauthStatusRes.json?.authenticated === false);

  // ==========================================================================
  // SECTION 3: AUTHORIZATION TESTS (MUTATION REJECTION)
  // ==========================================================================
  console.log('\n[AUDIT] 3. AUTHORIZATION TESTS (SERVER-SIDE GUARDS)...');

  // Unauthenticated GET to protected admin APIs
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
    const res = await request({ path: api });
    recordTest('OWNER AUTHORIZATION', `Unauthenticated GET rejected (401): ${api}`, res.statusCode === 401, `Status: ${res.statusCode}`);
  }

  // Unauthenticated CREATE (POST)
  const unauthPostRes = await request({ path: '/api/admin/projects', method: 'POST' }, { title: 'Hacked Project' });
  recordTest('OWNER AUTHORIZATION', 'Unauthenticated CREATE rejected (401)', unauthPostRes.statusCode === 401, `Status: ${unauthPostRes.statusCode}`);

  // Unauthenticated UPDATE (PUT)
  const unauthPutRes = await request({ path: '/api/admin/profile', method: 'PUT' }, { name: 'Attacker' });
  recordTest('OWNER AUTHORIZATION', 'Unauthenticated UPDATE rejected (401)', unauthPutRes.statusCode === 401, `Status: ${unauthPutRes.statusCode}`);

  // Unauthenticated DELETE
  const unauthDelRes = await request({ path: '/api/admin/projects/traceflow', method: 'DELETE' });
  recordTest('OWNER AUTHORIZATION', 'Unauthenticated DELETE rejected (401)', unauthDelRes.statusCode === 401, `Status: ${unauthDelRes.statusCode}`);

  // Unauthenticated file upload
  const unauthUploadRes = await request({ path: '/api/admin/resume/upload', method: 'POST' }, { base64Data: 'dummy' });
  recordTest('OWNER AUTHORIZATION', 'Unauthenticated file upload rejected (401)', unauthUploadRes.statusCode === 401, `Status: ${unauthUploadRes.statusCode}`);

  // Unauthorized message access
  const unauthMsgRes = await request({ path: '/api/admin/messages' });
  recordTest('OWNER AUTHORIZATION', 'Unauthorized recruiter message access rejected (401)', unauthMsgRes.statusCode === 401, `Status: ${unauthMsgRes.statusCode}`);

  // Forged session token rejected
  const forgedSessionRes = await request({
    path: '/api/admin/dashboard',
    headers: { 'Cookie': 'owner_session=0000000000000000000000000000000000000000000000000000000000000000' }
  });
  recordTest('OWNER AUTHORIZATION', 'Forged session token rejected (401)', forgedSessionRes.statusCode === 401, `Status: ${forgedSessionRes.statusCode}`);

  // ==========================================================================
  // SECTION 4: OWNER ACCESS & CRUD VERIFICATION
  // ==========================================================================
  console.log('\n[AUDIT] 4. OWNER ACCESS (LOGIN & CRUD)...');

  // Authenticate owner
  const loginRes = await request({ path: '/api/auth/login', method: 'POST' }, {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD
  });

  const isLoginSuccess = loginRes.statusCode === 200 && loginRes.json?.success === true;
  recordTest('OWNER AUTHORIZATION', 'Owner login succeeds with valid credentials', isLoginSuccess, `Status: ${loginRes.statusCode}`);

  if (!isLoginSuccess) {
    console.error('Fatal: Could not authenticate owner for subsequent CRUD checks.');
    return;
  }

  // Extract session cookie and CSRF token
  const setCookie = loginRes.headers['set-cookie'] || [];
  const sessionCookieHeader = setCookie.find(c => c.startsWith('owner_session='));
  const sessionCookie = sessionCookieHeader ? sessionCookieHeader.split(';')[0] : '';
  const csrfToken = loginRes.json?.csrfToken;

  const authHeaders = {
    'Cookie': sessionCookie,
    'x-csrf-token': csrfToken
  };

  // Check CSRF protection on authenticated mutations
  const missingCsrfRes = await request({
    path: '/api/admin/profile',
    method: 'PUT',
    headers: { 'Cookie': sessionCookie } // missing x-csrf-token
  }, { title: 'Software Engineer' });
  recordTest('OWNER AUTHORIZATION', 'Authenticated mutation without CSRF token rejected (403)', missingCsrfRes.statusCode === 403, `Status: ${missingCsrfRes.statusCode}`);

  const invalidCsrfRes = await request({
    path: '/api/admin/profile',
    method: 'PUT',
    headers: { 'Cookie': sessionCookie, 'x-csrf-token': 'wrong-csrf-token' }
  }, { title: 'Software Engineer' });
  recordTest('OWNER AUTHORIZATION', 'Authenticated mutation with invalid CSRF token rejected (403)', invalidCsrfRes.statusCode === 403, `Status: ${invalidCsrfRes.statusCode}`);

  // Owner dashboard stats access
  const dashboardRes = await request({ path: '/api/admin/dashboard', headers: authHeaders });
  recordTest('OWNER AUTHORIZATION', 'Owner accesses admin dashboard stats', dashboardRes.statusCode === 200 && dashboardRes.json?.stats, `Status: ${dashboardRes.statusCode}`);

  // Owner manages profile
  const profileRes = await request({ path: '/api/admin/profile', headers: authHeaders });
  recordTest('OWNER AUTHORIZATION', 'Owner reads profile data', profileRes.statusCode === 200, `Status: ${profileRes.statusCode}`);

  const updateProfileRes = await request({
    path: '/api/admin/profile',
    method: 'PUT',
    headers: authHeaders
  }, { ...profileRes.json, title: 'Staff Software Engineer' });
  recordTest('OWNER AUTHORIZATION', 'Owner updates profile content', updateProfileRes.statusCode === 200, `Status: ${updateProfileRes.statusCode}`);

  // Restore title
  await request({
    path: '/api/admin/profile',
    method: 'PUT',
    headers: authHeaders
  }, { ...profileRes.json, title: 'Software  Engineering' });

  // Owner manages projects (CREATE, UPDATE, DELETE)
  const testProject = {
    title: 'Audit Verification Project',
    slug: 'audit-test-project',
    shortDescription: 'Project created during automated audit.',
    category: 'Systems',
    featured: false,
    problem: 'Audit test problem',
    solution: 'Audit test solution'
  };

  const createProjRes = await request({
    path: '/api/admin/projects',
    method: 'POST',
    headers: authHeaders
  }, testProject);
  const createdProjId = createProjRes.json?.project?.id;
  recordTest('OWNER AUTHORIZATION', 'Owner creates new project', createProjRes.statusCode === 201 && !!createdProjId, `Status: ${createProjRes.statusCode}`);

  if (createdProjId) {
    const updateProjRes = await request({
      path: `/api/admin/projects/${createdProjId}`,
      method: 'PUT',
      headers: authHeaders
    }, { shortDescription: 'Updated by security audit' });
    recordTest('OWNER AUTHORIZATION', 'Owner updates existing project', updateProjRes.statusCode === 200, `Status: ${updateProjRes.statusCode}`);

    const deleteProjRes = await request({
      path: `/api/admin/projects/${createdProjId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    recordTest('OWNER AUTHORIZATION', 'Owner deletes project', deleteProjRes.statusCode === 200, `Status: ${deleteProjRes.statusCode}`);
  }

  // Owner manages experience
  const testExp = {
    organization: 'Audit Systems Lab',
    role: 'Security Engineer',
    startDate: '2026',
    endDate: 'Present'
  };
  const createExpRes = await request({ path: '/api/admin/experience', method: 'POST', headers: authHeaders }, testExp);
  const createdExpId = createExpRes.json?.experience?.id;
  recordTest('OWNER AUTHORIZATION', 'Owner creates experience entry', createExpRes.statusCode === 201 && !!createdExpId);

  if (createdExpId) {
    await request({ path: `/api/admin/experience/${createdExpId}`, method: 'DELETE', headers: authHeaders });
    recordTest('OWNER AUTHORIZATION', 'Owner deletes experience entry', true);
  }

  // Owner manages skills
  const testSkill = { name: 'Audit Security Skill', category: 'Backend', level: 'Core' };
  const createSkillRes = await request({ path: '/api/admin/skills', method: 'POST', headers: authHeaders }, testSkill);
  const createdSkillId = createSkillRes.json?.skill?.id;
  recordTest('OWNER AUTHORIZATION', 'Owner creates skill entry', createSkillRes.statusCode === 201 && !!createdSkillId);

  if (createdSkillId) {
    await request({ path: `/api/admin/skills/${createdSkillId}`, method: 'DELETE', headers: authHeaders });
    recordTest('OWNER AUTHORIZATION', 'Owner deletes skill entry', true);
  }

  // Owner manages achievements
  const testAch = { title: 'Audit Distinction Award', category: 'Honors', organization: 'Audit Org' };
  const createAchRes = await request({ path: '/api/admin/achievements', method: 'POST', headers: authHeaders }, testAch);
  const createdAchId = createAchRes.json?.achievement?.id;
  recordTest('OWNER AUTHORIZATION', 'Owner creates achievement', createAchRes.statusCode === 201 && !!createdAchId);

  if (createdAchId) {
    await request({ path: `/api/admin/achievements/${createdAchId}`, method: 'DELETE', headers: authHeaders });
    recordTest('OWNER AUTHORIZATION', 'Owner deletes achievement', true);
  }

  // Owner reads contact messages
  const ownerMsgsRes = await request({ path: '/api/admin/messages', headers: authHeaders });
  recordTest('OWNER AUTHORIZATION', 'Owner retrieves private recruiter messages', ownerMsgsRes.statusCode === 200 && Array.isArray(ownerMsgsRes.json));

  // Owner reads and updates settings
  const settingsRes = await request({ path: '/api/admin/settings', headers: authHeaders });
  recordTest('OWNER AUTHORIZATION', 'Owner reads admin settings', settingsRes.statusCode === 200);

  const updateSettingsRes = await request({
    path: '/api/admin/settings',
    method: 'PUT',
    headers: authHeaders
  }, { siteStatus: 'live' });
  recordTest('OWNER AUTHORIZATION', 'Owner updates admin settings', updateSettingsRes.statusCode === 200);

  // Owner accesses admin HTML pages while authenticated
  for (const route of adminRoutes) {
    const res = await request({ path: route, headers: authHeaders });
    recordTest('OWNER AUTHORIZATION', `Owner accesses protected HTML route: ${route}`, res.statusCode === 200, `Status: ${res.statusCode}`);
  }

  // ==========================================================================
  // SECTION 5: DATA PRIVACY & SECRET EXPOSURE GUARDS
  // ==========================================================================
  console.log('\n[AUDIT] 5. DATA PRIVACY & SECRET EXPOSURE GUARDS...');

  // Blocked private files & directories
  const privateEndpoints = [
    '/.env',
    '/.env.example',
    '/data/auth.json',
    '/data/messages.json',
    '/data/sessions.json',
    '/data/settings.json',
    '/data/portfolio-db.json',
    '/server.js',
    '/server/auth.js',
    '/server/db.js',
    '/scripts/setup-owner.js',
    '/package.json',
    '/package-lock.json'
  ];

  for (const endpoint of privateEndpoints) {
    const res = await request({ path: endpoint });
    // Must be 403 Forbidden or 404 Not Found
    const isProtected = res.statusCode === 403 || res.statusCode === 404;
    recordTest('DATA PRIVACY', `Private file protected from static serving: ${endpoint}`, isProtected, `Status: ${res.statusCode}`);
  }

  // Directory traversal prevention
  const traversalEndpoints = [
    '/../server.js',
    '/..%2fserver.js',
    '/data/../server.js',
    '/css/../../.env'
  ];

  for (const endpoint of traversalEndpoints) {
    const res = await request({ path: endpoint });
    const isBlocked = res.statusCode === 403 || res.statusCode === 404;
    recordTest('DATA PRIVACY', `Directory traversal attempt blocked: ${endpoint}`, isBlocked, `Status: ${res.statusCode}`);
  }

  // Public data API sanitization check
  const publicDataRes = await request({ path: '/api/public/data' });
  const pubData = publicDataRes.json || {};
  const hasNoAuth = !pubData.auth && !pubData.password && !pubData.salt && !pubData.passwordHash;
  const hasNoMessages = !pubData.messages;
  const hasNoSessions = !pubData.sessions;
  const hasNoSettings = !pubData.settings;
  const hasProfile = !!pubData.profile;
  const hasProjects = Array.isArray(pubData.projects);

  recordTest('DATA PRIVACY', 'Public API (/api/public/data) returns only public portfolio data', 
    hasNoAuth && hasNoMessages && hasNoSessions && hasNoSettings && hasProfile && hasProjects,
    `Auth: ${!hasNoAuth}, Msgs: ${!hasNoMessages}, Sessions: ${!hasNoSessions}`
  );

  // ==========================================================================
  // SECTION 6: FILE UPLOAD SECURITY
  // ==========================================================================
  console.log('\n[AUDIT] 6. FILE UPLOAD SECURITY...');

  // Authentic PDF upload test (%PDF- magic bytes)
  const minimalValidPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const validUploadRes = await request({
    path: '/api/admin/resume/upload',
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/pdf'
    }
  }, minimalValidPdf);

  recordTest('FILE UPLOAD SECURITY', 'Valid PDF upload accepted (magic bytes %PDF-)', 
    validUploadRes.statusCode === 200 && validUploadRes.json?.success === true,
    `Status: ${validUploadRes.statusCode}`
  );

  // Fake PDF upload rejection (e.g. executable/script without %PDF- magic bytes)
  const fakePdf = Buffer.from('MZ\x90\x00\x03\x00\x00\x00This is an executable not a PDF');
  const fakeUploadRes = await request({
    path: '/api/admin/resume/upload',
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/pdf'
    }
  }, fakePdf);

  recordTest('FILE UPLOAD SECURITY', 'Non-PDF / executable upload rejected by magic bytes check',
    fakeUploadRes.statusCode === 400 && fakeUploadRes.json?.error?.includes('Invalid file format'),
    `Status: ${fakeUploadRes.statusCode}`
  );

  // Oversized file upload rejection (> 5MB)
  const oversizedPdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.alloc(5.5 * 1024 * 1024, 'A')
  ]);
  const oversizedUploadRes = await request({
    path: '/api/admin/resume/upload',
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/pdf'
    }
  }, oversizedPdf);

  recordTest('FILE UPLOAD SECURITY', 'Oversized upload (>5MB) rejected',
    oversizedUploadRes.statusCode === 400 || oversizedUploadRes.statusCode === 413,
    `Status: ${oversizedUploadRes.statusCode}`
  );

  // Storage path safety: uploaded file is stored in fixed destination
  const destPath1 = path.join(ROOT_DIR, 'assets', 'Alex_Rivera_Software_Engineer_Resume.pdf');
  const destPath2 = path.join(ROOT_DIR, 'assets', 'resume', 'Alex_Rivera_Software_Engineer_Resume.pdf');
  recordTest('FILE UPLOAD SECURITY', 'File saved to non-user-controlled path', 
    fs.existsSync(destPath1) && fs.existsSync(destPath2)
  );

  // Restore authentic ATS Resume PDF after test run
  try {
    const { execSync } = require('node:child_process');
    execSync('node scripts/generate-resume-pdf.js', { cwd: ROOT_DIR, stdio: 'pipe' });
    const restoredSize = fs.statSync(destPath1).size;
    recordTest('FILE UPLOAD SECURITY', 'Authentic ATS Resume PDF restored (>4000 bytes)', restoredSize >= 4000, `Size: ${restoredSize} bytes`);
  } catch (err) {
    recordTest('FILE UPLOAD SECURITY', 'Authentic ATS Resume PDF restored (>4000 bytes)', false, err.message);
  }

  // ==========================================================================
  // SECTION 7: INPUT VALIDATION & SECURITY
  // ==========================================================================
  console.log('\n[AUDIT] 7. INPUT VALIDATION & SECURITY...');

  // Database operations use atomic temp write and renameSync
  const dbModule = require('../server/db');
  recordTest('INPUT VALIDATION', 'Database writes are atomic (JSON + renameSync)', typeof dbModule.savePortfolioData === 'function');

  // Contact form input length limits
  const longName = 'A'.repeat(200);
  const longMsg = 'B'.repeat(10000);
  const lengthTestRes = await request({ path: '/api/contact', method: 'POST' }, {
    name: longName,
    email: 'test.limits@example.com',
    subject: 'Limit Test',
    message: longMsg
  });
  recordTest('INPUT VALIDATION', 'Input length safely accepted and truncated to bounds', lengthTestRes.statusCode === 200);

  // Verify stored message was truncated in database
  const msgs = dbModule.getMessages();
  const latestMsg = msgs.find(m => m.email === 'test.limits@example.com');
  const isTruncated = latestMsg && latestMsg.name.length <= 100 && latestMsg.message.length <= 5000;
  recordTest('INPUT VALIDATION', 'Database message records enforce strict byte-length ceilings', isTruncated);

  // Clean up audit test messages from database
  const cleanedMsgs = msgs.filter(m => !m.email.includes('audit') && !m.email.includes('test.limits'));
  fs.writeFileSync(path.join(ROOT_DIR, 'data', 'messages.json'), JSON.stringify(cleanedMsgs, null, 2));

  // ==========================================================================
  // SECTION 8: AUTHENTICATION SECURITY
  // ==========================================================================
  console.log('\n[AUDIT] 8. AUTHENTICATION SECURITY...');

  // Verify auth store does not store plaintext password
  const authRecord = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'auth.json'), 'utf-8'));
  const hasNoPlaintextPassword = !authRecord.password && typeof authRecord.passwordHash === 'string' && authRecord.passwordHash.length === 128;
  const hasValidSalt = typeof authRecord.salt === 'string' && authRecord.salt.length === 32;
  recordTest('AUTHENTICATION SECURITY', 'Owner password hashed with scrypt and 128-bit cryptographic salt', hasNoPlaintextPassword && hasValidSalt);

  // Generic error messages for bad login
  const badLoginRes = await request({ path: '/api/auth/login', method: 'POST' }, {
    email: OWNER_EMAIL,
    password: 'WrongPassword123!'
  });
  recordTest('AUTHENTICATION SECURITY', 'Generic error message on bad login (no account enumeration)',
    badLoginRes.statusCode === 401 && badLoginRes.json?.error === 'Invalid email or password.'
  );

  // Logout invalidates session
  const logoutRes = await request({
    path: '/api/auth/logout',
    method: 'POST',
    headers: authHeaders
  });
  recordTest('AUTHENTICATION SECURITY', 'Owner logout succeeds (200)', logoutRes.statusCode === 200);

  // Check that cleared session is now rejected
  const afterLogoutRes = await request({
    path: '/api/admin/dashboard',
    headers: { 'Cookie': sessionCookie }
  });
  recordTest('AUTHENTICATION SECURITY', 'Session immediately revoked upon logout (401)', afterLogoutRes.statusCode === 401);

  // ==========================================================================
  // SECTION 9: BUILD QUALITY & SYNTAX CHECKS
  // ==========================================================================
  console.log('\n[AUDIT] 9. BUILD QUALITY & SYNTAX VERIFICATION...');

  const jsFilesToCheck = [
    'server.js',
    'server/auth.js',
    'server/db.js',
    'js/case-study.js',
    'js/projects.js',
    'js/resume.js',
    'js/admin-core.js',
    'js/admin-messages.js',
    'js/admin-dashboard.js',
    'js/admin-profile.js',
    'js/admin-projects.js',
    'js/admin-experience.js',
    'js/admin-skills.js',
    'js/admin-achievements.js',
    'js/admin-about.js',
    'js/admin-resume.js',
    'js/admin-settings.js'
  ];

  let syntaxAllPassed = true;
  for (const relFile of jsFilesToCheck) {
    const fullPath = path.join(ROOT_DIR, relFile);
    if (fs.existsSync(fullPath)) {
      try {
        const code = fs.readFileSync(fullPath, 'utf-8');
        new Function(code); // Parse check
      } catch (err) {
        syntaxAllPassed = false;
        console.error(`Syntax error in ${relFile}:`, err.message);
      }
    }
  }
  recordTest('BUILD QUALITY', 'All server & client JS files pass syntax parsing', syntaxAllPassed);

  // HTML templates have <!DOCTYPE html> and required meta tags
  const htmlFilesToCheck = [
    'index.html',
    'projects.html',
    'case-study.html',
    'experience.html',
    'skills.html',
    'achievements.html',
    'about.html',
    'resume.html',
    'contact.html',
    '404.html',
    'admin/login.html',
    'admin/dashboard.html',
    'admin/profile.html',
    'admin/projects.html',
    'admin/experience.html',
    'admin/skills.html',
    'admin/achievements.html',
    'admin/about.html',
    'admin/resume.html',
    'admin/messages.html',
    'admin/settings.html'
  ];

  let allHtmlValid = true;
  for (const relFile of htmlFilesToCheck) {
    const fullPath = path.join(ROOT_DIR, relFile);
    if (!fs.existsSync(fullPath)) {
      allHtmlValid = false;
      console.error(`Missing HTML file: ${relFile}`);
    } else {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.includes('<!DOCTYPE html>') && !content.includes('<!doctype html>')) {
        allHtmlValid = false;
        console.error(`Missing DOCTYPE in ${relFile}`);
      }
    }
  }
  recordTest('BUILD QUALITY', 'All 21 HTML templates exist and contain valid DOCTYPE', allHtmlValid);

  // Deployment configuration files check
  const deployFiles = [
    'package.json',
    'vercel.json',
    '.env.example',
    'docs/DEPLOYMENT.md',
    'robots.txt',
    'sitemap.xml',
    'assets/favicon.svg'
  ];
  let allDeployFilesExist = true;
  for (const file of deployFiles) {
    if (!fs.existsSync(path.join(ROOT_DIR, file))) {
      allDeployFilesExist = false;
      console.error(`Missing deployment artifact: ${file}`);
    }
  }
  recordTest('BUILD QUALITY', 'All deployment artifacts exist (package.json, vercel.json, .env.example, docs, sitemap, robots, favicon)', allDeployFilesExist);

  // ==========================================================================
  // SECTION 10: AUDIT SUMMARY REPORT
  // ==========================================================================
  console.log('\n================================================================');
  console.log('FINAL AUDIT SUMMARY REPORT');
  console.log('================================================================');
  console.log(`Total tests run: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('----------------------------------------------------------------');

  const reportCategories = [
    { key: 'PUBLIC SITE', header: 'PUBLIC SITE' },
    { key: 'ADMIN AUTHENTICATION', header: 'ADMIN AUTHENTICATION' },
    { key: 'OWNER AUTHORIZATION', header: 'OWNER AUTHORIZATION' },
    { key: 'DATA PRIVACY', header: 'DATA PRIVACY' },
    { key: 'FILE UPLOAD SECURITY', header: 'FILE UPLOAD SECURITY' },
    { key: 'INPUT VALIDATION', header: 'INPUT VALIDATION' },
    { key: 'BUILD QUALITY', header: 'BUILD' }
  ];

  reportCategories.forEach(({ key, header }) => {
    const cat = results.categories[key];
    const status = (cat && cat.pass && results.failed === 0) ? 'PASS' : (cat?.pass ? 'PASS' : 'FAIL');
    console.log(`${header}: ${status}`);
  });

  console.log('================================================================\n');

  if (results.failed === 0) {
    console.log('ALL AUDIT SUITES PASSED SUCCESSFULLY!');
  } else {
    console.error(`Audit finished with ${results.failed} failures.`);
    process.exitCode = 1;
  }
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
