/**
 * PRODUCTION BUILD SCRIPT
 * Synchronizes static assets into public/ directory for Vercel Edge CDN distribution.
 * Ensures zero 404s for CSS, JS, fonts, images, and HTML routes on Vercel.
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('=== PREPARING VERCEL PUBLIC STATIC ASSETS ===');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// 1. Copy CSS, JS, and Assets directories
['css', 'js', 'assets'].forEach(dir => {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(PUBLIC_DIR, dir);
  copyDirRecursive(src, dest);
  console.log(`✓ Synchronized ${dir}/ -> public/${dir}/`);
});

// 2. Copy root static files
const rootFiles = [
  'robots.txt',
  'sitemap.xml',
  '404.html',
  'index.html',
  'about.html',
  'projects.html',
  'experience.html',
  'skills.html',
  'achievements.html',
  'resume.html',
  'contact.html',
  'case-study.html',
  'security.html'
];

rootFiles.forEach(file => {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(PUBLIC_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Synchronized ${file} -> public/${file}`);
  }
});

// 3. Copy subroute directories (about, projects, etc.)
['about', 'projects', 'experience', 'skills', 'achievements', 'resume', 'contact'].forEach(dir => {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(PUBLIC_DIR, dir);
  if (fs.existsSync(src)) {
    copyDirRecursive(src, dest);
    console.log(`✓ Synchronized ${dir}/ -> public/${dir}/`);
  }
});

console.log('=== VERCEL STATIC PUBLIC BUILD COMPLETED SUCCESSFULLY ===\n');
