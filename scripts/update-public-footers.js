const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicFiles = [
  'index.html', 'projects.html', 'case-study.html', 'experience.html',
  'skills.html', 'achievements.html', 'about.html', 'resume.html',
  'contact.html', '404.html'
];

publicFiles.forEach(f => {
  const filePath = path.join(rootDir, f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('security.html') && !content.includes('/security')) {
      // Add right before <a href="contact.html" class="footer-link">Contact</a>
      content = content.replace(
        /(<a href="contact\.html" class="footer-link">Contact<\/a>)/,
        '<a href="security.html" class="footer-link">Security</a>\n              $1'
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated footer in ${f}`);
    } else {
      console.log(`Security link already in ${f}`);
    }
  }
});
