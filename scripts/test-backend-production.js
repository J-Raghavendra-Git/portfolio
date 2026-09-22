/**
 * PRODUCTION BACKEND 15-POINT VERIFICATION SUITE
 * Tests all 15 explicit backend requirements:
 *  1. Owner login
 *  2. Owner logout
 *  3. Unauthorized admin access
 *  4. Unauthorized mutation
 *  5. Owner project CRUD
 *  6. Owner experience CRUD
 *  7. Owner skills CRUD
 *  8. Owner achievements CRUD
 *  9. Owner profile update
 * 10. Owner About update
 * 11. Resume upload/replacement
 * 12. Contact submission
 * 13. Owner message access
 * 14. Public read access
 * 15. Private data isolation
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

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

let sessionCookie = '';
let csrfToken = '';

const testResults = [];

function record(id, name, passed, details = '') {
  testResults.push({ id, name, passed, details });
  const symbol = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] Test ${id}: ${name} ${details ? `(${details})` : ''}`);
  if (!passed) process.exitCode = 1;
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

async function run15PointVerification() {
  console.log('================================================================');
  console.log('STARTING 15-POINT BACKEND PRODUCTION VERIFICATION');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Owner login
  // --------------------------------------------------------------------------
  const loginRes = await request({ path: '/api/auth/login', method: 'POST' }, {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD
  });

  const cookies = loginRes.headers['set-cookie'] || [];
  const sessionCookieHeader = cookies.find(c => c.startsWith('owner_session='));
  sessionCookie = sessionCookieHeader ? sessionCookieHeader.split(';')[0] : '';
  csrfToken = loginRes.json?.csrfToken || '';

  const isLoginOk = loginRes.statusCode === 200 && 
    loginRes.json?.success === true && 
    !!csrfToken && 
    !!sessionCookie &&
    sessionCookieHeader.includes('HttpOnly') &&
    sessionCookieHeader.includes('SameSite=Strict');

  record(1, 'Owner login', isLoginOk, `Status: ${loginRes.statusCode}, Has CSRF: ${!!csrfToken}`);

  const authHeaders = {
    'Cookie': sessionCookie,
    'x-csrf-token': csrfToken
  };

  // --------------------------------------------------------------------------
  // TEST 2: Owner logout
  // --------------------------------------------------------------------------
  // We perform logout with a temporary session to test revocation
  const tempLoginRes = await request({ path: '/api/auth/login', method: 'POST' }, {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD
  });
  const tempCookies = tempLoginRes.headers['set-cookie'] || [];
  const tempSessionCookie = (tempCookies.find(c => c.startsWith('owner_session=')) || '').split(';')[0];
  const tempCsrf = tempLoginRes.json?.csrfToken;

  const logoutRes = await request({
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Cookie': tempSessionCookie, 'x-csrf-token': tempCsrf }
  });

  // Verify that the logged-out session is now rejected
  const afterLogoutRes = await request({
    path: '/api/admin/dashboard',
    headers: { 'Cookie': tempSessionCookie }
  });

  const isLogoutOk = logoutRes.statusCode === 200 && afterLogoutRes.statusCode === 401;
  record(2, 'Owner logout', isLogoutOk, `Logout: ${logoutRes.statusCode}, Revocation: ${afterLogoutRes.statusCode}`);

  // --------------------------------------------------------------------------
  // TEST 3: Unauthorized admin access
  // --------------------------------------------------------------------------
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

  let allAdminRoutesProtected = true;
  for (const route of adminRoutes) {
    const res = await request({ path: route });
    const isRedirect = res.statusCode === 302 && (res.headers.location || '').startsWith('/admin/login');
    if (!isRedirect) allAdminRoutesProtected = false;
  }
  record(3, 'Unauthorized admin access', allAdminRoutesProtected, 'All 11 admin views redirect unauthenticated visitors to /admin/login');

  // --------------------------------------------------------------------------
  // TEST 4: Unauthorized mutation
  // --------------------------------------------------------------------------
  const unauthPost = await request({ path: '/api/admin/projects', method: 'POST' }, { title: 'Hack' });
  const unauthPut = await request({ path: '/api/admin/profile', method: 'PUT' }, { title: 'Hack' });
  const unauthDel = await request({ path: '/api/admin/projects/sample', method: 'DELETE' });
  const isMutationProtected = unauthPost.statusCode === 401 && unauthPut.statusCode === 401 && unauthDel.statusCode === 401;
  record(4, 'Unauthorized mutation', isMutationProtected, `POST: ${unauthPost.statusCode}, PUT: ${unauthPut.statusCode}, DELETE: ${unauthDel.statusCode}`);

  // --------------------------------------------------------------------------
  // TEST 5: Owner project CRUD
  // --------------------------------------------------------------------------
  const testProj = {
    title: 'Distributed Consensus Engine',
    slug: 'distributed-consensus-engine',
    category: 'Distributed Systems',
    shortDescription: 'High performance Raft implementation.',
    problem: 'Consensus under partition',
    solution: 'Deterministic simulation testing',
    metrics: [{ label: 'Throughput', value: '1.2M ops/sec' }],
    technologies: ['Rust', 'Raft', 'gRPC']
  };

  const createProjRes = await request({
    path: '/api/admin/projects',
    method: 'POST',
    headers: authHeaders
  }, testProj);

  const projId = createProjRes.json?.project?.id;
  let projCrudSuccess = createProjRes.statusCode === 201 && !!projId;

  if (projId) {
    const updateProjRes = await request({
      path: `/api/admin/projects/${projId}`,
      method: 'PUT',
      headers: authHeaders
    }, { shortDescription: 'Updated high performance Raft implementation.' });

    const deleteProjRes = await request({
      path: `/api/admin/projects/${projId}`,
      method: 'DELETE',
      headers: authHeaders
    });

    projCrudSuccess = projCrudSuccess && updateProjRes.statusCode === 200 && deleteProjRes.statusCode === 200;
  }
  record(5, 'Owner project CRUD', projCrudSuccess, `Create: ${createProjRes.statusCode}, Id: ${projId}`);

  // --------------------------------------------------------------------------
  // TEST 6: Owner experience CRUD
  // --------------------------------------------------------------------------
  const testExp = {
    role: 'Infrastructure Engineering Fellow',
    organization: 'Cloud Systems Research Lab',
    startDate: '2026',
    endDate: 'Present',
    highlights: ['Benchmarked distributed key-value stores'],
    technologies: ['C++', 'Rust', 'Linux']
  };

  const createExpRes = await request({
    path: '/api/admin/experience',
    method: 'POST',
    headers: authHeaders
  }, testExp);

  const expId = createExpRes.json?.experience?.id;
  let expCrudSuccess = createExpRes.statusCode === 201 && !!expId;

  if (expId) {
    const updateExpRes = await request({
      path: `/api/admin/experience/${expId}`,
      method: 'PUT',
      headers: authHeaders
    }, { role: 'Senior Infrastructure Engineering Fellow' });

    const deleteExpRes = await request({
      path: `/api/admin/experience/${expId}`,
      method: 'DELETE',
      headers: authHeaders
    });

    expCrudSuccess = expCrudSuccess && updateExpRes.statusCode === 200 && deleteExpRes.statusCode === 200;
  }
  record(6, 'Owner experience CRUD', expCrudSuccess, `Create: ${createExpRes.statusCode}, Id: ${expId}`);

  // --------------------------------------------------------------------------
  // TEST 7: Owner skills CRUD
  // --------------------------------------------------------------------------
  const testSkill = {
    name: 'Distributed Systems',
    category: 'Backend & Infrastructure',
    level: 'Advanced'
  };

  const createSkillRes = await request({
    path: '/api/admin/skills',
    method: 'POST',
    headers: authHeaders
  }, testSkill);

  const skillId = createSkillRes.json?.skill?.id;
  let skillCrudSuccess = createSkillRes.statusCode === 201 && !!skillId;

  if (skillId) {
    const updateSkillRes = await request({
      path: `/api/admin/skills/${skillId}`,
      method: 'PUT',
      headers: authHeaders
    }, { level: 'Expert' });

    const deleteSkillRes = await request({
      path: `/api/admin/skills/${skillId}`,
      method: 'DELETE',
      headers: authHeaders
    });

    skillCrudSuccess = skillCrudSuccess && updateSkillRes.statusCode === 200 && deleteSkillRes.statusCode === 200;
  }
  record(7, 'Owner skills CRUD', skillCrudSuccess, `Create: ${createSkillRes.statusCode}, Id: ${skillId}`);

  // --------------------------------------------------------------------------
  // TEST 8: Owner achievements CRUD
  // --------------------------------------------------------------------------
  const testAch = {
    title: 'National Collegiate Systems Design Award',
    organization: 'Association for Computing Machinery',
    category: 'Honors',
    date: '2026',
    description: 'First place for low-latency kernel-bypass networking proxy design.'
  };

  const createAchRes = await request({
    path: '/api/admin/achievements',
    method: 'POST',
    headers: authHeaders
  }, testAch);

  const achId = createAchRes.json?.achievement?.id;
  let achCrudSuccess = createAchRes.statusCode === 201 && !!achId;

  if (achId) {
    const updateAchRes = await request({
      path: `/api/admin/achievements/${achId}`,
      method: 'PUT',
      headers: authHeaders
    }, { category: 'Distinction' });

    const deleteAchRes = await request({
      path: `/api/admin/achievements/${achId}`,
      method: 'DELETE',
      headers: authHeaders
    });

    achCrudSuccess = achCrudSuccess && updateAchRes.statusCode === 200 && deleteAchRes.statusCode === 200;
  }
  record(8, 'Owner achievements CRUD', achCrudSuccess, `Create: ${createAchRes.statusCode}, Id: ${achId}`);

  // --------------------------------------------------------------------------
  // TEST 9: Owner profile update
  // --------------------------------------------------------------------------
  const getProfileRes = await request({ path: '/api/admin/profile', headers: authHeaders });
  const currentProfile = getProfileRes.json || {};

  const updateProfileRes = await request({
    path: '/api/admin/profile',
    method: 'PUT',
    headers: authHeaders
  }, { ...currentProfile, headline: 'Staff Systems & Infrastructure Engineer' });

  // Read back to verify atomic persistence
  const verifyProfileRes = await request({ path: '/api/admin/profile', headers: authHeaders });
  const profileSuccess = updateProfileRes.statusCode === 200 && verifyProfileRes.json?.headline === 'Staff Systems & Infrastructure Engineer';

  // Restore original profile headline
  await request({
    path: '/api/admin/profile',
    method: 'PUT',
    headers: authHeaders
  }, currentProfile);

  record(9, 'Owner profile update', profileSuccess, `Updated & verified in database`);

  // --------------------------------------------------------------------------
  // TEST 10: Owner About update
  // --------------------------------------------------------------------------
  const getAboutRes = await request({ path: '/api/admin/about', headers: authHeaders });
  const currentAbout = getAboutRes.json || {};

  const updateAboutRes = await request({
    path: '/api/admin/about',
    method: 'PUT',
    headers: authHeaders
  }, { ...currentAbout, currentFocus: 'Benchmarking io_uring asynchronous networking runtimes in production.' });

  const verifyAboutRes = await request({ path: '/api/admin/about', headers: authHeaders });
  const aboutSuccess = updateAboutRes.statusCode === 200 && verifyAboutRes.json?.currentFocus?.includes('io_uring');

  // Restore original about
  await request({
    path: '/api/admin/about',
    method: 'PUT',
    headers: authHeaders
  }, currentAbout);

  record(10, 'Owner About update', aboutSuccess, `Updated & verified in database`);

  // --------------------------------------------------------------------------
  // TEST 11: Resume upload/replacement
  // --------------------------------------------------------------------------
  // Test invalid file (executable magic bytes MZ)
  const invalidExe = Buffer.from('MZ\x90\x00\x03\x00\x00\x00Not a valid PDF file');
  const invalidUploadRes = await request({
    path: '/api/admin/resume/upload',
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/pdf' }
  }, invalidExe);

  // Test valid PDF upload
  const validPdfChunk = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const validUploadRes = await request({
    path: '/api/admin/resume/upload',
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/pdf' }
  }, validPdfChunk);

  // Restore authentic 5050-byte ATS PDF
  execSync('node scripts/generate-resume-pdf.js', { cwd: ROOT_DIR, stdio: 'pipe' });
  const resumeSize = fs.statSync(path.join(ROOT_DIR, 'assets', 'Alex_Rivera_Software_Engineer_Resume.pdf')).size;

  const resumeUploadSuccess = invalidUploadRes.statusCode === 400 && 
    validUploadRes.statusCode === 200 && 
    resumeSize >= 4000;

  record(11, 'Resume upload/replacement', resumeUploadSuccess, `Rejects MZ: ${invalidUploadRes.statusCode}, Accepts PDF: ${validUploadRes.statusCode}, Restored Size: ${resumeSize}B`);

  // --------------------------------------------------------------------------
  // TEST 12: Contact submission
  // --------------------------------------------------------------------------
  const validContact = {
    name: 'Production Recruiter',
    email: 'recruiter.prod@enterprise-cloud.io',
    subject: 'Distributed Systems Staff Role',
    message: 'We are impressed by your Raft consensus engine and network proxy work.'
  };
  const contactRes = await request({ path: '/api/contact', method: 'POST' }, validContact);
  const contactBadRes = await request({ path: '/api/contact', method: 'POST' }, { name: '' });
  const contactTrapRes = await request({ path: '/api/contact', method: 'POST' }, { ...validContact, website_trap: 'http://bot.ru' });

  const contactSuccess = contactRes.statusCode === 200 && 
    contactBadRes.statusCode === 400 && 
    contactTrapRes.statusCode === 200;

  record(12, 'Contact submission', contactSuccess, `Valid: ${contactRes.statusCode}, Bad: ${contactBadRes.statusCode}, Trap: ${contactTrapRes.statusCode}`);

  // --------------------------------------------------------------------------
  // TEST 13: Owner message access
  // --------------------------------------------------------------------------
  const unauthMsgsRes = await request({ path: '/api/admin/messages' });
  const authMsgsRes = await request({ path: '/api/admin/messages', headers: authHeaders });

  const isMsgsOk = unauthMsgsRes.statusCode === 401 && 
    authMsgsRes.statusCode === 200 && 
    Array.isArray(authMsgsRes.json);

  // Clean test messages from database
  const db = require('../server/db');
  const allMsgs = db.getMessages().filter(m => !m.email.includes('enterprise-cloud.io') && !m.email.includes('audit'));
  fs.writeFileSync(path.join(ROOT_DIR, 'data', 'messages.json'), JSON.stringify(allMsgs, null, 2));

  record(13, 'Owner message access', isMsgsOk, `Unauth: ${unauthMsgsRes.statusCode}, Auth: ${authMsgsRes.statusCode}, Count: ${authMsgsRes.json?.length || 0}`);

  // --------------------------------------------------------------------------
  // TEST 14: Public read access
  // --------------------------------------------------------------------------
  const publicDataRes = await request({ path: '/api/public/data' });
  const publicHomeRes = await request({ path: '/' });
  const publicCaseStudyRes = await request({ path: '/projects/traceflow' });
  const publicResumePdfRes = await request({ path: '/assets/Alex_Rivera_Software_Engineer_Resume.pdf' });

  const isPublicOk = publicDataRes.statusCode === 200 && 
    publicHomeRes.statusCode === 200 && 
    publicCaseStudyRes.statusCode === 200 && 
    publicResumePdfRes.statusCode === 200;

  record(14, 'Public read access', isPublicOk, `Data: ${publicDataRes.statusCode}, Home: ${publicHomeRes.statusCode}, CaseStudy: ${publicCaseStudyRes.statusCode}, PDF: ${publicResumePdfRes.statusCode}`);

  // --------------------------------------------------------------------------
  // TEST 15: Private data isolation
  // --------------------------------------------------------------------------
  const pubData = publicDataRes.json || {};
  const dataIsolated = !pubData.auth && 
    !pubData.password && 
    !pubData.passwordHash && 
    !pubData.salt && 
    !pubData.messages && 
    !pubData.sessions && 
    !pubData.settings;

  // Verify direct file protection
  const envRes = await request({ path: '/.env' });
  const authFileRes = await request({ path: '/data/auth.json' });
  const msgsFileRes = await request({ path: '/data/messages.json' });
  const filesIsolated = envRes.statusCode === 403 && authFileRes.statusCode === 403 && msgsFileRes.statusCode === 403;

  record(15, 'Private data isolation', dataIsolated && filesIsolated, `API sanitization: ${dataIsolated}, Static protection: ${filesIsolated}`);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('15-POINT BACKEND VERIFICATION SUMMARY');
  console.log('================================================================');
  const passedCount = testResults.filter(t => t.passed).length;
  console.log(`Total Requirements Tested: ${testResults.length}`);
  console.log(`Passed: ${passedCount} / ${testResults.length}`);
  console.log(`Failed: ${testResults.length - passedCount}`);
  console.log('================================================================\n');

  if (passedCount === 15) {
    console.log('ALL 15 PRODUCTION BACKEND REQUIREMENTS SUCCESSFULLY VERIFIED!');
    process.exit(0);
  } else {
    console.error(`Verification completed with ${testResults.length - passedCount} failures.`);
    process.exit(1);
  }
}

run15PointVerification().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
