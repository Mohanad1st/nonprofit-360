#!/usr/bin/env node
// Takes phone-size screenshots of the personal page with the made-up example team, in English and Arabic,
// into docs/images/ (used by the README and the guides). Needs Google Chrome. `node tools/screenshots.js`
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), { execFileSync } = require('child_process');
const { ROOT, load } = require('./lib');
const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].filter(Boolean).find(p => fs.existsSync(p));
if (!chrome) { console.error('Chrome not found (set CHROME=/path/to/chrome).'); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'np360s-'));
const fwd = p => p.replace(/\\/g, '/');
for (const L of ['en', 'ar']) {
  const ctx = load();
  ctx.useSettings_({ LANGUAGE: L, ORG_NAME: L === 'ar' ? 'مؤسسة المثال' : 'Example Foundation', DEADLINE: '2026-12-01', CYCLE_NAME: '2026' });
  ctx.__team = ctx.testTeam_(); ctx.__asg = ctx.generateAssignments_(ctx.__team, ctx.exampleLinks_(L), []);
  vm.runInContext(`readTeam_ = function () { return __team; }; readAssignments_ = function () { return __asg; }; readRecords_ = function () { return []; };
    readDrafts_ = function () { return {}; }; readDeptLinks_ = function () { return {}; }; logoDataUri_ = function () { return ''; };`, ctx);
  const html = vm.runInContext('appHtml_(clientData_("hala@example.org"))', ctx);
  const stub = '<script>window.google={script:{run:(function mk(){return {withSuccessHandler:function(){return mk()},withFailureHandler:function(){return mk()},saveDraft:function(){},submitEval:function(){}}})()}};</script>';
  const example = L === 'ar' ? 'في مايو طلبت التقرير مرتين ولم يصل إلا بعد تذكير ثالث، فتأخر تحديث الجهة المانحة.' : 'In May I asked for the report twice and it came only after a third reminder, so the donor update was late.';
  const views = {
    welcome: '',
    list: 'DATA.selfDone = true; DATA.done = 2; DATA.persons[1].done = true; go("home");',
    rating: 'var p = DATA.persons.filter(function (x) { return x.key === "karim@example.org"; })[0]; p.prev = { ts: 1, freq: "WEEKLY", scores: { C1: 2, C2: 4, C3: 3 }, evidence: { C1: ' + JSON.stringify(example) + ' }, texts: {} }; go("person", "karim@example.org");'
  };
  for (const [v, js] of Object.entries(views)) {
    const page = html.replace('<script>var DATA', stub + '<script>var DATA').replace('</body>', '<script>setTimeout(function(){' + js + '}, 50);</script></body>');
    const f = path.join(tmp, L + v + '.html'); fs.writeFileSync(f, page);
    const out = path.join(ROOT, 'docs', 'images', 'page-' + v + '-' + L + '.png');
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--user-data-dir=' + fwd(path.join(tmp, 'p')), '--window-size=540,1100',
      '--virtual-time-budget=4000', '--screenshot=' + fwd(out), 'file:///' + fwd(f)], { stdio: 'ignore', timeout: 60000 });
    console.log(path.relative(ROOT, out));
  }
}
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
