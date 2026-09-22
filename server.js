/**
 * RECRUITER PORTFOLIO - UNIFIED APPLICATION SERVER
 * Node.js Native HTTP Server (zero external dependencies)
 * Enforces server-side authorization, route guards, security headers,
 * and REST mutation endpoints for private owner administration.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const db = require('./server/db');
const auth = require('./server/auth');
const security = require('./server/security');

const PORT = parseInt(process.env.PORT || '4173', 10);
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

// Rate limiter for public contact form
const contactRateLimits = new Map();

/**
 * Parse cookies from request header
 */
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;

  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join('='));
    list[name] = value;
  });
  return list;
}

/**
 * Extract client IP address
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * Read request body (JSON or buffer)
 */
function parseRequestBody(req, maxBytes = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];

    req.on('data', chunk => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          const text = buffer.toString('utf-8');
          resolve(text ? JSON.parse(text) : {});
        } catch (err) {
          reject(new Error('Invalid JSON payload'));
        }
      } else {
        resolve(buffer);
      }
    });

    req.on('error', err => reject(err));
  });
}

/**
 * Send JSON response
 */
function sendJson(res, statusCode, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...headers
  });
  res.end(body);
}

/**
 * Send Redirect response
 */
function sendRedirect(res, location, cookies = []) {
  const headers = {
    'Location': location,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
  if (cookies.length > 0) {
    headers['Set-Cookie'] = cookies;
  }
  res.writeHead(302, headers);
  res.end();
}

/**
 * Send Static File with security headers and traversal prevention
 */
function serveStaticFile(req, res, filePath) {
  // Prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Access denied.');
    return;
  }

  // Strict Data Privacy & Information Disclosure Guard:
  // Disallow direct static access to private stores (.env, data/*, server/*, scripts/*, server.js, etc.)
  const relativePath = path.relative(ROOT_DIR, normalizedPath).replace(/\\/g, '/');
  const isForbidden = 
    relativePath.startsWith('.') ||
    /(^|\/)\.[^/]+/.test(relativePath) ||
    /^(data|server|scripts|docs|node_modules)(\/|$)/i.test(relativePath) ||
    /^(server\.js|package\.json|package-lock\.json|test-.*\.js|audit-.*\.js)$/i.test(relativePath);

  if (isForbidden) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Access denied.');
    return;
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    if (ext === '.html') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=3600';
    }

    res.writeHead(200, headers);
    fs.createReadStream(normalizedPath).pipe(res);
  });
}

/**
 * MAIN REQUEST DISPATCHER
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method.toUpperCase();
  const cookies = parseCookies(req);
  const clientIp = getClientIp(req);

  // Default security headers on all responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Verify active session for request
  const session = auth.validateSession(cookies.owner_session);

  // ==========================================================================
  // 1. PUBLIC AUTH API ENDPOINTS
  // ==========================================================================
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const userAgent = req.headers['user-agent'] || '';
      const result = auth.authenticateOwner(body.email, body.password, clientIp, userAgent);

      if (!result.success) {
        security.logSecurityEvent('LOGIN_FAILURE', `Failed login attempt for ${body.email || 'unknown'}`, {
          severity: 'WARN',
          ip: clientIp,
          metadata: { email: body.email }
        });
        return sendJson(res, 401, { error: result.error, locked: !!result.locked });
      }

      security.logSecurityEvent('LOGIN_SUCCESS', 'Owner authenticated successfully', {
        severity: 'INFO',
        ip: clientIp
      });

      // Issue HttpOnly, SameSite=Strict cookie
      const cookieHeader = `owner_session=${result.sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
      return sendJson(res, 200, {
        success: true,
        user: result.user,
        csrfToken: result.csrfToken
      }, { 'Set-Cookie': cookieHeader });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    if (cookies.owner_session) {
      auth.destroySession(cookies.owner_session);
    }
    security.logSecurityEvent('LOGOUT', 'Owner session terminated via logout', {
      severity: 'INFO',
      ip: clientIp
    });
    const clearCookie = `owner_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return sendJson(res, 200, { success: true }, { 'Set-Cookie': clearCookie });
  }

  if (pathname === '/api/auth/status' && method === 'GET') {
    if (session) {
      return sendJson(res, 200, {
        authenticated: true,
        user: session.user,
        csrfToken: session.csrfToken
      });
    } else {
      return sendJson(res, 200, { authenticated: false });
    }
  }

  // ==========================================================================
  // 2. PUBLIC CONTACT INQUIRY SUBMISSION (Write-Only)
  // ==========================================================================
  if (pathname === '/api/contact' && method === 'POST') {
    try {
      // IP Rate limiting: max 5 submissions per hour (100 for local test suites)
      const now = Date.now();
      const ipRecord = contactRateLimits.get(clientIp) || { count: 0, first: now };
      if (now - ipRecord.first > 60 * 60 * 1000) {
        ipRecord.count = 0;
        ipRecord.first = now;
      }
      const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost' || clientIp === '::ffff:127.0.0.1';
      const maxSubmissions = isLoopback ? 100 : 5;
      if (ipRecord.count >= maxSubmissions) {
        return sendJson(res, 429, { error: 'Rate limit exceeded. Please try again later or email directly.' });
      }

      const body = await parseRequestBody(req);

      // Honeypot field check
      if (body.website_trap || body._hp) {
        // Silently accept bot submission without saving
        return sendJson(res, 200, { success: true });
      }

      const name = (body.name || '').trim();
      const email = (body.email || '').trim();
      const subject = (body.subject || 'General Inquiry').trim();
      const message = (body.message || '').trim();

      if (!name || name.length < 2) {
        return sendJson(res, 400, { error: 'Please provide a valid name.' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return sendJson(res, 400, { error: 'Please provide a valid email address.' });
      }
      if (!message || message.length < 10) {
        return sendJson(res, 400, { error: 'Message must be at least 10 characters long.' });
      }

      const newMsg = {
        id: `msg-${Date.now()}`,
        name: name.slice(0, 100),
        email: email.slice(0, 120),
        subject: subject.slice(0, 150),
        message: message.slice(0, 5000),
        createdAt: new Date().toISOString(),
        read: false,
        archived: false,
        ipHash: require('node:crypto').createHash('sha256').update(clientIp).digest('hex').slice(0, 16)
      };

      db.addMessage(newMsg);
      ipRecord.count += 1;
      contactRateLimits.set(clientIp, ipRecord);

      return sendJson(res, 200, { success: true, message: 'Message successfully sent.' });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // ==========================================================================
  // 3. PUBLIC SANITIZED PORTFOLIO DATA
  // ==========================================================================
  if (pathname === '/api/public/data' && method === 'GET') {
    const data = db.getPortfolioData();
    // Strictly omit any internal or draft data
    return sendJson(res, 200, {
      profile: data.profile || {},
      projects: (data.projects || []).filter(p => p.status !== 'Draft'),
      experience: data.experience || [],
      skills: data.skills || { items: [] },
      achievements: data.achievements || [],
      about: data.about || {},
      resume: data.resume || {},
      contact: data.contact || {}
    });
  }

  // ==========================================================================
  // 4. PROTECTED ADMIN REST API (/api/admin/*)
  // Strict server-side authorization: requires valid owner session
  // ==========================================================================
  if (pathname.startsWith('/api/admin/')) {
    if (!session) {
      security.logSecurityEvent('PERMISSION_FAILURE', `Unauthorized access attempt to ${pathname}`, {
        severity: 'WARN',
        ip: clientIp,
        metadata: { path: pathname, method: method }
      });
      return sendJson(res, 401, { error: 'Unauthorized: Owner authentication required.' });
    }

    // CSRF Check on state-mutating requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfHeader || csrfHeader !== session.csrfToken) {
        security.logSecurityEvent('PERMISSION_FAILURE', `CSRF token validation failed on ${pathname}`, {
          severity: 'ALERT',
          ip: clientIp,
          metadata: { path: pathname, method: method }
        });
        return sendJson(res, 403, { error: 'Forbidden: Invalid CSRF token.' });
      }
    }

    // --- A. Dashboard Stats ---
    if (pathname === '/api/admin/dashboard' && method === 'GET') {
      const data = db.getPortfolioData();
      const messages = db.getMessages();
      const settings = db.getSettings();

      return sendJson(res, 200, {
        stats: {
          projectsCount: (data.projects || []).length,
          featuredProjectsCount: (data.projects || []).filter(p => p.featured).length,
          experienceCount: (data.experience || []).length,
          skillsCount: (data.skills?.items || []).length,
          achievementsCount: (data.achievements || []).length,
          totalMessages: messages.length,
          unreadMessages: messages.filter(m => !m.read).length,
          resumeVersion: data.resume?.version || 'v1.0',
          resumeLastUpdated: data.resume?.lastUpdated || 'Recently',
          lastContentUpdate: settings.lastUpdated || new Date().toISOString(),
          siteStatus: settings.siteStatus || 'live'
        },
        recentMessages: messages.slice(0, 5)
      });
    }

    // --- B. Profile Management ---
    if (pathname === '/api/admin/profile') {
      const data = db.getPortfolioData();
      if (method === 'GET') {
        return sendJson(res, 200, data.profile || {});
      }
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        data.profile = { ...data.profile, ...body };
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, profile: data.profile });
      }
    }

    // --- C. Projects Management ---
    if (pathname === '/api/admin/projects') {
      const data = db.getPortfolioData();
      if (method === 'GET') {
        return sendJson(res, 200, data.projects || []);
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        if (!body.title) return sendJson(res, 400, { error: 'Project title is required' });
        const newProject = {
          id: body.id || `proj-${Date.now()}`,
          title: body.title,
          slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          shortDescription: body.shortDescription || '',
          description: body.description || '',
          category: body.category || 'Systems',
          featured: Boolean(body.featured),
          status: body.status || 'Active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tagline: body.tagline || '',
          metadata: body.metadata || { role: 'Lead Engineer', timeline: '2026', teamSize: '1' },
          technologies: Array.isArray(body.technologies) ? body.technologies : [],
          impact: body.impact || '',
          githubUrl: body.githubUrl || '',
          liveUrl: body.liveUrl || '',
          demoUrl: body.demoUrl || '',
          problem: body.problem || '',
          solution: body.solution || '',
          features: body.features || [],
          architecture: body.architecture || { nodes: [] },
          engineeringDecisions: body.engineeringDecisions || [],
          contribution: body.contribution || [],
          results: body.results || [],
          challenges: body.challenges || []
        };
        data.projects = data.projects || [];
        data.projects.unshift(newProject);
        db.savePortfolioData(data);
        return sendJson(res, 201, { success: true, project: newProject });
      }
    }

    const projectMatch = pathname.match(/^\/api\/admin\/projects\/([a-zA-Z0-9_-]+)$/);
    if (projectMatch) {
      const id = projectMatch[1];
      const data = db.getPortfolioData();
      const index = (data.projects || []).findIndex(p => p.id === id || p.slug === id);

      if (index === -1) {
        return sendJson(res, 404, { error: 'Project not found' });
      }

      if (method === 'GET') {
        return sendJson(res, 200, data.projects[index]);
      }
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        data.projects[index] = {
          ...data.projects[index],
          ...body,
          updatedAt: new Date().toISOString()
        };
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, project: data.projects[index] });
      }
      if (method === 'DELETE') {
        const deleted = data.projects.splice(index, 1)[0];
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, deleted: deleted.title });
      }
    }

    if (pathname === '/api/admin/projects/reorder' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (Array.isArray(body.projectIds)) {
        const data = db.getPortfolioData();
        const map = new Map(data.projects.map(p => [p.id, p]));
        const reordered = [];
        body.projectIds.forEach(id => {
          if (map.has(id)) {
            reordered.push(map.get(id));
            map.delete(id);
          }
        });
        // append any remaining
        map.forEach(p => reordered.push(p));
        data.projects = reordered;
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true });
      }
    }

    // --- D. Experience Management ---
    if (pathname === '/api/admin/experience') {
      const data = db.getPortfolioData();
      if (method === 'GET') {
        return sendJson(res, 200, data.experience || []);
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const newExp = {
          id: body.id || `exp-${Date.now()}`,
          organization: body.organization || 'Organization',
          role: body.role || 'Software Engineer',
          employmentType: body.employmentType || 'Internship',
          startDate: body.startDate || '2026',
          endDate: body.endDate || 'Present',
          location: body.location || '',
          description: body.description || '',
          responsibilities: body.responsibilities || [],
          achievements: body.achievements || [],
          technologies: body.technologies || [],
          organizationUrl: body.organizationUrl || '',
          logoText: body.logoText || (body.organization ? body.organization.slice(0, 2).toUpperCase() : 'SWE')
        };
        data.experience = data.experience || [];
        data.experience.unshift(newExp);
        db.savePortfolioData(data);
        return sendJson(res, 201, { success: true, experience: newExp });
      }
    }

    const expMatch = pathname.match(/^\/api\/admin\/experience\/([a-zA-Z0-9_-]+)$/);
    if (expMatch) {
      const id = expMatch[1];
      const data = db.getPortfolioData();
      const index = (data.experience || []).findIndex(e => e.id === id);
      if (index === -1) return sendJson(res, 404, { error: 'Experience not found' });

      if (method === 'GET') return sendJson(res, 200, data.experience[index]);
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        data.experience[index] = { ...data.experience[index], ...body };
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, experience: data.experience[index] });
      }
      if (method === 'DELETE') {
        data.experience.splice(index, 1);
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true });
      }
    }

    // --- E. Skills Management ---
    if (pathname === '/api/admin/skills') {
      const data = db.getPortfolioData();
      if (method === 'GET') {
        return sendJson(res, 200, data.skills || { items: [] });
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const newItem = {
          id: body.id || `skill-${Date.now()}`,
          name: body.name || 'Skill',
          category: body.category || 'Programming Languages',
          level: body.level || 'Proficient',
          projectsCount: parseInt(body.projectsCount, 10) || 1,
          featured: Boolean(body.featured),
          officialDocUrl: body.officialDocUrl || ''
        };
        data.skills = data.skills || { items: [] };
        data.skills.items.push(newItem);
        db.savePortfolioData(data);
        return sendJson(res, 201, { success: true, skill: newItem });
      }
    }

    const skillMatch = pathname.match(/^\/api\/admin\/skills\/([a-zA-Z0-9_-]+)$/);
    if (skillMatch) {
      const id = skillMatch[1];
      const data = db.getPortfolioData();
      data.skills = data.skills || { items: [] };
      const index = data.skills.items.findIndex(s => s.id === id);
      if (index === -1) return sendJson(res, 404, { error: 'Skill not found' });

      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        data.skills.items[index] = { ...data.skills.items[index], ...body };
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, skill: data.skills.items[index] });
      }
      if (method === 'DELETE') {
        data.skills.items.splice(index, 1);
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true });
      }
    }

    // --- F. Achievements Management ---
    if (pathname === '/api/admin/achievements') {
      const data = db.getPortfolioData();
      if (method === 'GET') {
        return sendJson(res, 200, data.achievements || []);
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const newAch = {
          id: body.id || `ach-${Date.now()}`,
          title: body.title,
          category: body.category || 'Hackathons',
          organization: body.organization || '',
          date: body.date || '2026',
          description: body.description || '',
          badgeText: body.badgeText || 'Distinction',
          verified: Boolean(body.verified !== false),
          credentialUrl: body.credentialUrl || '',
          credentialId: body.credentialId || '',
          featured: Boolean(body.featured)
        };
        data.achievements = data.achievements || [];
        data.achievements.unshift(newAch);
        db.savePortfolioData(data);
        return sendJson(res, 201, { success: true, achievement: newAch });
      }
    }

    const achMatch = pathname.match(/^\/api\/admin\/achievements\/([a-zA-Z0-9_-]+)$/);
    if (achMatch) {
      const id = achMatch[1];
      const data = db.getPortfolioData();
      const index = (data.achievements || []).findIndex(a => a.id === id);
      if (index === -1) return sendJson(res, 404, { error: 'Achievement not found' });

      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        data.achievements[index] = { ...data.achievements[index], ...body };
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, achievement: data.achievements[index] });
      }
      if (method === 'DELETE') {
        data.achievements.splice(index, 1);
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true });
      }
    }

    // --- G. About Management ---
    if (pathname === '/api/admin/about') {
      const data = db.getPortfolioData();
      if (method === 'GET') {
        return sendJson(res, 200, data.about || {});
      }
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        data.about = { ...data.about, ...body };
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, about: data.about });
      }
    }

    // --- H. Resume Management & Upload ---
    if (pathname === '/api/admin/resume') {
      const data = db.getPortfolioData();
      if (method === 'GET') {
        return sendJson(res, 200, data.resume || {});
      }
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        data.resume = { ...data.resume, ...body };
        db.savePortfolioData(data);
        return sendJson(res, 200, { success: true, resume: data.resume });
      }
    }

    if (pathname === '/api/admin/resume/upload' && method === 'POST') {
      try {
        const body = await parseRequestBody(req, 6 * 1024 * 1024);
        let pdfBuffer;

        if (body.base64Data) {
          // Base64 JSON upload
          const cleanBase64 = body.base64Data.replace(/^data:application\/pdf;base64,/, '');
          pdfBuffer = Buffer.from(cleanBase64, 'base64');
        } else if (Buffer.isBuffer(body)) {
          pdfBuffer = body;
        } else {
          return sendJson(res, 400, { error: 'No PDF file data received' });
        }

        // Validate PDF Magic Bytes (%PDF-)
        if (pdfBuffer.length < 5 || pdfBuffer.toString('utf-8', 0, 5) !== '%PDF-') {
          return sendJson(res, 400, { error: 'Invalid file format: only authentic PDF files are permitted.' });
        }

        // Max 5MB
        if (pdfBuffer.length > 5 * 1024 * 1024) {
          return sendJson(res, 400, { error: 'File size exceeds maximum allowed limit (5MB).' });
        }

        // Save PDF to both primary and subfolder asset locations
        const targetPath = path.join(ROOT_DIR, 'assets', 'Alex_Rivera_Software_Engineer_Resume.pdf');
        fs.writeFileSync(targetPath, pdfBuffer);
        const subPath = path.join(ROOT_DIR, 'assets', 'resume', 'Alex_Rivera_Software_Engineer_Resume.pdf');
        if (fs.existsSync(path.dirname(subPath))) {
          fs.writeFileSync(subPath, pdfBuffer);
        }

        // Update resume metadata in DB
        const data = db.getPortfolioData();
        data.resume = data.resume || {};
        data.resume.fileSize = `${Math.round(pdfBuffer.length / 1024)} KB`;
        data.resume.lastUpdated = `Updated on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        data.resume.version = body.version || data.resume.version || 'v2.5';
        db.savePortfolioData(data);

        security.logSecurityEvent('RESUME_UPLOAD', 'Resume PDF uploaded and synchronized', {
          severity: 'INFO',
          ip: clientIp,
          metadata: { fileSize: pdfBuffer.length }
        });

        return sendJson(res, 200, {
          success: true,
          message: 'Resume PDF successfully uploaded and published.',
          resume: data.resume
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // --- I. Private Messages Management ---
    if (pathname === '/api/admin/messages') {
      if (method === 'GET') {
        const messages = db.getMessages();
        return sendJson(res, 200, messages);
      }
    }

    const msgMatch = pathname.match(/^\/api\/admin\/messages\/([a-zA-Z0-9_-]+)$/);
    if (msgMatch) {
      const id = msgMatch[1];
      if (method === 'GET') {
        const msg = db.getMessage(id);
        if (!msg) return sendJson(res, 404, { error: 'Message not found' });
        return sendJson(res, 200, msg);
      }
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        const updated = db.updateMessage(id, body);
        if (!updated) return sendJson(res, 404, { error: 'Message not found' });
        return sendJson(res, 200, { success: true, message: updated });
      }
      if (method === 'DELETE') {
        const deleted = db.deleteMessage(id);
        if (!deleted) return sendJson(res, 404, { error: 'Message not found' });
        return sendJson(res, 200, { success: true });
      }
    }

    // --- J. Settings Management & Password Change ---
    if (pathname === '/api/admin/settings') {
      if (method === 'GET') {
        return sendJson(res, 200, db.getSettings());
      }
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        const updated = db.saveSettings({ ...db.getSettings(), ...body });
        return sendJson(res, 200, { success: true, settings: updated });
      }
    }

    if (pathname === '/api/admin/settings/password' && method === 'POST') {
      const body = await parseRequestBody(req);
      const result = auth.changePassword(body.currentPassword, body.newPassword);
      if (!result.success) {
        return sendJson(res, 400, { error: result.error });
      }
      security.logSecurityEvent('PASSWORD_CHANGE', 'Owner password updated', {
        severity: 'ALERT',
        ip: clientIp
      });
      // Issue new session after password change
      const userAgent = req.headers['user-agent'] || '';
      const loginResult = auth.authenticateOwner(session.user.email, body.newPassword, clientIp, userAgent);
      const cookieHeader = `owner_session=${loginResult.sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
      return sendJson(res, 200, {
        success: true,
        csrfToken: loginResult.csrfToken
      }, { 'Set-Cookie': cookieHeader });
    }

    // --- K. Security Center & Defensive Controls APIs ---
    if (pathname === '/api/admin/security/overview' && method === 'GET') {
      const currentToken = cookies.owner_session || '';
      return sendJson(res, 200, security.getSecurityOverview(currentToken));
    }

    if (pathname === '/api/admin/security/sessions' && method === 'GET') {
      const currentToken = cookies.owner_session || '';
      return sendJson(res, 200, security.listSessions(currentToken));
    }

    if (pathname === '/api/admin/security/sessions/revoke' && method === 'POST') {
      const body = await parseRequestBody(req);
      if (!body.sessionId) {
        return sendJson(res, 400, { error: 'Session ID required' });
      }
      const result = security.revokeSessionByMaskedId(body.sessionId, cookies.owner_session);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/admin/security/sessions/revoke-others' && method === 'POST') {
      const result = security.revokeOtherSessions(cookies.owner_session);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/admin/security/events' && method === 'GET') {
      const type = parsedUrl.searchParams.get('type') || 'ALL';
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '50', 10);
      return sendJson(res, 200, security.getSecurityEvents(type, limit));
    }

    if (pathname === '/api/admin/security/audit' && method === 'POST') {
      const auditResult = security.runDefensiveAudit();
      return sendJson(res, 200, auditResult);
    }

    if (pathname === '/api/admin/security/settings') {
      if (method === 'GET') {
        return sendJson(res, 200, security.getSecuritySettings());
      }
      if (method === 'PUT') {
        const body = await parseRequestBody(req);
        const updated = security.updateSecuritySettings(body);
        return sendJson(res, 200, { success: true, settings: updated });
      }
    }

    // If no matching /api/admin route
    return sendJson(res, 404, { error: 'Admin API endpoint not found' });
  }

  // ==========================================================================
  // 5. PROTECTED ADMIN PAGES ROUTE GUARD
  // All /admin and /admin/* routes require valid owner authentication
  // Except /admin/login which is public
  // ==========================================================================
  const cleanPath = pathname.replace(/\/+$/, ''); // strip trailing slash

  // Special public route: /admin/login
  if (cleanPath === '/admin/login' || cleanPath === '/admin/login.html') {
    // If already logged in, redirect to dashboard
    if (session) {
      return sendRedirect(res, '/admin/dashboard');
    }
    return serveStaticFile(req, res, path.join(ROOT_DIR, 'admin', 'login.html'));
  }

  // All other /admin routes require authentication
  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    if (!session) {
      // Unauthenticated visitor: redirect to login with return URL
      const redirectUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
      return sendRedirect(res, redirectUrl);
    }

    // Authenticated owner: map clean route to corresponding admin HTML file
    let adminFile;
    if (cleanPath === '/admin' || cleanPath === '/admin/dashboard') {
      adminFile = 'dashboard.html';
    } else {
      const subpage = cleanPath.replace(/^\/admin\//, '').replace(/\.html$/, '');
      adminFile = `${subpage}.html`;
    }

    const fullAdminFilePath = path.join(ROOT_DIR, 'admin', adminFile);
    if (fs.existsSync(fullAdminFilePath)) {
      return serveStaticFile(req, res, fullAdminFilePath);
    } else {
      return sendRedirect(res, '/admin/dashboard');
    }
  }

  // ==========================================================================
  // 6. PUBLIC PORTFOLIO PAGES & STATIC ASSETS
  // Strictly read-only for public visitors
  // ==========================================================================
  // Handle /projects/[slug] clean routing
  const projectSlugMatch = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)\/?$/);
  if (projectSlugMatch && projectSlugMatch[1] !== 'index') {
    return serveStaticFile(req, res, path.join(ROOT_DIR, 'case-study.html'));
  }

  // Handle direct resume PDF shortcuts
  if (pathname === '/resume.pdf' || pathname === '/J_Raghavendra_Software_Engineer_Resume.pdf' || pathname === '/Alex_Rivera_Software_Engineer_Resume.pdf') {
    const resumePdf = fs.existsSync(path.join(ROOT_DIR, 'assets', 'J_Raghavendra_Software_Engineer_Resume.pdf'))
      ? path.join(ROOT_DIR, 'assets', 'J_Raghavendra_Software_Engineer_Resume.pdf')
      : path.join(ROOT_DIR, 'assets', 'Alex_Rivera_Software_Engineer_Resume.pdf');
    return serveStaticFile(req, res, resumePdf);
  }

  let staticPath = pathname;
  if (staticPath === '/') {
    staticPath = '/index.html';
  }

  // Clean URL mapping: e.g. /projects -> projects.html or projects/index.html
  let candidatePath = path.join(ROOT_DIR, staticPath);

  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
    candidatePath = path.join(candidatePath, 'index.html');
  } else if (!fs.existsSync(candidatePath) && fs.existsSync(`${candidatePath}.html`)) {
    candidatePath = `${candidatePath}.html`;
  }

  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return serveStaticFile(req, res, candidatePath);
  }

  // Fallback 404: Serve branded 404.html
  const notFoundPath = path.join(ROOT_DIR, '404.html');
  if (fs.existsSync(notFoundPath)) {
    res.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
    return fs.createReadStream(notFoundPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p><a href="/">Return to Home</a></p></body></html>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Recruiter Portfolio & Admin Server running at http://localhost:${PORT}`);
  console.log(`[SERVER] Public portfolio: http://localhost:${PORT}/`);
  console.log(`[SERVER] Protected admin:  http://localhost:${PORT}/admin`);
});
