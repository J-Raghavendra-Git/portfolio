/**
 * PORTFOLIO DATABASE & PERSISTENCE LAYER
 * Provides persistent atomic read/write storage for portfolio content,
 * private contact messages, owner auth credentials, sessions, and settings.
 * Supports standard local environments and serverless/ephemeral environments (Vercel/AWS Lambda).
 * Public views are strictly read-only.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUNDLED_DATA_DIR = path.join(ROOT_DIR, 'data');

// Detect serverless or read-only filesystem environment (e.g. Vercel, AWS Lambda)
const IS_SERVERLESS = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  (process.env.NODE_ENV === 'production' && !process.env.IS_STANDALONE)
);

// On serverless platforms, only /tmp (os.tmpdir()) is writable
const RUNTIME_DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'portfolio-data')
  : BUNDLED_DATA_DIR;

// Ensure runtime directory exists
try {
  if (!fs.existsSync(RUNTIME_DATA_DIR)) {
    fs.mkdirSync(RUNTIME_DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[DB] Notice: Could not create runtime data directory:', err.message);
}

// In-memory cache for ultra-fast access & resilient serverless ephemeral fallback
const memoryCache = new Map();

const DB_FILES = {
  portfolio: 'portfolio-db.json',
  messages: 'messages.json',
  auth: 'auth.json',
  sessions: 'sessions.json',
  settings: 'settings.json'
};

/**
 * Safe Atomic write helper
 * Writes to runtime directory (/tmp on serverless or data/ on local)
 * Retains state in-memory if disk is read-only
 */
function atomicWriteJson(filePathOrName, data) {
  const baseName = path.basename(filePathOrName);
  // Always update in-memory cache first
  memoryCache.set(baseName, data);

  // Attempt disk persistence in runtime directory
  try {
    const targetPath = path.join(RUNTIME_DATA_DIR, baseName);
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tempPath, targetPath);
    } catch (renameErr) {
      if (renameErr.code === 'EPERM' || renameErr.code === 'EBUSY') {
        fs.copyFileSync(tempPath, targetPath);
        try { fs.unlinkSync(tempPath); } catch (_) {}
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    // Graceful fallback for read-only filesystem environments (Vercel / Lambda)
    console.warn(`[DB] Notice: Write for ${baseName} fell back to memory store (${err.code || err.message}).`);
  }

  // Also sync to BUNDLED_DATA_DIR if different and writable
  if (RUNTIME_DATA_DIR !== BUNDLED_DATA_DIR) {
    try {
      const bundledTarget = path.join(BUNDLED_DATA_DIR, baseName);
      const tempPath = `${bundledTarget}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.renameSync(tempPath, bundledTarget);
      } catch (renameErr) {
        if (renameErr.code === 'EPERM' || renameErr.code === 'EBUSY') {
          fs.copyFileSync(tempPath, bundledTarget);
          try { fs.unlinkSync(tempPath); } catch (_) {}
        }
      }
    } catch (_) {
      // expected on read-only environments
    }
  }
}

/**
 * Safe JSON read helper
 * Checks: 1. Runtime directory (/tmp) -> 2. Bundled project data -> 3. Memory cache -> 4. Fallback
 */
function readJson(filePathOrName, fallback = {}) {
  const baseName = path.basename(filePathOrName);

  // 1. Check runtime directory (e.g. /tmp/portfolio-data/...)
  const runtimePath = path.join(RUNTIME_DATA_DIR, baseName);
  try {
    if (fs.existsSync(runtimePath)) {
      const content = fs.readFileSync(runtimePath, 'utf-8');
      const parsed = JSON.parse(content);
      memoryCache.set(baseName, parsed);
      return parsed;
    }
  } catch (err) {
    // continue to bundled
  }

  // 2. Check bundled project data directory
  const bundledPath = path.join(BUNDLED_DATA_DIR, baseName);
  try {
    if (fs.existsSync(bundledPath)) {
      const content = fs.readFileSync(bundledPath, 'utf-8');
      const parsed = JSON.parse(content);
      memoryCache.set(baseName, parsed);
      return parsed;
    }
  } catch (err) {
    // continue to cache
  }

  // 3. Check in-memory store
  if (memoryCache.has(baseName)) {
    return memoryCache.get(baseName);
  }

  return fallback;
}

/**
 * Seed initial portfolio data from bundled JSON or js/portfolio-data.js if missing
 */
function initializePortfolioDb() {
  const existingPortfolio = readJson(DB_FILES.portfolio, null);
  if (!existingPortfolio || !existingPortfolio.profile) {
    console.log('[DB] Seeding portfolio data from js/portfolio-data.js...');
    try {
      const initialData = require(path.join(ROOT_DIR, 'js', 'portfolio-data.js'));
      atomicWriteJson(DB_FILES.portfolio, initialData);
      console.log('[DB] Portfolio data successfully initialized.');
    } catch (err) {
      console.error('[DB] Failed to seed from js/portfolio-data.js:', err.message);
      atomicWriteJson(DB_FILES.portfolio, {
        profile: {},
        projects: [],
        experience: [],
        skills: { items: [] },
        achievements: [],
        about: {},
        resume: {},
        contact: {}
      });
    }
  }

  // Initialize messages file if missing
  const existingMessages = readJson(DB_FILES.messages, null);
  if (!existingMessages) {
    atomicWriteJson(DB_FILES.messages, [
      {
        id: "msg-1726884900000",
        name: "Sarah Lin",
        email: "sarah.lin@cloudtech-partners.com",
        subject: "Senior Distributed Systems Internship — Fall 2026",
        message: "Hi J Raghavendra, we reviewed your TraceFlow case study and were really impressed by your zero-copy WASM parser. Our infrastructure team has an opening for Fall 2026 and we'd love to set up an introductory technical chat.",
        createdAt: "2026-09-21T10:15:00.000Z",
        read: true,
        archived: false
      },
      {
        id: "msg-1727003450000",
        name: "Marcus Vance",
        email: "m.vance@edge-networks.io",
        subject: "Technical Inquiry / Consensus Invariants",
        message: "Hi J Raghavendra, saw your implementation of Raft with deterministic simulation testing. What library did you use for fault injection under network partitions? Would love to connect regarding full-time SWE 2027.",
        createdAt: "2026-09-22T08:30:50.000Z",
        read: false,
        archived: false
      }
    ]);
  }

  // Initialize settings file if missing
  const existingSettings = readJson(DB_FILES.settings, null);
  if (!existingSettings) {
    atomicWriteJson(DB_FILES.settings, {
      siteStatus: "live",
      portfolioVisibility: "public",
      contactAvailability: true,
      recruiterSlaText: "Typically within 24 hours",
      seoDefaults: {
        titlePrefix: "J Raghavendra | Systems & Distributed Infrastructure Engineer",
        defaultDescription: "Portfolio of J Raghavendra, Software Engineering student specializing in distributed consensus, high-concurrency network proxies, and low-latency cloud infrastructure. Seeking Fall 2026 internships & 2027 full-time SWE."
      },
      themePreference: "dark-first",
      lastUpdated: new Date().toISOString()
    });
  }

  // Initialize sessions file if missing
  const existingSessions = readJson(DB_FILES.sessions, null);
  if (!existingSessions) {
    atomicWriteJson(DB_FILES.sessions, {});
  }
}

// Run schema migrations and initial seed on load
const { runMigrations } = require('./migrations');
try {
  runMigrations();
} catch (migErr) {
  console.warn('[DB] Migration runner notice:', migErr.message);
}
initializePortfolioDb();

/**
 * Synchronize js/portfolio-data.js so static client fallback stays in sync
 */
function syncPortfolioDataJs(data) {
  if (IS_SERVERLESS) {
    // In serverless, static bundle files are read-only; no-op
    return;
  }
  try {
    const fileContent = `/**
 * UNIFIED PORTFOLIO DATA STORE
 * Cleanly structured data source for candidate profile, projects, experience, skills, and achievements.
 * Auto-synced from private admin system.
 */

const PORTFOLIO_DATA = ${JSON.stringify(data, null, 2)};

// Export for module use if in Node or make globally accessible in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PORTFOLIO_DATA;
}
`;
    const targetFile = path.join(ROOT_DIR, 'js', 'portfolio-data.js');
    const tempPath = `${targetFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, fileContent, 'utf-8');
    fs.renameSync(tempPath, targetFile);
  } catch (err) {
    console.warn('[DB] Notice: Could not sync portfolio-data.js to disk:', err.message);
  }
}

module.exports = {
  IS_SERVERLESS,
  RUNTIME_DATA_DIR,
  BUNDLED_DATA_DIR,
  readJson,
  atomicWriteJson,

  getPortfolioData() {
    return readJson(DB_FILES.portfolio, {});
  },

  savePortfolioData(data) {
    atomicWriteJson(DB_FILES.portfolio, data);
    // Also update settings.lastUpdated
    const settings = this.getSettings();
    settings.lastUpdated = new Date().toISOString();
    this.saveSettings(settings);
    // Sync client-side file if locally writable
    syncPortfolioDataJs(data);
    return data;
  },

  getMessages() {
    return readJson(DB_FILES.messages, []);
  },

  getMessage(id) {
    const messages = this.getMessages();
    return messages.find(m => m.id === id) || null;
  },

  addMessage(messageObj) {
    const messages = this.getMessages();
    messages.unshift(messageObj);
    atomicWriteJson(DB_FILES.messages, messages);
    return messageObj;
  },

  updateMessage(id, updates) {
    const messages = this.getMessages();
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return null;
    messages[index] = { ...messages[index], ...updates };
    atomicWriteJson(DB_FILES.messages, messages);
    return messages[index];
  },

  deleteMessage(id) {
    let messages = this.getMessages();
    const prevLength = messages.length;
    messages = messages.filter(m => m.id !== id);
    if (messages.length !== prevLength) {
      atomicWriteJson(DB_FILES.messages, messages);
      return true;
    }
    return false;
  },

  getSettings() {
    return readJson(DB_FILES.settings, {});
  },

  saveSettings(settings) {
    atomicWriteJson(DB_FILES.settings, settings);
    return settings;
  },

  getAuth() {
    return readJson(DB_FILES.auth, null);
  },

  saveAuth(authData) {
    atomicWriteJson(DB_FILES.auth, authData);
    return authData;
  },

  getSessions() {
    return readJson(DB_FILES.sessions, {});
  },

  saveSessions(sessions) {
    atomicWriteJson(DB_FILES.sessions, sessions);
    return sessions;
  }
};
