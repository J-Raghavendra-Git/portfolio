/**
 * PRODUCTION READINESS & ACCESSIBILITY QA SCANNER
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const publicHtml = [
  'index.html', 'projects.html', 'case-study.html', 'experience.html',
  'skills.html', 'achievements.html', 'about.html', 'resume.html', 'contact.html', '404.html'
];

let issues = [];

console.log('=== 1. HTML SEMANTICS & HEADINGS ===');
publicHtml.forEach(file => {
  const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf-8');
  
  // H1 Check
  const h1 = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  if (h1.length === 0) {
    issues.push(`${file}: Missing <h1> tag`);
  } else if (h1.length > 1) {
    issues.push(`${file}: Multiple <h1> tags (${h1.length})`);
  }

  // Title tag check
  const title = content.match(/<title>([^<]+)<\/title>/i);
  if (!title || !title[1].trim()) {
    issues.push(`${file}: Missing or empty <title> tag`);
  }

  // Meta description check
  const metaDesc = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (!metaDesc && file !== '404.html') {
    issues.push(`${file}: Missing meta description`);
  }

  // Canonical tag check
  const canonical = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canonical && file !== '404.html') {
    issues.push(`${file}: Missing canonical URL`);
  }

  // Favicon check
  const favicon = content.match(/<link\s+rel=["']icon["']/i);
  if (!favicon) {
    issues.push(`${file}: Missing favicon link`);
  }

  // Open Graph check
  const ogTitle = content.match(/<meta\s+property=["']og:title["']/i);
  const ogDesc = content.match(/<meta\s+property=["']og:description["']/i);
  if ((!ogTitle || !ogDesc) && file !== '404.html') {
    issues.push(`${file}: Incomplete Open Graph tags`);
  }

  // Form input labels check
  const inputs = content.match(/<(input|textarea|select)[^>]*>/gi) || [];
  inputs.forEach(tag => {
    if (tag.includes('type="hidden"')) return;
    const hasId = tag.match(/id=["']([^"']+)["']/);
    const hasAria = tag.includes('aria-label') || tag.includes('aria-labelledby');
    if (!hasId && !hasAria) {
      issues.push(`${file}: Form control missing id and aria label: ${tag}`);
    } else if (hasId) {
      const id = hasId[1];
      const hasLabel = content.includes(`for="${id}"`) || hasAria;
      if (!hasLabel) {
        issues.push(`${file}: Input #${id} has no matching <label for="${id}"> or aria-label`);
      }
    }
  });

  // Buttons check
  const buttons = content.match(/<button[^>]*>([\s\S]*?)<\/button>/gi) || [];
  buttons.forEach(btn => {
    const text = btn.replace(/<[^>]+>/g, '').trim();
    const hasAria = btn.includes('aria-label') || btn.includes('aria-labelledby');
    if (!text && !hasAria) {
      issues.push(`${file}: Button without text content or aria-label: ${btn.substring(0, 50)}`);
    }
  });
});

console.log('=== 2. ASSET HYGIENE & DEPENDENCIES ===');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
console.log('Package dependencies count:', Object.keys(pkg.dependencies || {}).length);
console.log('Zero external npm runtime bloat:', Object.keys(pkg.dependencies || {}).length === 0 ? 'YES' : 'NO');

console.log('\n=== 3. QA FINDINGS ===');
if (issues.length === 0) {
  console.log('ALL ACCESSIBILITY, SEO, AND SEMANTIC HTML CHECKS PASSED WITH 0 ISSUES!');
} else {
  console.log(`Found ${issues.length} issues:`);
  issues.forEach(i => console.log(' - ' + i));
}
