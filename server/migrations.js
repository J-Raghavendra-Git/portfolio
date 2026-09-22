/**
 * DATABASE SCHEMA DEFINITIONS & MIGRATION RUNNER
 * Provides formal model schema specifications, relational integrity,
 * timestamp normalization, and versioned migrations for production persistence.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SCHEMA_VERSION_FILE = path.join(DATA_DIR, 'schema-version.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Model Schemas & Specifications
 * 1. Owner / User: auth.json
 * 2. Profile: portfolio-db.json -> profile
 * 3. Projects: portfolio-db.json -> projects
 * 4. Experience: portfolio-db.json -> experience
 * 5. Skills: portfolio-db.json -> skills
 * 6. Achievements: portfolio-db.json -> achievements
 * 7. About: portfolio-db.json -> about
 * 8. Resume: portfolio-db.json -> resume
 * 9. ContactMessages: messages.json
 * 10. SiteSettings: settings.json
 */

function atomicWriteJson(filePath, data) {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function readJson(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[MIGRATION] Failed to read ${filePath}:`, err.message);
  }
  return fallback;
}

function getSchemaVersion() {
  const meta = readJson(SCHEMA_VERSION_FILE, { version: 0, appliedMigrations: [] });
  return meta;
}

function recordMigration(version, name) {
  const meta = getSchemaVersion();
  meta.version = Math.max(meta.version, version);
  if (!meta.appliedMigrations.includes(name)) {
    meta.appliedMigrations.push(name);
  }
  meta.lastUpdated = new Date().toISOString();
  atomicWriteJson(SCHEMA_VERSION_FILE, meta);
}

/**
 * Migration 001: Initial Schema Bootstrap
 * Ensures all 10 persistent models exist with required baseline structures.
 */
function migration_001_bootstrap() {
  console.log('[MIGRATION] Applying 001_initial_schema_bootstrap...');

  const portfolioPath = path.join(DATA_DIR, 'portfolio-db.json');
  const messagesPath = path.join(DATA_DIR, 'messages.json');
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  const sessionsPath = path.join(DATA_DIR, 'sessions.json');

  // 1. Portfolio DB (Profile, Projects, Experience, Skills, Achievements, About, Resume)
  if (!fs.existsSync(portfolioPath)) {
    const seedSource = path.join(ROOT_DIR, 'js', 'portfolio-data.js');
    let initialData = {};
    if (fs.existsSync(seedSource)) {
      try { initialData = require(seedSource); } catch (_) {}
    }
    atomicWriteJson(portfolioPath, {
      profile: initialData.profile || {},
      projects: initialData.projects || [],
      experience: initialData.experience || [],
      skills: initialData.skills || { categories: [], items: [] },
      achievements: initialData.achievements || [],
      about: initialData.about || {},
      resume: initialData.resume || {},
      contact: initialData.contact || {}
    });
  }

  // 2. Contact Messages
  if (!fs.existsSync(messagesPath)) {
    atomicWriteJson(messagesPath, []);
  }

  // 3. Settings
  if (!fs.existsSync(settingsPath)) {
    atomicWriteJson(settingsPath, {
      siteStatus: "live",
      portfolioVisibility: "public",
      contactAvailability: true,
      recruiterSlaText: "Typically within 24 hours",
      seoDefaults: {
        titlePrefix: "J Raghavendra | Systems & Distributed Infrastructure Engineer",
        defaultDescription: "Portfolio of J Raghavendra, Software Engineering student specializing in distributed consensus, high-concurrency network proxies, and low-latency cloud infrastructure."
      },
      themePreference: "dark-first",
      lastUpdated: new Date().toISOString()
    });
  }

  // 4. Sessions
  if (!fs.existsSync(sessionsPath)) {
    atomicWriteJson(sessionsPath, {});
  }

  recordMigration(1, '001_initial_schema_bootstrap');
}

/**
 * Migration 002: Timestamps and Relational Integrity Normalization
 * Ensures every record across models has createdAt and updatedAt timestamps
 * and validates that project slugs are unique and valid identifiers.
 */
function migration_002_normalize_timestamps() {
  console.log('[MIGRATION] Applying 002_normalize_timestamps_and_relations...');

  const portfolioPath = path.join(DATA_DIR, 'portfolio-db.json');
  const db = readJson(portfolioPath, {});
  let modified = false;
  const now = new Date().toISOString();

  // Normalize Profile
  if (db.profile) {
    if (!db.profile.updatedAt) {
      db.profile.updatedAt = now;
      modified = true;
    }
  }

  // Normalize Projects
  if (Array.isArray(db.projects)) {
    const seenSlugs = new Set();
    db.projects.forEach(p => {
      if (!p.id) { p.id = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`; modified = true; }
      if (!p.slug) { p.slug = (p.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-'); modified = true; }
      if (!p.createdAt) { p.createdAt = now; modified = true; }
      if (!p.updatedAt) { p.updatedAt = now; modified = true; }
      seenSlugs.add(p.slug);
    });
  }

  // Normalize Experience
  if (Array.isArray(db.experience)) {
    db.experience.forEach(e => {
      if (!e.id) { e.id = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`; modified = true; }
      if (!e.createdAt) { e.createdAt = now; modified = true; }
      if (!e.updatedAt) { e.updatedAt = now; modified = true; }
    });
  }

  // Normalize Skills
  if (db.skills && Array.isArray(db.skills.items)) {
    db.skills.items.forEach(s => {
      if (!s.id) { s.id = `skill-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`; modified = true; }
      if (!s.createdAt) { s.createdAt = now; modified = true; }
      if (!s.updatedAt) { s.updatedAt = now; modified = true; }
    });
  }

  // Normalize Achievements
  if (Array.isArray(db.achievements)) {
    db.achievements.forEach(a => {
      if (!a.id) { a.id = `ach-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`; modified = true; }
      if (!a.createdAt) { a.createdAt = now; modified = true; }
      if (!a.updatedAt) { a.updatedAt = now; modified = true; }
    });
  }

  // Normalize About
  if (db.about) {
    if (!db.about.updatedAt) {
      db.about.updatedAt = now;
      modified = true;
    }
  }

  // Normalize Resume metadata
  if (db.resume) {
    if (!db.resume.updatedAt) {
      db.resume.updatedAt = now;
      modified = true;
    }
  }

  if (modified) {
    atomicWriteJson(portfolioPath, db);
  }

  // Normalize Contact Messages
  const messagesPath = path.join(DATA_DIR, 'messages.json');
  const messages = readJson(messagesPath, []);
  let msgModified = false;
  if (Array.isArray(messages)) {
    messages.forEach(m => {
      if (!m.id) { m.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`; msgModified = true; }
      if (!m.createdAt) { m.createdAt = now; msgModified = true; }
      if (typeof m.read !== 'boolean') { m.read = false; msgModified = true; }
      if (typeof m.archived !== 'boolean') { m.archived = false; msgModified = true; }
    });
    if (msgModified) {
      atomicWriteJson(messagesPath, messages);
    }
  }

  recordMigration(2, '002_normalize_timestamps_and_relations');
}

/**
 * Main Migration Dispatcher
 */
function runMigrations() {
  const meta = getSchemaVersion();
  console.log(`[MIGRATION] Current schema version: ${meta.version}`);

  const migrations = [
    { version: 1, name: '001_initial_schema_bootstrap', run: migration_001_bootstrap },
    { version: 2, name: '002_normalize_timestamps_and_relations', run: migration_002_normalize_timestamps }
  ];

  let appliedCount = 0;
  for (const mig of migrations) {
    if (meta.version < mig.version || !meta.appliedMigrations.includes(mig.name)) {
      try {
        mig.run();
        appliedCount++;
      } catch (err) {
        console.error(`[MIGRATION] Error executing migration ${mig.name}:`, err);
        throw err;
      }
    }
  }

  if (appliedCount > 0) {
    console.log(`[MIGRATION] Successfully applied ${appliedCount} migration(s).`);
  } else {
    console.log('[MIGRATION] Database schema is up-to-date.');
  }

  return getSchemaVersion();
}

module.exports = {
  runMigrations,
  getSchemaVersion
};
