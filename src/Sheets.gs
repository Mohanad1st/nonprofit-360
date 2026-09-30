/**
 * nonprofit-360 — reading and writing the organisation's tabs.
 * The admin fills Team, Work links, Never pair, Department links and Questions in plain words;
 * people can be written as an email or as their name exactly as it appears in the Team tab.
 */

var TEAM_COLS = ['name', 'email', 'dept', 'title', 'manager', 'active', 'note'];
/**
 * Text typed by staff (comments, examples) is written into the admin's sheet. A cell that starts with = + - @ would run as a
 * formula there, and a formula can send the sheet's contents to another website. So every text cell is written as plain text.
 */
function safeCell_(v) { return typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v; }
function safeRows_(rows) { return rows.map(function (r) { return r.map(safeCell_); }); }
function cols_(tab, keys) { return keys.map(function (k) { return t_('col.' + tab + '.' + k); }); }

function writeHeader_(sh, headers) {
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  headerStyle_(sh.getRange(1, 1, 1, headers.length));
  sh.setFrozenRows(1);
}
function rows_(id, width) {
  var sh = sheet_(id);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
}

/** The team. A person without an email is rated online and rates others on paper. */
function readTeam_() {
  var rows = rows_('TEAM', TEAM_COLS.length).filter(function (r) { return String(r[0]).trim(); });
  var team = rows.map(function (r) {
    var name = String(r[0]).trim();
    return { name: name, email: lower_(r[1]) || noEmailId_(name), dept: String(r[2]).trim(), title: String(r[3]).trim(),
      manager: String(r[4]).trim(), active: !no_(r[5]) };
  });
  team.forEach(function (p) { p.manager = resolvePerson_(p.manager, team); });
  return team;
}
/** Email, or a name exactly as written in the Team tab → the person's id. */
function resolvePerson_(v, team) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (s.indexOf('@') > 0 || isNoEmail_(s)) return lower_(s);
  var hit = team.filter(function (p) { return p.name.toLowerCase() === s.toLowerCase(); })[0];
  return hit ? hit.email : lower_(s);
}
function readLinks_(team) {
  return rows_('LINKS', 4).filter(function (r) { return String(r[0]).trim() && String(r[1]).trim(); }).map(function (r) {
    return { rater: resolvePerson_(r[0], team), ratee: resolvePerson_(r[1], team), reason: String(r[2] || '').trim(), both: yes_(r[3]) };
  });
}
function readNever_(team) {
  return rows_('NEVER', 2).filter(function (r) { return String(r[0]).trim() && String(r[1]).trim(); })
    .map(function (r) { return { a: resolvePerson_(r[0], team), b: resolvePerson_(r[1], team) }; });
}
/** { department: [departments it rates] } — a department with no row rates every other department. */
function readDeptLinks_() {
  var out = {};
  rows_('DEPTLINKS', 2).forEach(function (r) {
    var d = String(r[0]).trim(); if (!d) return;
    out[d] = String(r[1] || '').split(/[,،]/).map(function (s) { return s.trim(); }).filter(String);
  });
  return out;
}
function deptCtx_() { return { deptLinks: readDeptLinks_(), deptRatings: settingYes_('DEPT_RATINGS') }; }
function assignOpts_() { return { managersMesh: settingYes_('MANAGERS_RATE_EACH_OTHER'), topDirectsOnly: settingYes_('TOP_RATED_BY_DIRECTS_ONLY') }; }

/** The Questions tab → a question bank; null when the tab is missing or broken (the default bank is used instead). */
function readQuestionsTab_() {
  var sh = sheet_('QUESTIONS');
  if (!sh || sh.getLastRow() < 2) return null;
  var out = {}; SECTIONS.forEach(function (s) { out[s] = []; });
  var seen = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues().forEach(function (r) {
    var id = String(r[0]).trim().toUpperCase(), sec = sectionOf_(r[1]);
    if (!id || !sec || seen[id] || no_(r[6])) return;
    if (!/^[A-Z][A-Z0-9_]{0,15}$/.test(id)) return;
    seen[id] = 1;
    out[sec].push(makeQuestion_(sec, [id, r[2], r[3], r[4], r[5]]));
  });
  return out.CORE.length ? out : null;
}
/** Section code from the code itself or its label in either language. */
function sectionOf_(v) {
  var s = String(v == null ? '' : v).trim();
  if (SECTIONS.indexOf(s.toUpperCase()) >= 0) return s.toUpperCase();
  for (var i = 0; i < SECTIONS.length; i++) {
    if (s === tr_('en', 'section.' + SECTIONS[i]) || s === tr_('ar', 'section.' + SECTIONS[i])) return SECTIONS[i];
  }
  return null;
}
function writeQuestionsTab_(bank) {
  var sh = sheet_('QUESTIONS', true);
  sh.clear();
  var head = cols_('questions', ['code', 'section', 'question', 'help', 'required', 'depts', 'active']);
  var rows = [head];
  SECTIONS.forEach(function (s) {
    bank[s].forEach(function (q) {
      rows.push([q.id, t_('section.' + s), q.title, q.help, q.kind === 'rating' ? t_('word.yes') : q.requiredIfLow ? t_('word.ifLow') : q.required ? t_('word.yes') : t_('word.no'),
        (q.depts || []).join(', '), q.off ? t_('word.no') : t_('word.yes')]);
    });
  });
  sh.getRange(1, 1, rows.length, head.length).setValues(safeRows_(rows)).setWrap(true).setVerticalAlignment('top');
  writeHeader_(sh, head);
  sh.setColumnWidth(1, 90); sh.setColumnWidth(2, 170); sh.setColumnWidth(3, 280); sh.setColumnWidth(4, 460);
  var yn = SpreadsheetApp.newDataValidation().requireValueInList([t_('word.yes'), t_('word.no'), t_('word.ifLow')], true).setAllowInvalid(true).build();
  if (rows.length > 1) sh.getRange(2, 5, rows.length - 1, 1).setDataValidation(yn);
  sh.getRange(1, 1).setNote(t_('note.questions'));
}

// ——— assignments ———
function readAssignments_() {
  return rows_('ASSIGN', 6).filter(function (r) { return r[0] && r[2]; })
    .map(function (r) { return { rater: lower_(r[0]), ratee: lower_(r[2]), reason: String(r[5] || '') }; });
}
function writeAssignments_(list, byEmail) {
  var sh = sheet_('ASSIGN', true);
  sh.clear();
  var head = cols_('assign', ['raterEmail', 'rater', 'rateeEmail', 'ratee', 'rel', 'reason', 'done']);
  var rows = [head];
  list.forEach(function (a) { rows.push([a.rater, byEmail[a.rater].name, a.ratee, byEmail[a.ratee].name, t_('rel.' + a.rel), a.reason || '', '']); });
  sh.getRange(1, 1, rows.length, head.length).setValues(safeRows_(rows));
  writeHeader_(sh, head);
  sh.getRange(1, 1).setNote(t_('note.assign'));
}

/** The admin's word on doubtful ratings: keep or exclude, per (rater → ratee). Never cleared by an update. */
function readDecisions_() {
  var sh = sheet_('DECISIONS', true);
  if (sh.getLastRow() < 1) writeHeader_(sh, cols_('decisions', ['rater', 'ratee', 'decision', 'reason', 'date']));
  return rows_('DECISIONS', 3).filter(function (r) { return r[0] && r[1] && r[2]; })
    .map(function (r) { return { rater: lower_(r[0]), ratee: lower_(r[1]), decision: decisionCode_(r[2]) }; })
    .filter(function (d) { return d.decision; });
}
function decisionCode_(v) {
  var s = String(v || '').trim().toLowerCase();
  if (s === 'keep' || s === 'إبقاء' || s === 'ابقاء' || s === t_('word.keep').toLowerCase()) return 'KEEP'; // i18n-ok: reads both languages
  if (s === 'exclude' || s === 'استبعاد' || s === t_('word.exclude').toLowerCase()) return 'EXCLUDE'; // i18n-ok: reads both languages
  return '';
}

// ——— answers sent from the personal page, and unsent drafts ———
var RESPONSE_COLS = ['date', 'kind', 'rater', 'ratee', 'freq', 'data'];
var DRAFT_COLS = ['saved', 'rater', 'key', 'data'];
function responsesSheet_() {
  var sh = sheet_('RESPONSES', true);
  if (sh.getLastRow() < 1) writeHeader_(sh, cols_('responses', RESPONSE_COLS));
  return sh;
}
function draftSheet_() {
  var sh = sheet_('DRAFTS', true);
  if (sh.getLastRow() < 1) writeHeader_(sh, cols_('drafts', DRAFT_COLS));
  return sh;
}
/** Every sent answer as a record (onlyRater: only that person's own answers). */
function readRecords_(onlyRater) {
  if (arguments.length && !onlyRater) return []; // asked for one person's answers, but no person: nothing
  var sh = sheet_('RESPONSES');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, RESPONSE_COLS.length).getValues()
    .filter(function (r) { return r[1] && r[2] && (!onlyRater || lower_(r[2]) === onlyRater); })
    .map(function (r, i) {
      var j = null; try { j = JSON.parse(r[5] || '{}'); } catch (e) { j = null; }
      if (!j) return null;
      var ts = r[0] instanceof Date ? r[0].getTime() : Number(new Date(r[0]));
      return { form: String(r[1]), rid: 'D' + (i + 2), ts: ts, rater: lower_(r[2]),
        ratee: String(r[1]) === 'DEPT' ? String(r[3]) : lower_(r[3]), relDeclared: j.relDeclared || '', freq: String(r[4] || ''),
        scores: j.scores || {}, evidence: j.evidence || {}, texts: j.texts || {}, recog: j.recog || [] };
    }).filter(Boolean);
}
function draftRow_(sh, email, key) {
  if (sh.getLastRow() < 2) return 0;
  var v = sh.getRange(2, 2, sh.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (lower_(v[i][0]) === email && String(v[i][1]) === key) return i + 2;
  return 0;
}
function clearDraft_(email, key) {
  var sh = sheet_('DRAFTS'); if (!sh) return;
  var row = draftRow_(sh, email, key); if (row) sh.deleteRow(row);
}
/** One person's drafts only: key → { ts, data } */
function readDrafts_(email) {
  var sh = sheet_('DRAFTS'), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (r) {
    if (lower_(r[1]) !== email) return;
    var d = {}; try { d = JSON.parse(r[3] || '{}'); } catch (e) {}
    out[String(r[2])] = { ts: r[0] instanceof Date ? r[0].getTime() : Number(new Date(r[0])), data: d };
  });
  return out;
}
