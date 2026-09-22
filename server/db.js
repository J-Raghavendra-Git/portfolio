/**
 * PORTFOLIO DATABASE & PERSISTENCE LAYER
 * Provides persistent atomic read/write storage for portfolio content,
 * private contact messages, owner auth credentials, sessions, and settings.
 * Public views are strictly read-only.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILES = {
  portfolio: path.join(DATA_DIR, 'portfolio-db.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  auth: path.join(DATA_DIR, 'auth.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  settings: path.join(DATA_DIR, 'settings.json')
};

/**
 * Atomic write helper to prevent partial writes / corruption
 */
function atomicWriteJson(filePath, data) {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Safe JSON read helper with fallback
 */
function readJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[DB] Error reading ${filePath}:`, err);
  }
  return fallback;
}

/**
 * Seed initial portfolio data from js/portfolio-data.js if missing
 */
function initializePortfolioDb() {
  if (!fs.existsSync(DB_FILES.portfolio)) {
    console.log('[DB] Seeding portfolio data from js/portfolio-data.js...');
    try {
      const initialData = require(path.join(ROOT_DIR, 'js', 'portfolio-data.js'));
      atomicWriteJson(DB_FILES.portfolio, initialData);
      console.log('[DB] Portfolio data successfully initialized.');
    } catch (err) {
      console.error('[DB] Failed to seed from js/portfolio-data.js:', err);
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
  if (!fs.existsSync(DB_FILES.messages)) {
    // Check if there are messages staged in localStorage test or seed default
    atomicWriteJson(DB_FILES.messages, [
      {
        id: "msg-1726884900000",
        name: "Sarah Lin",
        email: "sarah.lin@cloudtech-partners.com",
        subject: "Senior Distributed Systems Internship — Fall 2026",
        message: "Hi Alex, we reviewed your TraceFlow case study and were really impressed by your zero-copy WASM parser. Our infrastructure team has an opening for Fall 2026 and we'd love to set up an introductory technical chat.",
        createdAt: "2026-09-21T10:15:00.000Z",
        read: true,
        archived: false
      },
      {
        id: "msg-1727003450000",
        name: "Marcus Vance",
        email: "m.vance@edge-networks.io",
        subject: "Technical Inquiry / Consensus Invariants",
        message: "Hi Alex, saw your implementation of Raft with deterministic simulation testing. What library did you use for fault injection under network partitions? Would love to connect regarding full-time SWE 2027.",
        createdAt: "2026-09-22T08:30:50.000Z",
        read: false,
        archived: false
      }
    ]);
  }

  // Initialize settings file if missing
  if (!fs.existsSync(DB_FILES.settings)) {
    atomicWriteJson(DB_FILES.settings, {
      siteStatus: "live", // "live" or "maintenance"
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
  if (!fs.existsSync(DB_FILES.sessions)) {
    atomicWriteJson(DB_FILES.sessions, {});
  }
}

// Run schema migrations and initial seed on load
const { runMigrations } = require('./migrations');
runMigrations();
initializePortfolioDb();

/**
 * Synchronize js/portfolio-data.js so static client fallback stays in sync
 */
function syncPortfolioDataJs(data) {
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
    atomicWriteJson(targetFile, fileContent);
  } catch (err) {
    console.error('[DB] Error synchronizing portfolio-data.js:', err);
  }
}

module.exports = {
  getPortfolioData() {
    return readJson(DB_FILES.portfolio, {});
  },

  savePortfolioData(data) {
    atomicWriteJson(DB_FILES.portfolio, data);
    // Also update settings.lastUpdated
    const settings = this.getSettings();
    settings.lastUpdated = new Date().toISOString();
    this.saveSettings(settings);
    // Sync client-side file
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
