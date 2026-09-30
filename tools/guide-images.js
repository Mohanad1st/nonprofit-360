#!/usr/bin/env node
// Draws the admin-side pictures for the setup guide into docs/images/: the 360 menu, the setup side panel, Google's
// permission screens and the "publish the page" dialog. Our own screens are rendered from the real code with the made-up
// example organisation; Google's screens are simplified drawings, so no real account ever appears. Needs Chrome.
// `node tools/guide-images.js`
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), { execFileSync } = require('child_process'), { pathToFileURL } = require('url');
const { ROOT, load } = require('./lib');
const { chromePath } = require('./chrome');
const chrome = chromePath();
if (!chrome) { console.error('Chrome not found (set CHROME=/path/to/chrome).'); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'np360g-'));
const IMG = path.join(ROOT, 'docs', 'images');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shot(name, html, w, h) {
  const f = path.join(tmp, name + '.html'); fs.writeFileSync(f, html);
  const out = path.join(IMG, name + '.png');
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--user-data-dir=' + path.join(tmp, 'p'),
    '--window-size=' + w + ',' + h, '--virtual-time-budget=4000', '--screenshot=' + out, pathToFileURL(f).href], { stdio: 'ignore', timeout: 60000 });
  console.log(path.relative(ROOT, out));
}

const BASE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,"Segoe UI",sans-serif;background:#eef2f6;color:#1f1f1f}
.win{position:absolute;inset:14px;background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.18);overflow:hidden}
.bar{height:52px;display:flex;align-items:center;gap:12px;padding:0 16px;border-bottom:1px solid #e3e3e3}
.logo{width:26px;height:32px;border-radius:4px;background:#0f9d58}.title{font-size:17px}
.menus{display:flex;gap:2px;padding:4px 12px;font-size:14px;border-bottom:1px solid #e3e3e3}.menus span{padding:4px 8px;border-radius:4px}
.menus .on{background:#d3e3fd;font-weight:bold}
.grid{position:absolute;left:0;right:0;top:92px;bottom:40px;background-image:linear-gradient(#e3e3e3 1px,transparent 1px),linear-gradient(90deg,#e3e3e3 1px,transparent 1px);background-size:100% 26px,120px 100%}
.tabs{position:absolute;left:0;right:0;bottom:0;height:40px;border-top:1px solid #e3e3e3;background:#f8f9fa;display:flex;gap:4px;padding:6px 16px;font-size:13px;overflow:hidden;white-space:nowrap}
.tabs span{padding:5px 12px;border-radius:6px}.tabs .on{background:#d3e3fd;color:#0b57d0;font-weight:bold}
.drop{position:absolute;background:#fff;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.25);padding:6px 0;font-size:14px;z-index:5}
.drop div{padding:7px 22px}.drop hr{border:0;border-top:1px solid #e3e3e3;margin:5px 0}
.hl{outline:3px solid #e8710a;outline-offset:2px;border-radius:4px}
.badge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#e8710a;color:#fff;font-weight:bold;font-size:15px;flex:none}
.pin{position:absolute;z-index:9}
.cap{position:absolute;left:14px;right:14px;bottom:0;height:0}
.note{font-size:12px;color:#5f6368}
.btn{display:inline-block;padding:9px 20px;border-radius:20px;font-size:14px;font-weight:bold}
.pri{background:#0b57d0;color:#fff}.sec{color:#0b57d0;border:1px solid #c4c7c5}
</style></head><body>`;

// ——— 1 & 2: the 360 menu over the «Start here» tab, and the setup side panel — real text, in both languages ———
for (const L of ['en', 'ar']) {
  const ctx = load();
  ctx.useSettings_({ LANGUAGE: L, ORG_NAME: L === 'ar' ? 'مؤسسة المثال' : 'Example Foundation', DEADLINE: '2026-12-01', CYCLE_NAME: '2026', ADMIN_EMAIL: 'admin@example.org' });
  const t = k => ctx.tr_(L, k), rtl = L === 'ar', dir = rtl ? 'rtl' : 'ltr';
  const tabs = ['GUIDE', 'SETTINGS', 'TEAM', 'LINKS', 'NEVER', 'DEPTLINKS', 'QUESTIONS', 'ASSIGN'].map((id, i) => `<span class="${i === 0 ? 'on' : ''}">${esc(t('tab.' + id))}</span>`).join('');
  const lines = [t('guide.title').replace('{org}', rtl ? 'مؤسسة المثال' : 'Example Foundation'), t('guide.private'), ''];
  for (let i = 1; i <= 12; i++) lines.push(t('guide.step' + i));
  const guide = lines.map((s, i) => `<div style="height:26px;line-height:26px;padding:0 8px;white-space:nowrap;overflow:hidden;${i === 0 ? 'font-weight:bold;font-size:16px;color:#1f5f8b' : i === 1 ? 'color:#b00020;font-weight:bold' : ''}">${esc(s)}</div>`).join('');
  const items = [['menu.setup'], ['menu.check'], ['menu.pairs'], ['menu.publish'], null, ['menu.preview'], ['menu.invite'], null, ['menu.update'], ['menu.remind'], ['menu.reports'], ['menu.paper'], ['menu.paperEntry'], null, ['menu.testRun'], ['menu.testClear'], null, ['menu.newRound']];
  const drop = items.map(x => x ? `<div>${esc(t(x[0]))}</div>` : '<hr>').join('');
  const side = rtl ? 'right' : 'left';
  shot('admin-menu-' + L, BASE + `
<div class="win" dir="ltr"><div class="bar"><div class="logo"></div><div class="title">360 evaluation 2026</div></div>
<div class="menus"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Data</span><span>Tools</span><span>Extensions</span><span>Help</span><span class="on hl">${esc(t('menu.title'))}</span></div>
<div class="grid" dir="${dir}" style="background:#fff">${guide}</div>
<div class="drop" dir="${dir}" style="top:92px;left:${rtl ? 380 : 560}px;width:430px">${drop}</div>
<div class="tabs" dir="${dir}">${tabs}</div></div></body></html>`, 1200, 720);

  // the side panel: the real wizard page with the example organisation filled in
  vm.runInContext(`sheet_ = function () { return null; }; Session = { getActiveUser: function () { return { getEmail: function () { return 'admin@example.org'; } }; } };
    var __wd = wizardData_(); __wd.lang = ${JSON.stringify(L)}; __wd.cur.ORG_NAME = ${JSON.stringify(rtl ? 'مؤسسة المثال' : 'Example Foundation')}; __wd.cur.DEADLINE = '2026-12-01';
    wizardData_ = function () { return __wd; };`, ctx);
  const panel = vm.runInContext('wizardHtml_()', ctx).replace('</body>', '<script>window.google={script:{run:{}}};</script></body>');
  const pf = path.join(tmp, 'panel-' + L + '.html'); fs.writeFileSync(pf, panel);
  shot('admin-setup-' + L, BASE + `
<div class="win" dir="ltr"><div class="bar"><div class="logo"></div><div class="title">360 evaluation 2026</div></div>
<div class="menus"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Data</span><span>Tools</span><span>Extensions</span><span>Help</span><span class="on">360</span></div>
<div class="grid" style="right:360px;background-color:#fff"></div>
<div class="drop" style="top:92px;left:500px;width:290px"><div class="hl">${esc(ctx.tr_('en', 'menu.start') + ' · ' + ctx.tr_('ar', 'menu.start'))}</div></div>
<div style="position:absolute;top:92px;right:0;bottom:0;width:360px;border-left:1px solid #e3e3e3;background:#fff">
<div style="height:44px;display:flex;align-items:center;padding:0 14px;font-size:16px;border-bottom:1px solid #e3e3e3">360</div>
<iframe src="${pathToFileURL(pf).href}" style="border:0;width:100%;height:calc(100% - 44px)"></iframe></div></div></body></html>`, 1200, 760);
}

// ——— 3: Google's permission screens (drawings; Google shows these in the language of your Google account) ———
const card = (inner, extra) => `<div style="position:absolute;${extra};background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.18);padding:30px 34px">${inner}</div>`;
shot('google-permission', BASE + `
<div style="position:absolute;left:24px;top:14px;font-size:15px;color:#3c4043">The first time you use the menu, Google asks you to allow the script. You see this once.</div>
${card(`<div style="font-size:22px;margin-bottom:14px">⚠️ Google hasn’t verified this app</div>
<div class="note" style="font-size:14px;line-height:1.5">The app is requesting access to sensitive info in your Google Account. Until the developer
(admin@example.org) verifies this app with Google, you shouldn't use it.</div>
<div style="margin-top:18px;display:flex;align-items:center;gap:10px"><span class="badge">1</span><span class="hl" style="color:#0b57d0;font-size:14px;padding:2px 4px">Advanced</span>
<span style="flex:1"></span><span class="btn pri">BACK TO SAFETY</span></div>
<div style="margin-top:16px;display:flex;align-items:center;gap:10px"><span class="badge">2</span><span class="hl" style="color:#0b57d0;font-size:14px;text-decoration:underline;padding:2px 4px">Go to 360 evaluation 2026 (unsafe)</span></div>`, 'left:24px;top:50px;width:560px')}
${card(`<div style="font-size:20px;margin-bottom:10px">360 evaluation 2026 wants to access your Google Account</div>
<div class="note" style="font-size:14px;line-height:1.7">admin@example.org<br>This will allow it to:<br>• See, edit, create and delete your spreadsheets<br>• Create and edit your documents, in your Drive<br>• Send email as you<br>• …</div>
<div style="margin-top:18px;display:flex;align-items:center;gap:10px;justify-content:flex-end"><span class="btn sec">Cancel</span><span class="badge">3</span><span class="btn pri hl">Allow</span></div>`, 'left:612px;top:50px;width:564px')}
<div style="position:absolute;left:24px;right:24px;bottom:16px;font-size:13px;color:#3c4043;line-height:1.5">
Why it is safe: the script is in <b>your</b> sheet, runs in <b>your</b> account, and is not sent anywhere else. Google shows “unsafe” for any script it has not reviewed itself.
If your organisation’s Google administrator has blocked scripts, you will see “blocked” instead: see Troubleshooting.</div>
</body></html>`, 1200, 470);

// ——— 4: publishing the personal page (a drawing of Apps Script's Deploy screens, numbered like the steps in the guide) ———
const shotDeploy = () => shot('publish-page', BASE + `
${card(`<div style="display:flex;align-items:center;gap:10px;font-size:15px"><b>Apps Script</b><span style="flex:1"></span><span class="badge">1</span>
<span class="btn pri hl">Deploy ▾</span></div>
<div class="drop" style="position:relative;margin:10px 0 0 auto;width:220px"><div class="hl">New deployment</div><div>Manage deployments</div><div>Test deployments</div></div>`, 'left:24px;top:24px;width:340px')}
${card(`<div style="font-size:18px;margin-bottom:14px">New deployment</div>
<div style="display:flex;align-items:center;gap:10px;font-size:14px"><span class="badge">2</span>Select type <span class="hl" style="padding:0 4px">⚙️</span> → <b class="hl" style="padding:0 4px">Web app</b></div>
<div style="margin-top:16px;margin-bottom:6px;font-size:13px;color:#5f6368">Execute as</div>
<div style="display:flex;align-items:center;gap:10px"><span class="badge">3</span><div class="hl" style="flex:1;border:1px solid #c4c7c5;padding:8px;font-size:14px">Me (admin@example.org)</div></div>
<div style="margin-top:12px;margin-bottom:6px;font-size:13px;color:#5f6368">Who has access</div>
<div style="display:flex;align-items:center;gap:10px"><span class="badge">3</span><div class="hl" style="flex:1;border:1px solid #c4c7c5;padding:8px;font-size:14px">Anyone within Example Foundation</div></div>
<div style="margin-top:18px;text-align:right"><span class="btn sec">Cancel</span> <span class="btn pri hl">Deploy</span></div>`, 'left:390px;top:24px;width:400px;height:300px')}
${card(`<div style="font-size:18px;margin-bottom:14px">New deployment</div>
<div style="font-size:14px;color:#188038;margin-bottom:12px">✓ Deployment successfully created.</div>
<div style="font-size:13px;color:#5f6368">Web app — URL</div>
<div style="display:flex;align-items:center;gap:10px;margin-top:4px"><div style="flex:1;border:1px solid #c4c7c5;padding:8px;font-size:12px;overflow:hidden;white-space:nowrap">https://script.google.com/macros/s/…/exec</div></div>
<div style="display:flex;align-items:center;gap:10px;margin-top:10px"><span class="badge">5</span><span class="btn sec hl">Copy</span></div>
<div class="note" style="margin-top:14px;line-height:1.5">Paste it in the box in the sheet’s window and press «Save the address».</div>`, 'left:816px;top:24px;width:360px')}
${card(`<div style="font-size:16px;margin-bottom:10px"><span class="badge">6</span> Later, after any change to the code: <b>Deploy → Manage deployments</b></div>
<div style="display:flex;align-items:center;gap:12px;font-size:14px">✏️ <span class="hl" style="padding:0 4px">pencil</span> → Version: <div class="hl" style="border:1px solid #c4c7c5;padding:6px 10px">New version</div> → <span class="btn pri">Deploy</span>
<span class="note" style="font-size:13px">Check that the number goes up. If it still shows the old number, the page did not change. The address stays the same.</span></div>`, 'left:24px;top:350px;right:24px')}
</body></html>`, 1200, 510);
shotDeploy();

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
