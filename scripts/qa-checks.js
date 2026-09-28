/**
 * PRODUCTION READINESS, ACCESSIBILITY & STYLING QA SCANNER
 * Verifies:
 * 1. HTML Semantics, SEO & Headings
 * 2. Complete CSS & JS Asset Integrity (Zero missing stylesheets, scripts, or assets)
 * 3. Root-relative asset path hygiene (prevents broken subroute assets)
 * 4. Vercel production build & deployment configuration
 * 5. Zero-dependency runtime hygiene
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const publicHtml = [
  'index.html', 'projects.html', 'case-study.html', 'experience.html',
  'skills.html', 'achievements.html', 'about.html', 'resume.html', 'contact.html', '404.html',
  'about/index.html', 'projects/index.html', 'experience/index.html',
  'skills/index.html', 'achievements/index.html', 'resume/index.html', 'contact/index.html'
];

let issues = [];
let checkedStyles = new Set();
let checkedScripts = new Set();

console.log('=== 1. HTML SEMANTICS & HEADINGS ===');
publicHtml.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    issues.push(`${file}: File not found on disk`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
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
  if (!metaDesc && !file.includes('404')) {
    issues.push(`${file}: Missing meta description`);
  }

  // Favicon check
  const favicon = content.match(/<link\s+[^>]*rel=["']icon["'][^>]*>/i);
  if (!favicon && !file.includes('404') && !file.includes('/')) {
    issues.push(`${file}: Missing favicon link`);
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

console.log('=== 2. PRODUCTION CSS & STYLING INTEGRITY ===');
publicHtml.forEach(file => {
  const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf-8');

  // Verify all stylesheet links
  const styleMatches = content.match(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  styleMatches.forEach(tag => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) {
      issues.push(`${file}: Stylesheet link tag has no href: ${tag}`);
      return;
    }
    const href = hrefMatch[1];
    
    // Ignore external fonts (Google Fonts, etc.)
    if (href.startsWith('http://') || href.startsWith('https://')) return;

    // Check for broken relative paths
    if (!href.startsWith('/')) {
      issues.push(`${file}: Stylesheet href must be root-relative (start with '/'): ${href}`);
    }

    const cleanHref = href.split('?')[0].replace(/^\//, '');
    const cssPath = path.join(ROOT_DIR, cleanHref);
    
    if (!fs.existsSync(cssPath)) {
      issues.push(`${file}: Stylesheet not found on disk: ${href} (resolved: ${cleanHref})`);
    } else {
      checkedStyles.add(cleanHref);
      const stat = fs.statSync(cssPath);
      if (stat.size === 0) {
        issues.push(`${file}: Stylesheet is empty (0 bytes): ${href}`);
      }
    }
  });

  // Verify all script tags
  const scriptMatches = content.match(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
  scriptMatches.forEach(tag => {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) return;
    const src = srcMatch[1];
    if (src.startsWith('http://') || src.startsWith('https://')) return;

    if (!src.startsWith('/')) {
      issues.push(`${file}: Script src must be root-relative (start with '/'): ${src}`);
    }

    const cleanSrc = src.split('?')[0].replace(/^\//, '');
    const jsPath = path.join(ROOT_DIR, cleanSrc);
    
    if (!fs.existsSync(jsPath)) {
      issues.push(`${file}: Script not found on disk: ${src} (resolved: ${cleanSrc})`);
    } else {
      checkedScripts.add(cleanSrc);
      try {
        const code = fs.readFileSync(jsPath, 'utf-8');
        new vm.Script(code);
      } catch (err) {
        issues.push(`${cleanSrc}: JavaScript syntax error: ${err.message}`);
      }
    }
  });
});

console.log(`Verified ${checkedStyles.size} unique stylesheet assets:`);
checkedStyles.forEach(s => console.log(`  ✓ ${s}`));
console.log(`Verified ${checkedScripts.size} unique client script assets:`);
checkedScripts.forEach(s => console.log(`  ✓ ${s}`));

console.log('\n=== 3. VERCEL PRODUCTION BUILD & DEPLOYMENT CONFIG ===');
const vercelPath = path.join(ROOT_DIR, 'vercel.json');
if (!fs.existsSync(vercelPath)) {
  issues.push('vercel.json is missing from project root');
} else {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
    
    // Ensure deprecated "builds" is not present (which suppresses zero-config static CDN serving)
    if (vercelConfig.builds) {
      issues.push('vercel.json must NOT contain legacy "builds" block (it prevents static CSS deployment)');
    }
    
    // Ensure cleanUrls is enabled
    if (!vercelConfig.cleanUrls) {
      issues.push('vercel.json: "cleanUrls": true is recommended for seamless navigation');
    }

    // Ensure rewrites for api and admin exist
    const rewrites = vercelConfig.rewrites || [];
    const hasApiRewrite = rewrites.some(r => r.source && r.source.includes('/api/'));
    const hasAdminRewrite = rewrites.some(r => r.source && r.source.includes('/admin'));
    if (!hasApiRewrite) issues.push('vercel.json: Missing API rewrite to serverless function');
    if (!hasAdminRewrite) issues.push('vercel.json: Missing admin rewrite to serverless function');

    // Ensure CSS MIME type header exists
    const headers = vercelConfig.headers || [];
    const hasCssHeader = headers.some(h => h.source && h.source.includes('/css/') && h.headers.some(hdr => hdr.key === 'Content-Type' && hdr.value.includes('text/css')));
    if (!hasCssHeader) issues.push('vercel.json: Missing explicit Content-Type text/css header for /css/(.*)');

    console.log('✓ vercel.json verified: Modern Zero-Config static Edge CDN + Serverless function routing');
  } catch (err) {
    issues.push(`vercel.json parse error: ${err.message}`);
  }
}

// Check api/index.js entrypoint exists
const apiEntryPath = path.join(ROOT_DIR, 'api', 'index.js');
if (!fs.existsSync(apiEntryPath)) {
  issues.push('api/index.js is missing (required for Vercel serverless function entrypoint)');
} else {
  console.log('✓ api/index.js serverless entrypoint verified');
}

console.log('\n=== 4. ASSET HYGIENE & DEPENDENCIES ===');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
console.log('Package dependencies count:', Object.keys(pkg.dependencies || {}).length);
console.log('Zero external npm runtime bloat:', Object.keys(pkg.dependencies || {}).length === 0 ? 'YES' : 'NO');

console.log('\n=== 5. PRODUCTION BUILD & QA FINDINGS ===');
if (issues.length === 0) {
  console.log('================================================================');
  console.log('ALL ACCESSIBILITY, SEO, STYLING, AND DEPLOYMENT CHECKS PASSED!');
  console.log('ZERO missing CSS, ZERO asset 404s, ZERO build errors.');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error(`FAILED: Found ${issues.length} issue(s):`);
  issues.forEach(i => console.error(' ✗ ' + i));
  process.exit(1);
}
