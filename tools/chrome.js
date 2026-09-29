// Opens a local page in headless Chrome and waits until a JavaScript expression on the page returns a value.
// Uses Chrome's standard remote-debugging connection, so it behaves the same on Windows, macOS and Linux. Needs Node 22+.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), { spawn } = require('child_process'), { pathToFileURL } = require('url');

const CANDIDATES = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
const chromePath = () => CANDIDATES.find(p => fs.existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function getJson(port, p) {
  return new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
}

/**
 * runPage(file, { width, height, until, timeoutMs }) → the value of `until` (a JS expression) once it is truthy.
 * Throws with a clear message on timeout.
 */
async function runPage(file, opts) {
  opts = Object.assign({ width: 412, height: 915, timeoutMs: 180000 }, opts || {});
  const exe = chromePath();
  if (!exe) throw new Error('Chrome not found (set CHROME=/path/to/chrome)');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'np360c-'));
  const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--window-size=' + opts.width + ',' + opts.height, 'about:blank'], { stdio: 'ignore' });
  let ws = null;
  try {
    // Chrome writes the port it chose into the profile folder
    let port = null;
    for (let i = 0; i < 200 && !port; i++) {
      await sleep(100);
      try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch (e) {}
    }
    if (!port) throw new Error('Chrome did not start');
    let page = null;
    for (let i = 0; i < 50 && !page; i++) { page = (await getJson(port, '/json/list')).find(t => t.type === 'page'); if (!page) await sleep(100); }
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('cannot connect to Chrome')); });
    let id = 0; const waiting = {};
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && waiting[m.id]) { waiting[m.id](m); delete waiting[m.id]; } };
    const send = (method, params) => new Promise(res => { const n = ++id; waiting[n] = res; ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
    await send('Page.enable');
    await send('Page.navigate', { url: pathToFileURL(file).href });
    const until = Date.now() + opts.timeoutMs;
    while (Date.now() < until) {
      await sleep(250);
      const r = await send('Runtime.evaluate', { expression: '(function(){ try { return ' + opts.until + '; } catch (e) { return null; } })()', returnByValue: true });
      const v = r.result && r.result.result ? r.result.result.value : null;
      if (v) return v;
    }
    throw new Error('the page did not finish within ' + Math.round(opts.timeoutMs / 1000) + ' seconds');
  } finally {
    try { if (ws) ws.close(); } catch (e) {}
    try { proc.kill(); } catch (e) {}
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  }
}
module.exports = { runPage, chromePath };
