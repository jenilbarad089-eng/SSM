/**
 * Smart Society Management System - Seed Password Hashing Utility
 * Run once: node hash-seed.js
 * Replaces plaintext passwords in data/seed.json with bcrypt hashes.
 * Safe to run multiple times (skips already-hashed passwords).
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, 'data', 'seed.json');
const SALT_ROUNDS = 10;

const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

let hashed = 0;
seed.users.forEach(user => {
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
    console.log(`  [skip] ${user.username} — already hashed`);
  } else {
    const plain = user.password;
    user.password = bcrypt.hashSync(plain, SALT_ROUNDS);
    hashed++;
    console.log(`  [done] ${user.username} — "${plain}" → bcrypt hash`);
  }
});

fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf8');
console.log(`\nDone. ${hashed} password(s) hashed. ${seed.users.length - hashed} already hashed.`);
