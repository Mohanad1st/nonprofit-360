#!/usr/bin/env node
// Checks your organisation folder (org/) on your own computer — the same checks as the sheet's «Check my team» menu —
// and writes org/build/review.html: who rates whom and why, and how many ratings each person gives and gets.
//   node tools/check-org.js            (reads org/)
//   node tools/check-org.js org.example
'use strict';
const fs = require('fs'), path = require('path');
const { ROOT, load, readOrg, orgObjects } = require('./lib');

const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'org');
const org = readOrg(dir);
const ctx = load();
const o = orgObjects(ctx, org);
const S = ctx.cfg_();
const res = ctx.checkOrg_(o.team, o.links, o.never, o.deptLinks, {
  admin: S.ADMIN_EMAIL, deadline: S.DEADLINE, minGroup: Number(S.MIN_GROUP),
  assignOpts: { managersMesh: ctx.settingYes_('MANAGERS_RATE_EACH_OTHER'), topDirectsOnly: ctx.settingYes_('TOP_RATED_BY_DIRECTS_ONLY') }
});
const errs = res.filter(x => x.level === 'error'), warns = res.filter(x => x.level === 'warn');
const asg = res.assignments || [];
console.log(ctx.orgName_() + ' — ' + o.team.length + ' people, ' + o.links.length + ' work links, ' + asg.length + ' pairings');
if (errs.length) { console.log('\n' + ctx.t_('check.errorsTitle', { n: errs.length })); errs.forEach(x => console.log('  ✗ ' + x.msg)); }
if (warns.length) { console.log('\n' + ctx.t_('check.warnsTitle', { n: warns.length })); warns.forEach(x => console.log('  • ' + x.msg)); }
if (!res.length) console.log('\n✓ ' + ctx.t_('check.allGood', { n: asg.length }));

// the review page
const by = {}; o.team.forEach(p => by[p.email] = p);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const rtl = ctx.isRtl_(), C = ctx.t_;
const rows = o.team.filter(p => p.active !== false).map(p => {
  const gives = asg.filter(a => a.rater === p.email), gets = asg.filter(a => a.ratee === p.email);
  const chip = (a, who) => '<span class="chip" title="' + esc(a.reason) + '">' + esc(by[who] ? by[who].name : who) + '<small>' + esc(a.reason) + '</small></span>';
  return '<tr><td><b>' + esc(p.name) + '</b><br><small>' + esc(p.dept) + ' · ' + esc(p.title) + (ctx.isNoEmail_(p.email) ? ' · 📝' : '') + '</small></td>' +
    '<td class="n' + (gets.length < Number(S.MIN_GROUP) ? ' low' : '') + '">' + gets.length + '</td><td>' + gets.map(a => chip(a, a.rater)).join('') + '</td>' +
    '<td class="n' + (gives.length > 12 ? ' low' : '') + '">' + gives.length + '</td><td>' + gives.map(a => chip(a, a.ratee)).join('') + '</td></tr>';
}).join('');
const html = '<!DOCTYPE html><html lang="' + ctx.lang_() + '" dir="' + (rtl ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(ctx.orgName_()) + ' – 360</title>' +
  '<style>body{font-family:Tahoma,Arial,sans-serif;margin:16px;color:#14283a;background:#f3f7fa}table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #e3ebf2;padding:8px;vertical-align:top;text-align:start}' +
  'th{background:#eef5fa}.n{text-align:center;font-weight:bold}.low{background:#fdecea;color:#b00020}.chip{display:inline-block;background:#eef5fa;border-radius:12px;padding:3px 9px;margin:2px;font-size:13px}.chip small{display:block;color:#5b6b7a;font-size:11px}' +
  '.box{background:#fff;border-radius:10px;padding:10px 14px;margin:0 0 12px}.e{color:#b00020}</style></head><body>' +
  '<h2>' + esc(ctx.orgName_()) + ' — ' + esc(C('tab.ASSIGN')) + '</h2>' +
  '<div class="box">' + (res.length ? errs.map(x => '<div class="e">✗ ' + esc(x.msg) + '</div>').join('') + warns.map(x => '<div>• ' + esc(x.msg) + '</div>').join('') : '✓ ' + esc(C('check.allGood', { n: asg.length }))) + '</div>' +
  '<table><tr><th>' + esc(C('col.team.name')) + '</th><th>#</th><th>' + esc(C('col.assign.rater')) + ' →</th><th>#</th><th>→ ' + esc(C('col.assign.ratee')) + '</th></tr>' + rows + '</table></body></html>';
const out = path.join(dir, 'build');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'review.html'), html);
console.log('\nReview page: ' + path.relative(ROOT, path.join(out, 'review.html')));
process.exit(errs.length ? 1 : 0);
