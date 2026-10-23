#!/usr/bin/env node
// Private word check — run it before you publish changes, to be sure no private word slipped into the project.
// It looks for words from YOUR private list (people's names, emails, your domain, ids, phrases, logo fingerprints)
// in every file of the project AND in its whole git history. Keep the list OUTSIDE the project folder.
//   node tools/leak-scan.js --denylist ../my-private-denylist.txt
// List format: one word or phrase per line; "# …" = comment; "sha256:<hex>" = fingerprint of a file that must not be included.
// Short words (up to 6 letters, no spaces) match only as whole words, so a name hidden inside a longer word is not a false alarm.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

const i = process.argv.indexOf('--denylist');
const listPath = i > 0 ? process.argv[i + 1] : process.env.NP360_DENYLIST;
if (!listPath || !fs.existsSync(listPath)) { console.error('Give the private list: node tools/leak-scan.js --denylist <path outside the project>'); process.exit(2); }
if (path.resolve(listPath).startsWith(path.resolve(ROOT) + path.sep)) { console.error('The private list must live OUTSIDE the project folder, or it would be published too.'); process.exit(2); }

function norm(s) {
  return String(s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
}
const lines = fs.readFileSync(listPath, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const hashes = new Set(lines.filter(l => l.startsWith('sha256:')).map(l => l.slice(7).toLowerCase()));
const terms = lines.filter(l => !l.startsWith('sha256:')).map(t => {
  const n = norm(t), whole = !/\s/.test(n) && n.length <= 6;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { raw: t, re: whole ? new RegExp('(^|[^\\p{L}\\p{N}_])' + esc + '($|[^\\p{L}\\p{N}_])', 'u') : null, n };
});
const hit = (text) => { const n = norm(text); return terms.filter(t => t.re ? t.re.test(n) : n.indexOf(t.n) >= 0); };

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
const found = [];
// 1) every file that is (or would be) committed
const files = git(['ls-files', '-co', '--exclude-standard']).split('\n').filter(Boolean);
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) continue;
  const buf = fs.readFileSync(p);
  if (hashes.has(crypto.createHash('sha256').update(buf).digest('hex'))) found.push(f + ': is a file on your private list');
  if (buf.includes(0)) continue; // binary
  buf.toString('utf8').split('\n').forEach((line, n) => hit(line).forEach(t => found.push(f + ':' + (n + 1) + ': contains "' + t.raw + '"')));
  hit(f).forEach(t => found.push(f + ': the file name contains "' + t.raw + '"'));
}
// 2) the whole history: every version of every file, plus commit authors and messages
let history = '';
try { history = git(['log', '--all', '-p', '--no-color', '--format=@@commit %H%n%an <%ae>%n%s%n%b']); } catch (e) { history = ''; }
let commit = '';
history.split('\n').forEach(line => {
  if (line.startsWith('@@commit ')) { commit = line.slice(9, 17); return; }
  hit(line).forEach(t => found.push('history ' + commit + ': contains "' + t.raw + '"'));
});
try {
  const blobs = git(['rev-list', '--all', '--objects']).split('\n').filter(Boolean).map(l => l.split(' ')[0]);
  for (const b of blobs) {
    if (git(['cat-file', '-t', b]).trim() !== 'blob') continue;
    const data = execFileSync('git', ['cat-file', 'blob', b], { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
    if (hashes.has(crypto.createHash('sha256').update(data).digest('hex'))) found.push('history: a file on your private list was committed at some point (' + b.slice(0, 8) + ')');
  }
} catch (e) { /* no commits yet */ }

const uniq = [...new Set(found)];
console.log('Checked ' + files.length + ' files and the full history against ' + terms.length + ' private words and ' + hashes.size + ' file fingerprints.');
if (uniq.length) { console.log('\n✗ ' + uniq.length + ' possible leak(s):'); uniq.slice(0, 200).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('✓ Nothing from your private list was found.');
