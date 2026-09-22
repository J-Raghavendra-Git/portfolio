/**
 * SCRIPT: UPDATE OWNER IDENTITY
 * Replaces demo/placeholder identity "J Raghavendra" and "raghavendraraghu71537@gmail.com"
 * with actual owner profile data: "J Raghavendra" and "raghavendraraghu71537@gmail.com".
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

const REPLACEMENTS = [
  { from: /J Raghavendra/g, to: 'J Raghavendra' },
  { from: /J RAGHAVENDRA/g, to: 'J RAGHAVENDRA' },
  { from: /alex\.rivera\.swe@gmail\.com/g, to: 'raghavendraraghu71537@gmail.com' },
  { from: /alex\.rivera@gmail\.com/g, to: 'raghavendraraghu71537@gmail.com' },
  { from: /<span class="brand-icon">AR<\/span>/g, to: '<span class="brand-icon">JR</span>' },
  { from: /aria-label="J Raghavendra Home"/g, to: 'aria-label="J Raghavendra Home"' },
  { from: /San Francisco, CA \/ Seattle, WA \(Open to Relocation & Remote\)/g, to: 'Bangalore, Karnataka (Open to Relocation & Remote)' },
  { from: /San Francisco, CA  \|  github\.com\/alex-rivera-swe  \|  linkedin\.com\/in\/alex-rivera/g, to: 'Bangalore, Karnataka  |  github.com  |  linkedin.com' },
  { from: /San Francisco, CA • alex\.rivera\.swe@gmail\.com • github\.com\/alex-rivera-swe • linkedin\.com\/in\/alex-rivera-swe/g, to: 'Bangalore, Karnataka • raghavendraraghu71537@gmail.com • github.com • linkedin.com' }
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const original = fs.readFileSync(filePath, 'utf-8');
  let updated = original;

  REPLACEMENTS.forEach(({ from, to }) => {
    updated = updated.replace(from, to);
  });

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf-8');
    console.log(`Updated identity in: ${path.relative(ROOT_DIR, filePath)}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['.git', 'node_modules', '.gemini', 'dist'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.html', '.js', '.json', '.md', '.txt', '.svg'].includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

console.log('Starting owner identity normalization to J Raghavendra...');
walkDir(ROOT_DIR);

// Update favicon text directly
const faviconPath = path.join(ROOT_DIR, 'assets', 'favicon.svg');
if (fs.existsSync(faviconPath)) {
  let fav = fs.readFileSync(faviconPath, 'utf-8');
  fav = fav.replace(/>AR</g, '>JR<').replace(/arGrad/g, 'jrGrad');
  fs.writeFileSync(faviconPath, fav, 'utf-8');
  console.log('Updated assets/favicon.svg to JR monogram');
}

// Re-generate Resume PDF
console.log('Rebuilding ATS Resume PDF with updated owner credentials...');
require('./generate-resume-pdf.js');

// Also copy to J_Raghavendra_Software_Engineer_Resume.pdf
const pdfSource = path.join(ROOT_DIR, 'assets', 'Alex_Rivera_Software_Engineer_Resume.pdf');
const pdfTarget1 = path.join(ROOT_DIR, 'assets', 'J_Raghavendra_Software_Engineer_Resume.pdf');
const pdfTarget2 = path.join(ROOT_DIR, 'assets', 'resume', 'J_Raghavendra_Software_Engineer_Resume.pdf');
if (fs.existsSync(pdfSource)) {
  fs.copyFileSync(pdfSource, pdfTarget1);
  fs.copyFileSync(pdfSource, pdfTarget2);
  console.log('Synchronized dual J_Raghavendra resume PDF files.');
}

console.log('Owner identity normalization complete!');
