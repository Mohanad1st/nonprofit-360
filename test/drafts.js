// Browser test of "stop and continue later": fill part of a rating, leave, come back on the same device and on another
// device → the answers are still there; an old draft never overwrites a newer sent answer. `node test/drafts.js`
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), { execFileSync } = require('child_process'), { pathToFileURL } = require('url');
const { load } = require('../tools/lib');
const { runPage, chromePath } = require('../tools/chrome');
const chrome = chromePath();
if (!chrome) { console.log('SKIP drafts test: Chrome not found (set CHROME=/path/to/chrome).'); process.exit(process.env.CI ? 1 : 0); }
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'np360d-'));
let fails = 0;
(async () => {
for (const L of ['en', 'ar']) {
  const ctx = load(); ctx.useSettings_({ LANGUAGE: L, ORG_NAME: 'Example Foundation' });
  ctx.__team = ctx.testTeam_(); ctx.__asg = ctx.generateAssignments_(ctx.__team, ctx.exampleLinks_(L), []);
  vm.runInContext(`readTeam_ = function () { return __team; }; readAssignments_ = function () { return __asg; }; readRecords_ = function () { return []; };
    readDrafts_ = function () { return {}; }; readDeptLinks_ = function () { return {}; }; logoDataUri_ = function () { return ''; };
    var __html = appHtml_(clientData_('karim@example.org'));`, ctx);
  const RAMI = 'rami@example.org', restored = ctx.tr_(L, 'ui.restored'), resume = ctx.tr_(L, 'ui.resume'), saved = ctx.tr_(L, 'ui.draftStarted');
  const stub = `<script>window.__srv = {};
window.google = { script: { run: (function mk(ok, fail) { return {
  withSuccessHandler: function (f) { return mk(f, fail); }, withFailureHandler: function (f) { return mk(ok, f); },
  saveDraft: function (k, d) { __srv[k] = { ts: Date.now(), data: JSON.parse(JSON.stringify(d)) }; setTimeout(function () { ok && ok({ ok: true, ts: __srv[k].ts }); }, 10); },
  submitEval: function () { setTimeout(function () { ok && ok({ ok: true, data: DATA }); }, 10); } }; })() } };</script>`;
  const steps = `<script>setTimeout(function () {
  var out = []; function t(c, m) { out.push((c ? 'PASS ' : 'FAIL ') + '[${L}] ' + m); }
  try { localStorage.clear(); } catch (e) {}
  go('person', '${RAMI}');
  S.form.scores.C1 = 4; S.form.scores.C2 = 2; S.form.evidence.C2 = 'In the August meeting they told us about the site change only after we arrived'; S.form.texts.O_START = 'Send the weekly plan'; S.form.freq = 'DAILY';
  setTimeout(function () {
    t(!!__srv['PERSON|${RAMI}'], 'autosave sends the unfinished rating to the server within seconds');
    document.querySelector('.top .btn.ghost').click();
    var row = [].filter.call(document.querySelectorAll('.row'), function (r) { return r.textContent.indexOf(${JSON.stringify(ctx.__team.find(p => p.email === 'rami@example.org').name)}) >= 0; })[0];
    t(row && row.textContent.indexOf(${JSON.stringify(resume)}) >= 0 && row.textContent.indexOf(${JSON.stringify(saved)}) >= 0, 'the list shows the unfinished rating as saved, with «continue»');
    go('person', '${RAMI}');
    t(S.form.scores.C1 === 4 && S.form.scores.C2 === 2 && /August/.test(S.form.evidence.C2) && S.form.freq === 'DAILY', 'same device: reopening restores every answer');
    t(document.body.textContent.indexOf(${JSON.stringify(restored)}) >= 0, 'the page says it continued where they stopped');
    try { localStorage.clear(); } catch (e) {}
    DATA.drafts = JSON.parse(JSON.stringify(__srv)); go('home'); go('person', '${RAMI}');
    t(S.form.scores.C1 === 4 && /weekly plan/.test(S.form.texts.O_START), 'another device: answers come back from the server copy');
    var p = DATA.persons.filter(function (x) { return x.key === '${RAMI}'; })[0];
    p.prev = { ts: Date.now() + 60000, scores: { C1: 5 }, evidence: {}, texts: {}, freq: 'WEEKLY' }; go('home'); go('person', '${RAMI}');
    t(S.form.scores.C1 === 5, 'an old draft never overwrites a newer sent answer');
    document.title = out.join(' || ');
  }, 4800);
}, 100);</script>`;
  const file = path.join(OUT, 'drafts-' + L + '.html');
  fs.writeFileSync(file, ctx.__html.replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>/g, '').replace('<script>var DATA', stub + '<script>var DATA').replace('</body>', steps + '</body>')); // no web fonts: tests must not wait on the network
  let title = '';
  try { title = await runPage(file, { width: 900, height: 900, timeoutMs: 60000, until: "/^(PASS|FAIL)/.test(document.title) && document.title" }); }
  catch (e) { title = 'FAIL [' + L + '] ' + e.message; }
  const lines = title.split(' || ');
  lines.forEach(l => console.log(l));
  fails += lines.filter(l => !l.startsWith('PASS')).length;
}
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (e) {}
console.log(fails ? fails + ' FAILED' : 'DRAFTS OK');
process.exit(fails ? 1 : 0);
})();
