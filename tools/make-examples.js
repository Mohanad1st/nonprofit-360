#!/usr/bin/env node
// Writes org.example/ (English) and org.example-ar/ (Arabic) from the made-up example team in src/Bank.gs,
// so the example folders always match what the tool's built-in example uses. `node tools/make-examples.js`
'use strict';
const fs = require('fs'), path = require('path');
const { ROOT, load } = require('./lib');
const q = v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const csv = rows => rows.map(r => r.map(q).join(',')).join('\n') + '\n';
for (const [L, name] of [['en', 'org.example'], ['ar', 'org.example-ar']]) {
  const dir = path.join(ROOT, name), ctx = load(), T = ctx.tr_;
  ctx.useSettings_({ LANGUAGE: L });
  fs.mkdirSync(dir, { recursive: true });
  const team = ctx.exampleTeam_(L), names = {};
  team.forEach(p => { names[p.email] = p.name; });
  const show = e => ctx.isNoEmail_(e) ? names[e] : e;
  fs.writeFileSync(path.join(dir, 'team.csv'), csv([['name', 'email', 'department', 'job_title', 'manager', 'included', 'note']].concat(team.map(p =>
    [p.name, ctx.isNoEmail_(p.email) ? '' : p.email, p.dept, p.title, p.manager ? show(p.manager) : '', T(L, 'word.yes'), ctx.isNoEmail_(p.email) ? T(L, 'note.paperPerson') : '']))));
  fs.writeFileSync(path.join(dir, 'work-links.csv'), csv([['rater', 'ratee', 'reason', 'both_directions']].concat(ctx.exampleLinks_(L).map(l =>
    [show(l.rater), show(l.ratee), l.reason, l.both ? T(L, 'word.yes') : T(L, 'word.no')]))));
  fs.writeFileSync(path.join(dir, 'never-pair.csv'), csv([['person_a', 'person_b', 'note']]));
  fs.writeFileSync(path.join(dir, 'department-links.csv'), csv([['department', 'rates_these_departments']]));
  const s = { LANGUAGE: L, ORG_NAME: L === 'ar' ? 'مؤسسة المثال' : 'Example Foundation', CYCLE_NAME: '2026', DEADLINE: '2026-12-01', ADMIN_EMAIL: 'nadia@example.org',
    SIGNATURE: L === 'ar' ? 'نادية رحمن — المديرة التنفيذية' : 'Nadia Rahman — Executive Director', TIME_ZONE: '', LOGO: '', COLOR_PRIMARY: '#1f5f8b', COLOR_ACCENT: '#35b0d8',
    TAGLINE: T(L, 'default.tagline') };
  [1, 2, 3, 4].forEach(i => { s['VALUE_' + i + '_NAME'] = T(L, 'default.value' + i + '.name'); s['VALUE_' + i + '_TEXT'] = T(L, 'default.value' + i + '.text'); });
  Object.assign(s, { ORG_TARGETS: '', MIN_GROUP: 3, DEPT_RATINGS: 'yes', MANAGERS_RATE_EACH_OTHER: 'yes', TOP_RATED_BY_DIRECTS_ONLY: 'yes' });
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(s, null, 2) + '\n');
  console.log('wrote ' + name);
}
