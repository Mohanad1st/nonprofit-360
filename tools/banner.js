#!/usr/bin/env node
// Renders tools/banner.html into docs/images/banner.png (1280×640, also used as the GitHub social preview). Needs Chrome.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process'), { pathToFileURL } = require('url');
const { ROOT } = require('./lib');
const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].filter(Boolean).find(p => fs.existsSync(p));
if (!chrome) { console.error('Chrome not found (set CHROME=/path/to/chrome).'); process.exit(1); }
const out = path.join(ROOT, 'docs', 'images', 'banner.png');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'np360b-'));
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--user-data-dir=' + profile, '--window-size=1280,640',
  '--virtual-time-budget=6000', '--screenshot=' + out, pathToFileURL(path.join(__dirname, 'banner.html')).href], { stdio: 'ignore', timeout: 60000 });
console.log(path.relative(ROOT, out));
