/**
 * STANDALONE DATABASE MIGRATION RUNNER
 * Usage: node scripts/migrate.js
 */

const { runMigrations, getSchemaVersion } = require('../server/migrations');

console.log('====================================================');
console.log('RUNNING PRODUCTION DATABASE SCHEMA MIGRATIONS');
console.log('====================================================');

try {
  const result = runMigrations();
  console.log('Migration completed successfully.');
  console.log(`Current Schema Version: ${result.version}`);
  console.log(`Applied Migrations: ${result.appliedMigrations.join(', ')}`);
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
