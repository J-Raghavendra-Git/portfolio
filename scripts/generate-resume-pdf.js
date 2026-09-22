/**
 * ATS RESUME PDF GENERATOR
 * Generates an authentic, ATS-compliant binary PDF for J Raghavendra
 * directly from verified portfolio credentials without external dependencies.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const resumeTextPath = path.join(ROOT_DIR, 'assets', 'resume', 'Alex_Rivera_Software_Engineer_Resume.txt');
const resumeText = fs.readFileSync(resumeTextPath, 'utf-8');

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf() {
  const textLines = resumeText.split(/\r?\n/);
  
  // Format operations
  const streamLines = [
    'BT',
    '/F1 14 Tf',
    '50 750 Td',
    '(J RAGHAVENDRA) Tj',
    '/F1 9 Tf',
    '0 -14 Td',
    '(Distributed Systems & Cloud Infrastructure Software Engineer) Tj',
    '0 -12 Td',
    '(raghavendraraghu71537@gmail.com  |  Bangalore, Karnataka  |  github.com  |  linkedin.com) Tj',
    '0 -16 Td',
    '/F2 10 Tf',
    '(-------------------------------------------------------------------------------------------------------------------------) Tj',
    '0 -14 Td'
  ];

  let yOffset = -14;
  for (let i = 3; i < textLines.length; i++) {
    const rawLine = textLines[i].trim();
    if (!rawLine) {
      streamLines.push('0 -8 Td');
      continue;
    }

    if (rawLine.endsWith(':') || rawLine === rawLine.toUpperCase() && rawLine.length > 3 && !rawLine.startsWith('-')) {
      streamLines.push('/F2 10 Tf');
      streamLines.push(`(${escapePdfText(rawLine)}) Tj`);
      streamLines.push('/F1 8.5 Tf');
      streamLines.push('0 -12 Td');
    } else if (rawLine.startsWith('-')) {
      streamLines.push(`(  * ${escapePdfText(rawLine.slice(1).trim())}) Tj`);
      streamLines.push('0 -11 Td');
    } else {
      streamLines.push(`(${escapePdfText(rawLine)}) Tj`);
      streamLines.push('0 -11 Td');
    }
  }

  streamLines.push('ET');
  const streamContent = streamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent);

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');
  objects.push(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`);

  let offset = 9; // length of '%PDF-1.4\n'
  const xrefEntries = ['0000000000 65535 f '];
  let body = '%PDF-1.4\n';

  for (const obj of objects) {
    xrefEntries.push(String(offset).padStart(10, '0') + ' 00000 n ');
    body += obj + '\n';
    offset = Buffer.byteLength(body);
  }

  const startXref = offset;
  let xref = `xref\n0 ${xrefEntries.length}\n` + xrefEntries.join('\n') + '\n';
  let trailer = `trailer\n<< /Size ${xrefEntries.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, 'utf-8');
}

const pdfBuffer = buildPdf();
const dest1 = path.join(ROOT_DIR, 'assets', 'Alex_Rivera_Software_Engineer_Resume.pdf');
const dest2 = path.join(ROOT_DIR, 'assets', 'resume', 'Alex_Rivera_Software_Engineer_Resume.pdf');

fs.writeFileSync(dest1, pdfBuffer);
fs.writeFileSync(dest2, pdfBuffer);

console.log(`Generated authentic ATS Resume PDF (${pdfBuffer.length} bytes) to:`);
console.log(`- ${dest1}`);
console.log(`- ${dest2}`);
