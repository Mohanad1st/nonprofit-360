#!/usr/bin/env node
// Builds the public try-it demo into docs/demo/: the real personal page, with the made-up example team, in English and
// Arabic. It runs in any browser with no Google account; answers are kept in that browser tab only and never sent.
// `node tools/demo.js`
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { ROOT, load } = require('./lib');
const OUT = path.join(ROOT, 'docs', 'demo');
fs.mkdirSync(OUT, { recursive: true });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const REPO = 'https://github.com/Mohanad1st/nonprofit-360';

const WORDS = {
  en: { title: 'nonprofit-360 demo', ribbon: 'Demo with a made-up team: you are Hala Kamel. Nothing you type is saved or sent.', other: 'العربية', otherFile: 'ar.html', get: 'Get it free' },
  ar: { title: 'تجربة nonprofit-360', ribbon: 'تجربة بفريق وهمي: أنتم هالة كامل. لا يُحفظ شيء مما تكتبونه ولا يُرسل.', other: 'English', otherFile: 'en.html', get: 'احصلوا عليه مجانًا' }
};

// The page talks to Google through google.script.run. Here it talks to this stand-in, which updates the page's own data.
const STUB = `<script>window.google = { script: { run: (function mk(ok, fail) { return {
  withSuccessHandler: function (f) { return mk(f, fail); }, withFailureHandler: function (f) { return mk(ok, f); },
  saveDraft: function () { setTimeout(function () { ok && ok({ ok: true, ts: Date.now() }); }, 150); },
  submitEval: function (kind, p) { setTimeout(function () {
    var ts = Date.now(), x = null;
    if (kind === 'SELF') { if (!DATA.selfDone) { DATA.selfDone = true; DATA.done++; } DATA.selfPrev = Object.assign({ ts: ts }, p); }
    if (kind === 'PERSON') x = DATA.persons.filter(function (q) { return q.key === p.ratee; })[0];
    if (kind === 'DEPT') x = DATA.depts.filter(function (q) { return q.name === p.dept; })[0];
    if (x) { if (!x.done) { x.done = true; DATA.done++; } x.prev = Object.assign({ ts: ts }, p); }
    ok && ok({ ok: true, data: DATA }); }, 400); } }; })() } };</script>`;

for (const L of ['en', 'ar']) {
  const ctx = load(), W = WORDS[L];
  ctx.useSettings_({ LANGUAGE: L, ORG_NAME: L === 'ar' ? 'مؤسسة المثال' : 'Example Foundation', DEADLINE: '2026-12-01', CYCLE_NAME: '2026' });
  ctx.__team = ctx.testTeam_(); ctx.__asg = ctx.generateAssignments_(ctx.__team, ctx.exampleLinks_(L), []);
  // show one ready-made role question set: finance and admin questions, switched on for the Finance department
  const bank = ctx.defaultBank_(L, true), fin = ctx.__team.find(p => p.email === 'khaled@example.org').dept;
  bank.ROLE = bank.ROLE.filter(q => /^RA/.test(q.id)).map(q => Object.assign(q, { off: false, depts: [fin] })); ctx.__BANK = bank;
  vm.runInContext(`readTeam_ = function () { return __team; }; readAssignments_ = function () { return __asg; }; readRecords_ = function () { return []; };
    readDrafts_ = function () { return {}; }; readDeptLinks_ = function () { return {}; }; logoDataUri_ = function () { return ''; };`, ctx);
  const html = vm.runInContext('appHtml_(clientData_("hala@example.org"))', ctx);
  const ribbon = `<div dir="${L === 'ar' ? 'rtl' : 'ltr'}" style="position:sticky;top:0;z-index:50;background:#fff4d6;border-bottom:1px solid #f0d58a;color:#5a4300;font:14px/1.5 Arial,sans-serif;padding:8px 14px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center">
<span style="flex:1;min-width:220px">${esc(W.ribbon)}</span><a href="${W.otherFile}" style="color:#1f5f8b;font-weight:bold">${esc(W.other)}</a><a href="${REPO}" style="color:#1f5f8b;font-weight:bold">${esc(W.get)}</a></div>`;
  const page = html
    .replace('<meta charset="utf-8">', '<meta charset="utf-8"><title>' + esc(W.title) + '</title><meta name="robots" content="noindex">')
    .replace('<body>', '<body>' + ribbon)
    .replace('<script>var DATA', STUB + '<script>var DATA');
  fs.writeFileSync(path.join(OUT, L + '.html'), page);
  console.log(path.relative(ROOT, path.join(OUT, L + '.html')));
}

fs.writeFileSync(path.join(OUT, 'index.html'), `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>nonprofit-360 demo</title><style>body{margin:0;font-family:Arial,"Segoe UI",sans-serif;background:#f4f8fb;color:#14283a;display:flex;min-height:100vh;align-items:center;justify-content:center}
.c{max-width:520px;margin:24px 16px;background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:28px}h1{margin:0 0 6px;color:#1f5f8b}p{line-height:1.6}
.b{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.b a{flex:1;min-width:140px;text-align:center;background:#1f5f8b;color:#fff;text-decoration:none;font-weight:bold;padding:14px;border-radius:10px}
.ar{direction:rtl;text-align:right;border-top:1px solid #e3eaf0;margin-top:14px;padding-top:10px}small a{color:#1f5f8b}</style></head><body><div class="c">
<h1>nonprofit-360</h1><p>Try the page your staff would see: a made-up organisation, in English or Arabic. Nothing is saved or sent.</p>
<p class="ar">جرّبوا الصفحة التي سيراها موظفوكم: مؤسسة وهمية، بالعربية أو الإنجليزية. لا يُحفظ شيء ولا يُرسل.</p>
<div class="b"><a href="en.html">English</a><a href="ar.html" lang="ar">العربية</a></div>
<small>Free and open source: <a href="${REPO}">${REPO.replace('https://', '')}</a></small></div></body></html>`);
console.log(path.relative(ROOT, path.join(OUT, 'index.html')));
