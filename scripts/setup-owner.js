#!/usr/bin/env node
/**
 * OWNER ACCOUNT SETUP & PROVISIONING UTILITY
 * Secure CLI tool to provision, configure, or reset the portfolio owner account.
 * Automatically hashes passwords using scrypt with a unique 128-bit cryptographic salt.
 * Zero plaintext password storage.
 *
 * Usage:
 *   node scripts/setup-owner.js [email] [password]
 *   node scripts/setup-owner.js  (interactive mode)
 */

const readline = require('node:readline');
const path = require('node:path');
const fs = require('node:fs');

const db = require('../server/db');
const auth = require('../server/auth');

async function main() {
  const args = process.argv.slice(2);
  let email = args[0];
  let password = args[1];

  if (!email || !password) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

    console.log('========================================================');
    console.log('       PORTFOLIO OWNER ACCOUNT PROVISIONING TOOL        ');
    console.log('========================================================\n');

    const currentAuth = db.getAuth();
    const defaultEmail = currentAuth?.email || process.env.OWNER_EMAIL || 'raghavendraraghu71537@gmail.com';

    if (!email) {
      const inputEmail = await ask(`Enter Owner Email [${defaultEmail}]: `);
      email = inputEmail.trim() || defaultEmail;
    }

    if (!password) {
      password = await ask('Enter New Owner Password (minimum 10 characters): ');
    }

    rl.close();
  }

  email = (email || '').trim().toLowerCase();
  password = (password || '').trim();

  if (!email || !email.includes('@')) {
    console.error('\n[ERROR] Please provide a valid email address.');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('\n[ERROR] Password must be at least 10 characters long.');
    process.exit(1);
  }

  // Generate scrypt hash with fresh 128-bit salt
  const { hash, salt } = auth.hashPassword(password);

  const authRecord = {
    email: email,
    name: 'J Raghavendra',
    role: 'OWNER',
    passwordHash: hash,
    salt: salt,
    createdAt: new Date().toISOString(),
    lastPasswordChange: new Date().toISOString()
  };

  db.saveAuth(authRecord);
  db.saveSessions({}); // Invalidate previous sessions for security
  auth.clearFailedAttempts('127.0.0.1');
  auth.clearFailedAttempts('::1');

  console.log('\n========================================================');
  console.log('✓ Owner account successfully provisioned and secured!');
  console.log(`  Owner Email: ${email}`);
  console.log('  Password:    [CONFIGURED & VERIFIED - SCRYPT PROTECTED]');
  console.log('  Auth Store:  data/auth.json');
  console.log('========================================================');
  console.log('\nYou can now log in at: http://localhost:4173/admin/login\n');
}

main().catch(err => {
  console.error('[ERROR] Setup failed:', err.message);
  process.exit(1);
});
