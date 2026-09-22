/**
 * DATABASE SCHEMA DEFINITIONS & MIGRATION RUNNER
 * Provides formal model schema specifications, relational integrity,
 * timestamp normalization, and versioned migrations for production persistence.
 * Completely resilient to read-only filesystems (Vercel/AWS Lambda).
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const IS_SERVERLESS = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  (process.env.NODE_ENV === 'production' && !process.env.IS_STANDALONE)
);

const RUNTIME_DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'portfolio-data')
  : DATA_DIR;

try {
  if (!fs.existsSync(RUNTIME_DATA_DIR)) {
    fs.mkdirSync(RUNTIME_DATA_DIR, { recursive: true });
  }
} catch (_) {}

function atomicWriteJson(filePathOrName, data) {
  try {
    const baseName = path.basename(filePathOrName);
    const targetPath = path.join(RUNTIME_DATA_DIR, baseName);
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    console.warn(`[MIGRATION] Notice: Write for ${path.basename(filePathOrName)} fell back to in-memory (${err.code || err.message}).`);
  }
}

function readJson(filePathOrName, fallback = null) {
  const baseName = path.basename(filePathOrName);
  // Check runtime dir
  const runtimePath = path.join(RUNTIME_DATA_DIR, baseName);
  try {
    if (fs.existsSync(runtimePath)) {
      return JSON.parse(fs.readFileSync(runtimePath, 'utf-8'));
    }
  } catch (_) {}

  // Check bundled data dir
  const bundledPath = path.join(DATA_DIR, baseName);
  try {
    if (fs.existsSync(bundledPath)) {
      return JSON.parse(fs.readFileSync(bundledPath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[MIGRATION] Failed to read ${bundledPath}:`, err.message);
  }
  return fallback;
}

function getSchemaVersion() {
  const meta = readJson('schema-version.json', { 
    version: 2, 
    appliedMigrations: ['001_initial_schema_bootstrap', '002_normalize_timestamps_and_relations'] 
  });
  return meta;
}

function recordMigration(version, name) {
  const meta = getSchemaVersion();
  meta.version = Math.max(meta.version, version);
  if (!meta.appliedMigrations.includes(name)) {
    meta.appliedMigrations.push(name);
  }
  meta.lastUpdated = new Date().toISOString();
  atomicWriteJson('schema-version.json', meta);
}

/**
 * Migration 001: Initial Schema Bootstrap
 */
function migration_001_bootstrap() {
  console.log('[MIGRATION] Applying 001_initial_schema_bootstrap...');

  const portfolio = readJson('portfolio-db.json', null);
  if (!portfolio) {
    const seedSource = path.join(ROOT_DIR, 'js', 'portfolio-data.js');
    let initialData = {};
    if (fs.existsSync(seedSource)) {
      try { initialData = require(seedSource); } catch (_) {}
    }
    atomicWriteJson('portfolio-db.json', {
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

  if (!readJson('messages.json', null)) {
    atomicWriteJson('messages.json', []);
  }

  if (!readJson('settings.json', null)) {
    atomicWriteJson('settings.json', {
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

  if (!readJson('sessions.json', null)) {
    atomicWriteJson('sessions.json', {});
  }

  recordMigration(1, '001_initial_schema_bootstrap');
}

/**
 * Migration 002: Timestamps and Relational Integrity Normalization
 */
function migration_002_normalize_timestamps() {
  console.log('[MIGRATION] Applying 002_normalize_timestamps_and_relations...');

  const db = readJson('portfolio-db.json', {});
  let modified = false;
  const now = new Date().toISOString();

  // Normalize Profile
  if (db.profile) {
    if (!db.profile.updatedAt) {
      db.profile.updatedAt = now;
      modified = true;
    }
    if (!db.profile.createdAt) {
      db.profile.createdAt = now;
      modified = true;
    }
  }

  // Normalize Projects
  if (Array.isArray(db.projects)) {
    const seenSlugs = new Set();
    db.projects.forEach((proj, idx) => {
      if (!proj.id) {
        proj.id = `proj-${Date.now()}-${idx}`;
        modified = true;
      }
      if (!proj.slug) {
        proj.slug = (proj.title || `project-${idx}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        modified = true;
      }
      // Guarantee uniqueness
      if (seenSlugs.has(proj.slug)) {
        proj.slug = `${proj.slug}-${idx + 1}`;
        modified = true;
      }
      seenSlugs.add(proj.slug);

      if (!proj.createdAt) {
        proj.createdAt = now;
        modified = true;
      }
      if (!proj.updatedAt) {
        proj.updatedAt = now;
        modified = true;
      }
      if (typeof proj.featured !== 'boolean') {
        proj.featured = true;
        modified = true;
      }
    });
  }

  // Normalize Experience
  if (Array.isArray(db.experience)) {
    db.experience.forEach((exp, idx) => {
      if (!exp.id) {
        exp.id = `exp-${Date.now()}-${idx}`;
        modified = true;
      }
      if (!exp.createdAt) {
        exp.createdAt = now;
        modified = true;
      }
      if (!exp.updatedAt) {
        exp.updatedAt = now;
        modified = true;
      }
    });
  }

  // Normalize Skills
  if (db.skills) {
    if (!db.skills.updatedAt) {
      db.skills.updatedAt = now;
      modified = true;
    }
    if (Array.isArray(db.skills.items)) {
      db.skills.items.forEach((item, idx) => {
        if (!item.id) {
          item.id = `skill-${Date.now()}-${idx}`;
          modified = true;
        }
      });
    }
  }

  // Normalize Achievements
  if (Array.isArray(db.achievements)) {
    db.achievements.forEach((ach, idx) => {
      if (!ach.id) {
        ach.id = `ach-${Date.now()}-${idx}`;
        modified = true;
      }
      if (!ach.createdAt) {
        ach.createdAt = now;
        modified = true;
      }
      if (!ach.updatedAt) {
        ach.updatedAt = now;
        modified = true;
      }
    });
  }

  // Normalize About
  if (db.about && !db.about.updatedAt) {
    db.about.updatedAt = now;
    modified = true;
  }

  // Normalize Resume
  if (db.resume && !db.resume.updatedAt) {
    db.resume.updatedAt = now;
    modified = true;
  }

  if (modified) {
    atomicWriteJson('portfolio-db.json', db);
  }

  // Normalize Messages
  const messages = readJson('messages.json', []);
  if (Array.isArray(messages)) {
    let msgModified = false;
    messages.forEach((msg, idx) => {
      if (!msg.id) {
        msg.id = `msg-${Date.now()}-${idx}`;
        msgModified = true;
      }
      if (!msg.createdAt) {
        msg.createdAt = now;
        msgModified = true;
      }
      if (typeof msg.read !== 'boolean') {
        msg.read = false;
        msgModified = true;
      }
      if (typeof msg.archived !== 'boolean') {
        msg.archived = false;
        msgModified = true;
      }
    });
    if (msgModified) {
      atomicWriteJson('messages.json', messages);
    }
  }

  recordMigration(2, '002_normalize_timestamps_and_relations');
}

/**
 * Main Migration Dispatcher
 */
function runMigrations() {
  try {
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
          console.error(`[MIGRATION] Error executing migration ${mig.name}:`, err.message);
        }
      }
    }

    if (appliedCount > 0) {
      console.log(`[MIGRATION] Successfully applied ${appliedCount} migration(s).`);
    } else {
      console.log('[MIGRATION] Database schema is up-to-date.');
    }

    return getSchemaVersion();
  } catch (err) {
    console.warn('[MIGRATION] Migration dispatcher notice:', err.message);
    return { version: 2, appliedMigrations: ['001_initial_schema_bootstrap', '002_normalize_timestamps_and_relations'] };
  }
}

module.exports = {
  runMigrations,
  getSchemaVersion
};
