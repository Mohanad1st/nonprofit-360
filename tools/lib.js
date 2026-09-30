// Shared helpers for the local tools and tests: load the Apps Script source into Node, and read an organisation's org/ folder.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
/** Order matters: later files use what earlier files define. The build joins them in this order too. */
const ORDER = ['Strings.en.gs', 'Strings.ar.gs', 'I18n.gs', 'Settings.gs', 'Bank.gs', 'Logic.gs', 'Checks.gs', 'TestData.gs',
  'Sheets.gs', 'Setup.gs', 'Process.gs', 'Reports.gs', 'Managers.gs', 'WebApp.gs'];
/** Files with no Google services at load time or in the functions the local tools call. */
const PURE = ['Strings.en.gs', 'Strings.ar.gs', 'I18n.gs', 'Settings.gs', 'Bank.gs', 'Logic.gs', 'Checks.gs', 'TestData.gs'];

function read(f) { return fs.readFileSync(path.join(SRC, f), 'utf8'); }
/** A fresh sandbox with the given source files loaded. extra = globals to add first (for example fake Google services). */
function load(files, extra) {
  const ctx = Object.assign({ console }, extra || {});
  vm.createContext(ctx);
  for (const f of files || ORDER) vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}

// ——— CSV (Excel and Google Sheets both export this) ———
function parseCsv(text) {
  text = String(text || '').replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}
function csvFile(dir, name) {
  const f = path.join(dir, name);
  if (!fs.existsSync(f)) return [];
  const rows = parseCsv(fs.readFileSync(f, 'utf8'));
  return rows.slice(1).map(r => r.map(x => String(x).trim())); // first row = headers
}

/**
 * Reads an organisation folder (org/ by default):
 *   settings.json · team.csv · work-links.csv · never-pair.csv · department-links.csv · questions.csv (optional)
 * Returns the raw rows (for the seed baked into the organisation's own Code.gs).
 */
function readOrg(dir) {
  dir = dir || path.join(ROOT, 'org');
  if (!fs.existsSync(dir)) throw new Error('No organisation folder at ' + dir + '. Copy org.example to org first (or run /setup-360 in Claude Code).');
  const sj = path.join(dir, 'settings.json');
  const settings = fs.existsSync(sj) ? JSON.parse(fs.readFileSync(sj, 'utf8')) : {};
  return {
    dir, settings,
    team: csvFile(dir, 'team.csv'),              // name, email, department, job title, manager, included, note
    links: csvFile(dir, 'work-links.csv'),       // rater, ratee, reason, both
    never: csvFile(dir, 'never-pair.csv'),       // a, b, note
    deptLinks: csvFile(dir, 'department-links.csv'), // department, rates
    questions: fs.existsSync(path.join(dir, 'questions.csv')) ? csvFile(dir, 'questions.csv') : null // code, section, question, help, required, departments
  };
}
/** Turns org rows into the objects the analysis uses, inside a loaded sandbox (so names resolve exactly as in the sheet). */
function orgObjects(ctx, org) {
  ctx.useSettings_(org.settings);
  if (org.questions) { ctx.__qrows = org.questions; vm.runInContext('__BANK = seedBank_(__qrows);', ctx); }
  ctx.__orgTeam = org.team; ctx.__orgLinks = org.links; ctx.__orgNever = org.never; ctx.__orgDept = org.deptLinks;
  return vm.runInContext(`(function () {
    var team = __orgTeam.filter(function (r) { return String(r[0] || '').trim(); }).map(function (r) {
      var name = String(r[0]).trim();
      return { name: name, email: lower_(r[1]) || noEmailId_(name), dept: String(r[2] || '').trim(), title: String(r[3] || '').trim(), manager: String(r[4] || '').trim(), active: !no_(r[5]) };
    });
    team.forEach(function (p) { p.manager = resolvePerson_(p.manager, team); });
    var links = __orgLinks.filter(function (r) { return r[0] && r[1]; }).map(function (r) { return { rater: resolvePerson_(r[0], team), ratee: resolvePerson_(r[1], team), reason: String(r[2] || ''), both: yes_(r[3]) }; });
    var never = __orgNever.filter(function (r) { return r[0] && r[1]; }).map(function (r) { return { a: resolvePerson_(r[0], team), b: resolvePerson_(r[1], team) }; });
    var deptLinks = {}; __orgDept.forEach(function (r) { if (r[0]) deptLinks[String(r[0]).trim()] = String(r[1] || '').split(/[,،]/).map(function (s) { return s.trim(); }).filter(String); });
    return { team: team, links: links, never: never, deptLinks: deptLinks };
  })()`, ctx);
}

module.exports = { ROOT, SRC, ORDER, PURE, read, load, parseCsv, readOrg, orgObjects };
