const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '..', 'admin');
const files = [
  'dashboard.html', 'profile.html', 'projects.html', 'experience.html',
  'skills.html', 'achievements.html', 'about.html', 'resume.html',
  'messages.html', 'settings.html'
];

const securityLink = `        <a href="/admin/security" class="admin-nav-link">
          <span class="admin-nav-link-content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Security Center</span>
          </span>
        </a>`;

files.forEach(f => {
  const filePath = path.join(adminDir, f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('/admin/security')) {
      content = content.replace(
        /(<a href="\/admin\/settings" class="admin-nav-link)/,
        `${securityLink}\n$1`
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated sidebar in admin/${f}`);
    } else {
      console.log(`Already present in admin/${f}`);
    }
  }
});
