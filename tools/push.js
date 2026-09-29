#!/usr/bin/env node
// Puts your organisation's build into Google, using clasp (Google's official command-line tool for Apps Script).
//   node tools/push.js create   → makes a NEW Google Sheet in your Drive with the script inside it, and uploads the code
//   node tools/push.js update   → uploads the latest org/build/Code.gs to the same sheet
//   node tools/push.js open     → opens the script editor in your browser
// Before the first run: turn on "Google Apps Script API" at https://script.google.com/home/usersettings,
// then `npx @google/clasp@3.4.1 login` (you sign in yourself, in your browser; nothing is stored in this project).
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { ROOT, readOrg } = require('./lib');

const CLASP = ['--yes', '@google/clasp@3.4.1'];
const cmd = process.argv[2];
const org = readOrg();
const build = path.join(org.dir, 'build');
if (!fs.existsSync(path.join(build, 'Code.gs'))) { console.error('Build first: node tools/build.js --org'); process.exit(1); }
/** On Windows npx must run through the command shell, so every argument is quoted and shell characters are refused. */
function quote(a) { if (/["%^&|<>!\r\n]/.test(a)) throw new Error('Unsafe character in: ' + a); return /^[\w@.\/:=-]+$/.test(a) ? a : '"' + a + '"'; }
function clasp(args) {
  const all = CLASP.concat(args);
  const r = process.platform === 'win32'
    ? spawnSync('npx ' + all.map(quote).join(' '), { cwd: build, stdio: 'inherit', shell: true })
    : spawnSync('npx', all, { cwd: build, stdio: 'inherit' });
  if (r.status !== 0) { console.error('\nclasp stopped (exit ' + r.status + '). See docs/en/troubleshooting.md → "clasp".'); process.exit(r.status || 1); }
}
// The sheet's name: the organisation name, keeping only letters, numbers, spaces and simple punctuation
const title = String(org.settings.ORG_NAME || 'Our organisation').replace(/[^\p{L}\p{N} .,'()_-]/gu, ' ').replace(/'/g, '').trim() + ' - 360 evaluation';
if (cmd === 'create') {
  if (fs.existsSync(path.join(build, '.clasp.json'))) { console.error('This organisation already has a sheet (org/build/.clasp.json). Use: node tools/push.js update'); process.exit(1); }
  clasp(['create-script', '--type', 'sheets', '--title', title, '--rootDir', '.']);
  // a new project comes with an empty Code file and a default manifest: keep ours only
  ['Code.js', 'code.js'].forEach(f => { const p = path.join(build, f); if (fs.existsSync(p)) fs.unlinkSync(p); });
  fs.copyFileSync(path.join(ROOT, 'appsscript.json'), path.join(build, 'appsscript.json'));
  clasp(['push', '--force']);
  console.log('\nDone. A new Google Sheet "' + title + '" is in your Drive with the script inside. Next: open it, reload, and choose «360 → Start setup».');
} else if (cmd === 'update') {
  clasp(['push', '--force']);
  console.log('\nCode updated. If the personal page is already published, publish a new version: see docs/en/admin-guide.md → "After changing the code".');
} else if (cmd === 'open') {
  clasp(['open-script']);
} else {
  console.log('Usage: node tools/push.js create | update | open');
  process.exit(1);
}
