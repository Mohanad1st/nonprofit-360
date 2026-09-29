// Real-browser test: for every person of the example team, in English AND Arabic, a robot opens their personal page in
// headless Chrome, reads the welcome screen, then fills every task by clicking like a person would. Empty sends must be
// blocked; full sends go through the REAL server-side checks. It also checks the layout direction (RTL/LTR) and that
// nothing is wider than a phone screen. Then every answer goes through the real analysis.
// Needs Google Chrome (or set CHROME=/path/to/chrome). `node test/browser.js`
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), { execFileSync } = require('child_process'), { pathToFileURL } = require('url');
const { load, read, PURE } = require('../tools/lib');
const { runPage, chromePath } = require('../tools/chrome');

const chrome = chromePath();
if (!chrome) { console.log('SKIP browser test: Chrome not found (set CHROME=/path/to/chrome).'); process.exit(process.env.CI ? 1 : 0); }
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'np360-'));
const safe = s => s.replace(/<\/(script)/gi, '<\\/$1');

const BOT = String.raw`
(function () {
  var R = { user: ME, checks: [], errors: [], views: 0 };
  function ok(c, m) { R.checks.push((c ? 'PASS ' : 'FAIL ') + m); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function h(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); }
  function txt() { return document.getElementById('app').textContent + ' ' + ((document.querySelector('.foot') || {}).textContent || ''); }
  function layout(where) {
    R.views++;
    var over = document.documentElement.scrollWidth - window.innerWidth;
    if (over > 1) ok(false, where + ': page is wider than the screen by ' + over + 'px');
    if (getComputedStyle(document.body).direction !== DATA.dir) ok(false, where + ': direction is not ' + DATA.dir);
    [].forEach.call(document.querySelectorAll('.card, .row, .btn, .q'), function (e) { var r = e.getBoundingClientRect(); if (r.right > window.innerWidth + 1 || r.left < -1) R.errors.push(where + ': element outside the screen'); });
  }
  var LONG = { 1: 'At the follow-up on 14 May the delivery was two full weeks late, which delayed a program payment.',
               2: 'I asked for the monthly report twice in June and it only arrived after a third reminder.',
               5: 'When the generator failed in August they stayed late and coordinated with the supplier until it worked the same day.' };
  function pick(seed, low) { var n = h(seed) % 100; if (n < 5) return 'na'; if (n < (low ? 25 : 12)) return 2; if (n < 20 && !low) return 5; if (n < 55) return 3; return 4; }
  function fill(seed, lowBias) {
    var anyLow = false;
    [].forEach.call(document.querySelectorAll('.chips'), function (c) { var first = c.querySelector('button'); if (first && DATA.freq.indexOf(first.getAttribute('data-o')) >= 0) c.querySelectorAll('button')[h(seed) % 2].click(); });
    [].forEach.call(document.querySelectorAll('.q[data-q]'), function (q) {
      var id = q.getAttribute('data-q'), v = pick(seed + id, lowBias);
      q.querySelector('[data-v="' + v + '"]').click();
      if (v === 1 || v === 2) anyLow = true;
      var ta = q.querySelector('.ev textarea'); if (ta) { ta.value = LONG[v]; ta.dispatchEvent(new Event('input')); }
    });
    [].forEach.call(document.querySelectorAll('[data-c]'), function (c) {
      var id = c.getAttribute('data-c'), bs = c.querySelectorAll('.chips button'), want = 0;
      if (id === 'H_DISC') want = anyLow ? (h(seed) % 3 === 0 ? 2 : 1) : 3;
      else if (id === 'M_TOLD') want = h(seed) % 3;
      else want = h(seed + id) % bs.length;
      bs[want].click();
    });
    [].forEach.call(document.querySelectorAll('[data-t]'), function (f) {
      var ta = f.querySelector('textarea'); if (!ta) return;
      var id = f.getAttribute('data-t'), req = /\*$/.test((f.querySelector('label') || {}).textContent || '');
      if (req || id === 'H_DID' || h(seed + id) % 2) { ta.value = 'A detailed test answer for ' + id + ': a specific example from work in the third quarter, with a clear result.'; ta.dispatchEvent(new Event('input')); }
    });
    var sel = document.querySelector('select'); if (sel && sel.options.length > 2) { sel.selectedIndex = 1 + h(seed) % (sel.options.length - 1); sel.dispatchEvent(new Event('change')); }
  }
  async function send(where) { var before = __submits; document.querySelector('.foot .btn').click(); await sleep(150); ok(__submits === before + 1, where + ': sent to the server'); return S.view === 'home'; }
  async function blockedWhenEmpty(where) { var before = __submits; document.querySelector('.foot .btn').click(); await sleep(60); ok(__submits === before && document.querySelectorAll('.bad').length > 0, where + ': an empty form is blocked and the missing part is marked'); }
  async function run() {
    try {
      var paper = !!DATA.as;
      ok(paper ? S.view === 'home' : S.view === 'intro', paper ? 'paper mode opens on the list' : 'the welcome page is the first screen');
      if (!paper) {
        ok(txt().indexOf(DATA.intro.opening) >= 0 && DATA.intro.values.every(function (v) { return txt().indexOf(v[0]) >= 0; }) && txt().indexOf(DATA.tagline) >= 0, 'welcome: what this is, why, the values and the tagline');
        layout('welcome'); document.querySelector('.foot .btn').click(); await sleep(30);
      }
      ok(S.view === 'home', 'the list opens'); layout('list');
      ok(document.querySelectorAll('.row').length === DATA.total + DATA.depts.length, 'the list shows every task');
      go('self'); await sleep(20); layout('self');
      ok(!!document.querySelector('[data-t=S_EXPECT]') && !!document.querySelector('[data-t=S_ACH]'), 'self: asks what was expected and the results against it');
      ok(!!document.querySelector('[data-q=L1]') === !!DATA.isHead, 'self: the leadership part only for managers');
      await blockedWhenEmpty('self'); fill(ME + 'self', false);
      ok(await send('self') && DATA.selfDone, 'self: accepted and ticked');
      for (var i = 0; i < DATA.persons.length; i++) {
        var p = DATA.persons[i], w = 'rating ' + p.key;
        go('person', p.key); await sleep(20); layout(w);
        ok(!!document.querySelector('[data-c=H_SET]') === (p.relCode === 'HEAD_TO_MEMBER'), w + ': the manager\'s-part questions only when rating their own team member');
        ok(!!document.querySelector('[data-c=M_SET]') === (p.relCode === 'MEMBER_TO_HEAD'), w + ': "you and your manager" only when rating their own manager');
        ok(!!document.querySelector('[data-q=L1]') === !!p.showLead, w + ': leadership items only for their own manager or team');
        ok(p.reason && txt().indexOf(p.reason) >= 0, w + ': the reason for the pair is shown');
        await blockedWhenEmpty(w); fill(ME + p.key, p.relCode === 'HEAD_TO_MEMBER');
        if (!(await send(w))) { ok(false, w + ': NOT accepted — ' + __lastErr); go('home'); }
      }
      for (var j = 0; j < DATA.depts.length; j++) {
        var d = DATA.depts[j]; go('dept', d.name); await sleep(20); layout('dept ' + d.name);
        if (j === 0 && h(ME) % 2) {
          var before = __submits; window.confirm = function () { return true; };
          document.querySelector('.card .btn.soft').click(); await sleep(150);
          ok(__submits === before + 1 && S.view === 'home', 'dept ' + d.name + ': "not dealt with" is recorded and returns to the list'); continue;
        }
        await blockedWhenEmpty('dept ' + d.name); fill(ME + d.name, false);
        var ex = document.querySelector('[data-t=D_EX] textarea'); ex.value = 'In July a payment request waited a week for a reply, then arrived complete.'; ex.dispatchEvent(new Event('input'));
        ok(await send('dept ' + d.name), 'dept ' + d.name + ': accepted');
      }
      go('home'); await sleep(20);
      ok(DATA.done === DATA.total, 'all tasks done (' + DATA.done + '/' + DATA.total + ')');
    } catch (e) { ok(false, 'crash: ' + e.message); }
    R.recs = __recs; R.errors = R.errors.concat(__errs);
    var pre = document.createElement('pre'); pre.id = 'qa-out'; pre.textContent = JSON.stringify(R); document.body.appendChild(pre);
  }
  setTimeout(run, 60);
})();`;

let fails = 0, views = 0, total = 0;
(async () => {
for (const L of ['en', 'ar']) {
  const ctx = load();
  ctx.useSettings_({ LANGUAGE: L, ORG_NAME: 'Example Foundation', DEADLINE: '2026-12-01', TAGLINE: L === 'ar' ? ctx.tr_('ar', 'default.tagline') : 'Growing together' });
  const TEAM = ctx.testTeam_(), ASG = ctx.generateAssignments_(TEAM, ctx.exampleLinks_(L), []);
  ctx.__team = TEAM; ctx.__asg = ASG;
  vm.runInContext(`readTeam_ = function () { return JSON.parse(JSON.stringify(__team)); }; readAssignments_ = function () { return __asg; };
    readRecords_ = function () { return []; }; readDrafts_ = function () { return {}; }; readDeptLinks_ = function () { return {}; }; logoDataUri_ = function () { return ''; };`, ctx);
  const cfg = JSON.stringify(ctx.cfg_());
  const serverCode = PURE.map(f => safe(read(f))).join('\n');
  const all = [];
  for (const p of TEAM) {
    const paper = ctx.isNoEmail_(p.email);
    ctx.__who = p.email; ctx.__paper = paper;
    const html = vm.runInContext('appHtml_(clientData_(__who, __paper))', ctx);
    const server = `<script>${serverCode}\nuseSettings_(${cfg});</script>
<script>var ME = ${JSON.stringify(p.email)}, __team = ${JSON.stringify(TEAM)}, __asg = ${JSON.stringify(ASG)}, __recs = [], __errs = [], __submits = 0, __lastErr = '';
try { localStorage.clear(); } catch (e) {}
window.google = { script: { run: (function mk(okf, failf) { return {
  withSuccessHandler: function (f) { return mk(f, failf); }, withFailureHandler: function (f) { return mk(okf, f); },
  saveDraft: function () { setTimeout(function () { okf && okf({ ok: true, ts: Date.now() }); }, 5); },
  submitEval: function (kind, payload, as) { __submits++;
    var v = validateSubmission_(kind, JSON.parse(JSON.stringify(payload)), as || ME, JSON.parse(JSON.stringify(__team)), __asg, !!as, { deptLinks: {}, deptRatings: true, minChars: 30 });
    setTimeout(function () {
      if (v.error) { __lastErr = v.error; __errs.push(kind + ' ' + (payload.ratee || payload.dept || '') + ': ' + v.error); okf({ ok: false, error: v.error }); return; }
      v.rec.ts = Date.now() + __recs.length; __recs.push(v.rec);
      var prev = { ts: v.rec.ts, scores: v.rec.scores, evidence: v.rec.evidence, texts: v.rec.texts, freq: v.rec.freq, recog: v.rec.recog };
      if (kind === 'SELF') { DATA.selfDone = true; DATA.selfPrev = prev; }
      if (kind === 'PERSON') DATA.persons.forEach(function (x) { if (x.key === v.rec.ratee) { x.done = true; x.prev = prev; } });
      if (kind === 'DEPT') DATA.depts.forEach(function (x) { if (x.name === v.rec.ratee) { x.done = true; x.prev = prev; } });
      DATA.done = (DATA.selfDone ? 1 : 0) + DATA.persons.filter(function (x) { return x.done; }).length;
      okf({ ok: true, data: DATA }); }, 10); } }; })() } };</script>`;
    const page = html.replace('<script>var DATA', server + '<script>var DATA').replace('</body>', '<script>' + BOT + '</script></body>');
    const file = path.join(OUT, L + '-' + TEAM.indexOf(p) + '.html');
    fs.writeFileSync(file, page.replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>/g, '')); // no web fonts: tests must not wait on the network
    let out = null;
    try { out = await runPage(file, { width: 412, height: 915, until: "document.getElementById('qa-out') && document.getElementById('qa-out').textContent" }); }
    catch (e) { console.log('FAIL [' + L + '] ' + p.name + ': ' + e.message); fails++; continue; }
    const R = JSON.parse(out);
    const bad = R.checks.filter(c => !c.startsWith('PASS')).concat(R.errors.map(e => 'FAIL ' + e));
    fails += bad.length; views += R.views; total += R.checks.length; all.push(...R.recs);
    console.log((bad.length ? '✗ ' : '✓ ') + '[' + L + '] ' + p.name + (paper ? ' (paper)' : '') + ' — ' + R.checks.length + ' checks, ' + R.views + ' screens, ' + R.recs.length + ' answers');
    bad.forEach(b => console.log('    ' + b));
  }
  // every answer through the real analysis
  const A = ctx.analyze_(JSON.parse(JSON.stringify(TEAM)), ASG, all, [], ctx.analysisCfg_());
  const T = (c, msg) => { total++; if (!c) { fails++; console.log('FAIL [' + L + '] ' + msg); } };
  T(all.filter(r => r.form === 'PERSON').length === ASG.length, 'every one of the ' + ASG.length + ' pairs was rated');
  T(A.completion.every(c => c.pct === 1), 'progress: everyone at 100%');
  T(Object.values(A.persons).every(p => p.hasSelf), 'every self-evaluation arrived (including paper)');
  T(!A.flags.some(f => ['UNASSIGNED', 'UNKNOWN_RATER', 'UNKNOWN_RATEE', 'REL_MISMATCH'].indexOf(f.type) >= 0), 'no unassigned, unknown or mismatched ratings');
}
console.log('\n' + views + ' screens · ' + total + ' checks · ' + (fails ? fails + ' FAILED' : 'ALL PASSED'));
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (e) {}
process.exit(fails ? 1 : 0);
})();
