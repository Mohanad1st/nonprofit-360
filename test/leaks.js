// Public safety rules for every file in the project (runs locally and on GitHub):
// no real email addresses (only @example.org / @example.com), no Google Apps Script deployment ids, no Drive or Sheet ids,
// no big embedded images, no secret or private files, no organisation data folder. `node test/leaks.js`
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
let files;
try { files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean); }
catch (e) { console.log('git not available'); process.exit(1); }
const bad = [];
const ALLOWED_EMAIL = /@(example\.(org|com|net)|users\.noreply\.github\.com)$/i;
const FORBIDDEN_FILE = /(^|\/)(org|org-[^/]+)\/|(^|\/)\.env(\.|$)|\.(pem|key|db|sqlite|p12)$|(^|\/)\.clasp(rc)?\.json$|denylist/i;
for (const f of files) {
  if (FORBIDDEN_FILE.test(f) && !/^\.env\.example$/.test(f)) bad.push(f + ': this kind of file must never be committed');
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) continue;
  const buf = fs.readFileSync(p);
  if (buf.length > 600 * 1024) bad.push(f + ': larger than 600 KB — is it an export or a real document?');
  if (buf.includes(0)) continue;
  const text = buf.toString('utf8');
  text.split('\n').forEach((line, i) => {
    const at = f + ':' + (i + 1);
    (line.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).forEach(e => { if (!ALLOWED_EMAIL.test(e)) bad.push(at + ': a real-looking email address (' + e.replace(/^(.).*@/, '$1…@') + ')'); });
    if (/script\.google\.com\/(a\/macros\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,}|\/macros\/s\/AKfy[A-Za-z0-9_-]{20,}/.test(line)) bad.push(at + ': a real Apps Script page address');
    if (/\/(d|folders)\/[A-Za-z0-9_-]{25,}|[?&]id=[A-Za-z0-9_-]{25,}/.test(line)) bad.push(at + ': a real Google Drive, Sheet or Doc id');
    if (/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{20000,}|['"][A-Za-z0-9+/]{20000,}={0,2}['"]/.test(line)) bad.push(at + ': a large embedded image or file');
    if (/AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) bad.push(at + ': something that looks like a secret key');
  });
}
if (bad.length) { bad.forEach(b => console.log('FAIL ' + b)); console.log(bad.length + ' problem(s)'); process.exit(1); }
console.log('Leak rules: ' + files.length + ' files checked, nothing found.');
