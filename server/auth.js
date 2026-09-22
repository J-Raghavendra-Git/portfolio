/**
 * OWNER AUTHENTICATION & AUTHORIZATION SERVICE
 * Exactly ONE portfolio owner account.
 * Uses crypto.scryptSync for password hashing with unique 128-bit salt.
 * Timing-safe password comparisons, rate-limiting, and cryptographic session tokens.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db');

const ROOT_DIR = path.resolve(__dirname, '..');

// Automatically load .env if present (native Node or fallback parser)
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile(envPath);
        return;
      } catch (_) {}
    }
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["'](.*)["']$/, '$1');
            if (key && !(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
      });
    } catch (err) {
      console.error('[AUTH] Could not parse .env file:', err.message);
    }
  }
}
loadEnv();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiting tracking
const loginAttempts = new Map();

/**
 * Hash password with scrypt and salt
 */
function hashPassword(password, saltHex = null) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt: salt.toString('hex')
  };
}

/**
 * Constant-time password verification
 */
function verifyPassword(password, storedHash, storedSalt) {
  try {
    const salt = Buffer.from(storedSalt, 'hex');
    const hash = Buffer.from(storedHash, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(hash, derivedKey);
  } catch (err) {
    console.error('[AUTH] Verification error:', err);
    return false;
  }
}

/**
 * Initialize or synchronize owner account from environment configuration
 */
function initializeOwnerAccount() {
  const existingAuth = db.getAuth();
  const ownerEmail = (process.env.OWNER_EMAIL || existingAuth?.email || 'raghavendraraghu71537@gmail.com').toLowerCase().trim();

  // If OWNER_PASSWORD is explicitly configured in environment or .env, reconcile with DB
  if (process.env.OWNER_PASSWORD) {
    const isCurrentMatch = existingAuth && existingAuth.passwordHash && existingAuth.salt &&
      verifyPassword(process.env.OWNER_PASSWORD, existingAuth.passwordHash, existingAuth.salt);

    if (!isCurrentMatch || (existingAuth && existingAuth.email !== ownerEmail)) {
      console.log('[AUTH] Synchronizing owner credentials from environment configuration...');
      const { hash, salt } = hashPassword(process.env.OWNER_PASSWORD);
      const authRecord = {
        email: ownerEmail,
        name: existingAuth?.name || 'J Raghavendra',
        role: 'OWNER',
        passwordHash: hash,
        salt: salt,
        createdAt: existingAuth?.createdAt || new Date().toISOString(),
        lastPasswordChange: new Date().toISOString()
      };
      db.saveAuth(authRecord);
      db.saveSessions({}); // Invalidate previous sessions
      console.log(`[AUTH] Owner account synchronized for ${ownerEmail}`);
      return;
    }
  }

  // If no auth record exists at all, initialize default
  if (!existingAuth || !existingAuth.passwordHash) {
    console.log('[AUTH] Initializing default owner account...');
    const defaultPassword = process.env.OWNER_PASSWORD || 'Admin@2026!Secure';
    const { hash, salt } = hashPassword(defaultPassword);

    const authRecord = {
      email: ownerEmail,
      name: 'J Raghavendra',
      role: 'OWNER',
      passwordHash: hash,
      salt: salt,
      createdAt: new Date().toISOString(),
      lastPasswordChange: new Date().toISOString()
    };
    db.saveAuth(authRecord);
    console.log(`[AUTH] Owner account initialized for ${ownerEmail}`);
  }
}

// Ensure owner exists / is synchronized
initializeOwnerAccount();

module.exports = {
  /**
   * Rate limiting check for IP
   */
  checkRateLimit(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record) return { allowed: true };

    if (now - record.firstAttempt > LOCKOUT_WINDOW_MS) {
      loginAttempts.delete(ip);
      return { allowed: true };
    }

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      const remainingSeconds = Math.ceil((LOCKOUT_WINDOW_MS - (now - record.firstAttempt)) / 1000);
      return {
        allowed: false,
        remainingSeconds: remainingSeconds
      };
    }

    return { allowed: true };
  },

  recordFailedAttempt(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record || now - record.firstAttempt > LOCKOUT_WINDOW_MS) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      record.count += 1;
    }
  },

  clearFailedAttempts(ip) {
    loginAttempts.delete(ip);
  },

  /**
   * Validate owner login credentials
   */
  authenticateOwner(email, password, clientIp, userAgent = '') {
    const rateCheck = this.checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many failed attempts. Please try again in ${rateCheck.remainingSeconds} seconds.`,
        locked: true
      };
    }

    const auth = db.getAuth();
    if (!auth) {
      return { success: false, error: 'Authentication service unavailable.' };
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const storedEmail = (auth.email || '').trim().toLowerCase();

    // Support both raghavendraraghu71537@gmail.com and raghavendraraghu71537@gmail.com alias
    const isEmailMatch = (normalizedEmail === storedEmail) ||
      (storedEmail === 'raghavendraraghu71537@gmail.com' && normalizedEmail === 'raghavendraraghu71537@gmail.com') ||
      (storedEmail === 'raghavendraraghu71537@gmail.com' && normalizedEmail === 'raghavendraraghu71537@gmail.com');

    if (!isEmailMatch) {
      console.warn(`[AUTH] Login failed for "${normalizedEmail}": email does not match registered owner (${storedEmail})`);
      this.recordFailedAttempt(clientIp);
      return { success: false, error: 'Invalid email or password.' };
    }

    const isValid = verifyPassword(password, auth.passwordHash, auth.salt);
    if (!isValid) {
      console.warn(`[AUTH] Login failed for "${normalizedEmail}": incorrect password`);
      this.recordFailedAttempt(clientIp);
      return { success: false, error: 'Invalid email or password.' };
    }

    // Success: clear rate limit record
    this.clearFailedAttempts(clientIp);
    console.log(`[AUTH] Owner "${normalizedEmail}" successfully authenticated from ${clientIp}`);

    // Create secure session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;

    const sessions = db.getSessions();
    sessions[sessionToken] = {
      user: {
        email: auth.email,
        name: auth.name,
        role: 'OWNER'
      },
      csrfToken: csrfToken,
      createdAt: now,
      expiresAt: expiresAt,
      lastActivity: now,
      ip: clientIp,
      userAgent: userAgent
    };
    db.saveSessions(sessions);

    return {
      success: true,
      sessionToken: sessionToken,
      csrfToken: csrfToken,
      user: {
        email: auth.email,
        name: auth.name,
        role: 'OWNER'
      },
      expiresAt: expiresAt
    };
  },

  /**
   * Validate session token from cookie
   */
  validateSession(sessionToken) {
    if (!sessionToken) return null;
    const sessions = db.getSessions();
    const session = sessions[sessionToken];
    if (!session) return null;

    const now = Date.now();
    if (now > session.expiresAt) {
      delete sessions[sessionToken];
      db.saveSessions(sessions);
      return null;
    }

    // Refresh activity timestamp
    session.lastActivity = now;
    db.saveSessions(sessions);

    return session;
  },

  /**
   * Invalidate session (logout)
   */
  destroySession(sessionToken) {
    if (!sessionToken) return;
    const sessions = db.getSessions();
    if (sessions[sessionToken]) {
      delete sessions[sessionToken];
      db.saveSessions(sessions);
    }
  },

  /**
   * Revoke all sessions (e.g. on password change)
   */
  destroyAllSessions() {
    db.saveSessions({});
  },

  /**
   * Change owner password
   */
  changePassword(currentPassword, newPassword) {
    const auth = db.getAuth();
    if (!auth) return { success: false, error: 'Auth record not found' };

    const isValid = verifyPassword(currentPassword, auth.passwordHash, auth.salt);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    if (!newPassword || newPassword.length < 10) {
      return { success: false, error: 'New password must be at least 10 characters long.' };
    }

    const { hash, salt } = hashPassword(newPassword);
    auth.passwordHash = hash;
    auth.salt = salt;
    auth.lastPasswordChange = new Date().toISOString();
    db.saveAuth(auth);

    // Revoke all sessions except we will re-login
    this.destroyAllSessions();

    return { success: true };
  },

  hashPassword,
  verifyPassword
};
