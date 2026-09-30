// Whole-flow test against fake Google services (a spreadsheet in memory, fake Drive, Docs, Mail…), in English and Arabic:
// setup wizard → checks → pairings → publish → the page for every person → answers and drafts → results → reports →
// paper forms → preview, invitations and reminders → built-in test. Plus: only the admin can run admin commands,
// employee copies never contain a rater's name or a warning, and nobody without an email gets an email.
// It proves the script runs end to end and says the right things; it does not prove Google's own services behave (the clean install does).
'use strict';
const vm = require('vm');
const { load, read, ORDER } = require('../tools/lib');
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log('FAIL ' + msg); } }

function any(name) { // a do-nothing object that accepts any call chain
  const f = function () {};
  return new Proxy(f, { get: (t, p) => p === 'then' ? undefined : p === Symbol.toPrimitive ? () => name : p === 'toString' ? () => () => name : any(name + '.' + String(p)), apply: () => any(name + '()') });
}

function fakeGoogle(state) {
  let nextSheetId = 100;
  function makeSheet(name) {
    const sh = { name, id: nextSheetId++, data: [], hidden: false, charts: 0, notes: {} };
    function width() { return sh.data.reduce((m, r) => Math.max(m, r.length), 0); }
    function range(r, c, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      const R = {
        getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (sh.data[r - 1 + i] || [])[c - 1 + j]; row.push(v == null ? '' : v); } out.push(row); } return out; },
        setValues: (v) => { if (v.length !== nr || v.some(x => x.length !== nc)) throw new Error('setValues size mismatch on ' + name + ' ' + nr + 'x' + nc + ' got ' + v.length + 'x' + (v[0] || []).length);
          v.forEach((row, i) => { sh.data[r - 1 + i] = sh.data[r - 1 + i] || []; row.forEach((x, j) => { sh.data[r - 1 + i][c - 1 + j] = x; }); }); return P; },
        setValue: (x) => { sh.data[r - 1] = sh.data[r - 1] || []; sh.data[r - 1][c - 1] = x; return P; },
        setNote: (t) => { sh.notes[r + ',' + c] = t; return P; },
        clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { if (sh.data[r - 1 + i]) sh.data[r - 1 + i][c - 1 + j] = ''; } return P; },
        getSheet: () => api
      };
      const P = new Proxy(R, { get: (t, p) => p in t ? t[p] : () => P });
      return P;
    }
    const api = new Proxy({
      getName: () => sh.name, setName: (n) => { sh.name = n; return api; }, getSheetId: () => sh.id,
      getLastRow: () => { let n = sh.data.length; while (n > 0 && !(sh.data[n - 1] || []).some(x => x !== '' && x != null)) n--; return n; },
      getLastColumn: () => width(),
      getRange: (r, c, nr, nc) => range(r, c, nr, nc),
      getDataRange: () => range(1, 1, Math.max(1, sh.data.length), Math.max(1, width())),
      appendRow: (row) => { sh.data.splice(api.getLastRow(), 0, row.slice()); return api; },
      deleteRow: (r) => { sh.data.splice(r - 1, 1); return api; },
      clear: () => { sh.data = []; return api; },
      hideSheet: () => { sh.hidden = true; return api; },
      getCharts: () => [], insertChart: () => { sh.charts++; }, newChart: () => any('chartBuilder'),
      getConditionalFormatRules: () => [], setConditionalFormatRules: () => api
    }, { get: (t, p) => p in t ? t[p] : () => api });
    sh.api = api;
    return sh;
  }
  const book = { sheets: [], id: 'BOOK1' };
  const bookApi = new Proxy({
    getId: () => book.id,
    getSheets: () => book.sheets.map(s => s.api),
    getSheetByName: (n) => { const s = book.sheets.find(x => x.name === n); return s ? s.api : null; },
    insertSheet: (n) => { if (book.sheets.some(x => x.name === n)) throw new Error('duplicate sheet ' + n); const s = makeSheet(n); book.sheets.push(s); return s.api; },
    getSpreadsheetTimeZone: () => 'Etc/UTC'
  }, { get: (t, p) => p in t ? t[p] : () => bookApi });
  const props = {};
  state.book = book; state.mail = []; state.docs = {}; state.alerts = []; state.folders = [];
  function folder(name) {
    const f = { name, trashed: false, kids: [], id: 'F' + state.folders.length };
    state.folders.push(f);
    const api = f.api = new Proxy({ getName: () => f.name, getId: () => f.id, setTrashed: (v) => { f.trashed = v; }, isTrashed: () => f.trashed,
      createFolder: (n) => { const k = folder(n); f.kids.push(k); return k; },
      getFolders: () => { const list = f.kids.slice(); let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; } },
      { get: (t, p) => p in t ? t[p] : () => any('folder') });
    return api;
  }
  const root = folder('root');
  const g = {
    SpreadsheetApp: new Proxy({
      getActiveSpreadsheet: () => bookApi, openById: () => bookApi,
      getUi: () => new Proxy({ alert: (m) => { state.alerts.push(String(m)); return 'YES'; }, Button: { YES: 'YES' }, ButtonSet: { YES_NO: 1 },
        createMenu: (t) => { state.menu = { title: t, items: [] }; const m = { addItem: (l, fn) => { state.menu.items.push([l, fn]); return m; }, addSeparator: () => m, addToUi: () => m }; return m; },
        showSidebar: () => { state.sidebar = true; }, showModalDialog: () => { state.dialog = true; } }, { get: (t, p) => p in t ? t[p] : () => any('ui') }),
      newDataValidation: () => any('validation'), newConditionalFormatRule: () => any('rule'),
      InterpolationType: {}
    }, { get: (t, p) => p in t ? t[p] : any('SpreadsheetApp.' + String(p)) }),
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => Object.assign({}, props), getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    Session: { getActiveUser: () => ({ getEmail: () => state.user }), getEffectiveUser: () => ({ getEmail: () => state.owner }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    Utilities: { formatDate: (d) => new Date(d).toISOString().slice(0, 16).replace('T', ' '), base64Encode: () => 'AAAA', base64Decode: () => [], newBlob: () => any('blob') },
    Logger: { log: () => {} },
    ScriptApp: { getService: () => ({ getUrl: () => state.serviceUrl || '' }) },
    HtmlService: { createHtmlOutput: (h) => { state.lastHtml = String(h); const o = new Proxy({}, { get: () => () => o }); return o; } },
    MailApp: { getRemainingDailyQuota: () => state.quota == null ? 1000 : state.quota, sendEmail: (to, subject, text, opts) => { if (state.quota != null) state.quota--; state.mail.push({ to, subject, text, html: (opts || {}).htmlBody || '' }); } },
    UrlFetchApp: { fetch: () => { throw new Error('no network in tests'); } },
    DriveApp: { getFileById: () => new Proxy({ getParents: () => ({ hasNext: () => true, next: () => root }), moveTo: () => {} }, { get: (t, p) => p in t ? t[p] : () => any('file') }),
      getRootFolder: () => root, getFolderById: (id) => { const f = state.folders.find(x => x.id === id); if (!f) throw new Error('no folder'); return f.api; } },
    DocumentApp: {
      create: (title) => {
        const T = (state.docs[title] = []);
        const body = new Proxy({
          appendParagraph: (t) => { T.push(String(t)); return any('par'); },
          appendListItem: (t) => { T.push(String(t)); return any('li'); },
          appendTable: (rows) => {
            if (!Array.isArray(rows) || !rows.every(r => Array.isArray(r) && r.length === rows[0].length && r.every(c => typeof c === 'string'))) throw new Error('appendTable needs a rectangular table of text in ' + title);
            rows.forEach(r => T.push(r.join(' | ')));
            return { getNumRows: () => rows.length, getRow: (i) => ({ getNumCells: () => rows[i].length, getCell: () => any('cell') }) };
          },
          appendImage: () => any('img'), appendPageBreak: () => any('pb')
        }, { get: (t, p) => p in t ? t[p] : () => body });
        return { getBody: () => body, getId: () => 'DOC-' + title, saveAndClose: () => {} };
      },
      ParagraphHeading: {}, HorizontalAlignment: {}, GlyphType: {}
    },
    Charts: new Proxy({}, { get: () => any('Charts') })
  };
  return g;
}

for (const L of ['en', 'ar']) {
  const tag = '[' + L + '] ', state = { user: 'nadia@example.org', owner: 'nadia@example.org' };
  const ctx = load(ORDER, fakeGoogle(state));
  const run = (code) => vm.runInContext(code, ctx);
  const tabs = () => state.book.sheets.map(s => s.name);
  const tab = (id) => state.book.sheets.find(s => s.name === ctx.tr_(L, 'tab.' + id));

  const T0 = Date.now(); const step = (m) => process.env.DBG && console.log((Date.now() - T0) + "ms " + m);
  // a fresh sheet: only "Start setup"
  ctx.onOpen();
  ok(state.menu && state.menu.items.length === 1 && state.menu.items[0][1] === 'openSetup', tag + 'a fresh sheet shows only «Start setup»');
  ctx.openSetup();
  ok(state.sidebar && /wizardSave/.test(state.lastHtml), tag + 'setup side panel opens');
  const msg = ctx.wizardSave({ LANGUAGE: L, ORG_NAME: 'Example Foundation', CYCLE_NAME: '2026', DEADLINE: '2026-12-01', ADMIN_EMAIL: 'nadia@example.org', loadExample: true });
  ok(/\S/.test(msg) && tab('SETTINGS') && tab('TEAM') && tab('LINKS') && tab('QUESTIONS') && tab('GUIDE'), tag + 'wizard builds every tab: ' + tabs().join(', '));
  ok(tab('TEAM').data.length === 13 && tab('LINKS').data.length > 5, tag + 'example team (12) and work links written');
  ok(tab('QUESTIONS').data.length > 40, tag + 'question bank written into the Questions tab');
  ok(state.menu.items.length >= 12 && state.menu.title === ctx.tr_(L, 'menu.title'), tag + 'full menu appears after setup, in the chosen language');
  ctx.resetCfg_();
  ok(ctx.lang_() === L && ctx.orgName_() === 'Example Foundation', tag + 'settings are read back from the Settings tab');
  ok(ctx.Q_().CORE.length === 8, tag + 'the question bank is read back from the Questions tab');

  step("wizard done");
  // checks and pairings
  state.alerts = []; ctx.checkSetup();
  ok(state.alerts.length === 1 && state.alerts[0] === ctx.tr_(L, 'check.allGood', { n: 48 }), tag + 'checks: everything looks right, 48 pairings ready');
  ctx.makePairings();
  ok(tab('ASSIGN').data.length === 49, tag + '48 pairings written, each with a reason');
  ok(tab('ASSIGN').data.slice(1).every(r => String(r[5]).trim()), tag + 'every written pairing has a reason');

  step("pairs done");
  // publishing
  state.alerts = [];
  ok(ctx.savePageUrl('https://evil.example.com/x') === ctx.tr_(L, 'publish.bad'), tag + 'a wrong page address is refused');
  ok(ctx.savePageUrl('https://script.google.com/a/macros/example.org/s/TESTID/exec') === ctx.tr_(L, 'publish.saved'), tag + 'the page address is saved');
  ok(ctx.portalUrl_().indexOf('/exec') > 0, tag + 'page address read back');

  step("publish done");
  // the personal page for every person
  const team = ctx.readTeam_();
  ok(team.length === 12 && team.filter(p => ctx.isNoEmail_(p.email)).length === 1, tag + 'team read back: 12 people, 1 without email');
  for (const p of team) {
    state.user = ctx.isNoEmail_(p.email) ? 'nobody' : p.email;
    if (ctx.isNoEmail_(p.email)) continue;
    ctx.doGet({ parameter: {} });
    const h = state.lastHtml;
    ok(h.indexOf('dir="' + (L === 'ar' ? 'rtl' : 'ltr') + '"') > 0 && h.indexOf(JSON.stringify(p.name).slice(1, -1)) > 0, tag + 'page for ' + p.email + ' opens in the right direction with their name');
    const others = team.filter(o => o.email !== p.email && !ctx.isNoEmail_(o.email));
    const dataJson = h.slice(h.indexOf('var DATA = ') + 11, h.indexOf(';</script>'));
    const D = JSON.parse(dataJson.replace(/\\u003c/g, '<'));
    ok(D.persons.every(x => ctx.readAssignments_().some(a => a.rater === p.email && a.ratee === x.key)), tag + p.email + ' sees only their own tasks');
  }
  state.user = 'stranger@example.net'; ctx.doGet({ parameter: {} });
  ok(/Example Foundation/.test(state.lastHtml) && !/var DATA/.test(state.lastHtml), tag + 'an outsider sees only a polite message');
  state.user = 'karim@example.org'; ctx.doGet({ parameter: { as: 'Samir Lotfy' } });
  ok(!/var DATA/.test(state.lastHtml), tag + 'paper entry is refused for anyone but the admin');
  state.user = 'nadia@example.org'; ctx.doGet({ parameter: { as: team.find(p => ctx.isNoEmail_(p.email)).name } });
  ok(/var DATA/.test(state.lastHtml) && /"as":"no-email:/.test(state.lastHtml), tag + 'the admin can open a paper entry by name');

  step("pages done");
  // answers and drafts through the real server functions
  const core = {}; ctx.coreIds_().forEach(q => core[q] = 4);
  const notes = { O_START: 'Share the weekly plan on Sunday', O_KEEP: 'Clear monthly reports' };
  state.user = 'karim@example.org';
  const d1 = ctx.saveDraft('PERSON|rami@example.org', { scores: { C1: 2 }, texts: { O_START: 'half written' } });
  ok(d1.ok && tab('DRAFTS').data.length === 2, tag + 'a draft is saved on the server');
  ok(!ctx.saveDraft('PERSON|omar@example.org', { scores: {} }).ok, tag + 'a draft for someone not on your list is refused');
  ctx.doGet({ parameter: {} });
  ok(/half written/.test(state.lastHtml), tag + 'the draft comes back when the page is opened again');
  const r1 = ctx.submitEval('PERSON', { ratee: 'rami@example.org', freq: 'WEEKLY', scores: core, texts: notes });
  ok(r1.ok && tab('RESPONSES').data.length === 2 && tab('DRAFTS').data.length === 1, tag + 'sending stores the answer and removes the draft');
  const r2 = ctx.submitEval('PERSON', { ratee: 'omar@example.org', freq: 'WEEKLY', scores: core, texts: notes });
  ok(!r2.ok && r2.error === ctx.tr_(L, 'err.notInList'), tag + 'rating someone not on your list is refused in the right language');
  const selfTexts = {}; ctx.openFor_('SELF_OPEN', 'x').forEach(q => selfTexts[q.id] = 'A clear honest answer ' + q.id);
  ok(ctx.submitEval('SELF', { scores: core, texts: Object.assign({ R_WHY: 'RECOGLEAK Yasmin and Rami covered my site visits' }, selfTexts), recog: ['yasmin@example.org', 'rami@example.org'] }).ok, tag + 'a self-evaluation is stored');
  state.user = 'nadia@example.org';
  const samir = team.find(p => ctx.isNoEmail_(p.email));
  const sp = ctx.submitEval('SELF', { scores: core, texts: selfTexts }, samir.name);
  ok(sp.ok && JSON.parse(tab('RESPONSES').data[tab('RESPONSES').data.length - 1][5]).enteredBy === 'nadia@example.org', tag + 'a paper form entered by the admin is marked as entered by them');
  state.user = 'karim@example.org';
  ok(!ctx.submitEval('SELF', { scores: core, texts: selfTexts }, samir.name).ok, tag + 'nobody else can enter a paper form');
  state.user = 'rami@example.org'; ctx.doGet({ parameter: {} });
  ok(state.lastHtml.indexOf('Share the weekly plan') < 0, tag + 'what Karim wrote about Rami is never sent to Rami\'s page');
  state.user = 'karim@example.org'; ctx.doGet({ parameter: {} });
  ok(state.lastHtml.indexOf('Share the weekly plan') > 0, tag + '…but Karim sees his own sent answer, to edit it');

  step("answers done");
  // fill everybody ratings so reports have content
  state.user = 'nadia@example.org';
  const asg = ctx.readAssignments_();
  asg.forEach((a, i) => {
    const sc = {}; ctx.coreIds_().forEach((q, j) => sc[q] = ((i + j) % 4) + 2);
    const ev = {}; Object.keys(sc).forEach(q => { if (sc[q] === 2 || sc[q] === 5) ev[q] = 'In May the report came two weeks late and the donor update slipped.'; });
    const rec = { form: 'PERSON', ts: Date.now() + i, rater: a.rater, ratee: a.ratee, freq: 'WEEKLY', scores: sc, evidence: ev, texts: { O_START: 'Start note ' + i, O_KEEP: 'Keep note ' + i }, recog: [] };
    tab('RESPONSES').api.appendRow([new Date(rec.ts), 'PERSON', rec.rater, rec.ratee, rec.freq, JSON.stringify({ scores: sc, evidence: ev, texts: rec.texts })]);
  });
  // Laila is Omar's only team member: her words about his leadership must never reach his own copy
  const lead = {}; ctx.coreIds_().forEach(q => lead[q] = 4); ctx.leadIds_().forEach(q => lead[q] = 5);
  const lev = {}; ctx.leadIds_().forEach(q => lev[q] = 'LEADLEAK he always explains priorities in our Monday call');
  tab('RESPONSES').api.appendRow([new Date(Date.now() + 99999), 'PERSON', 'laila@example.org', 'omar@example.org', 'WEEKLY', JSON.stringify({ scores: lead, evidence: lev, texts: { O_START: 'x start', O_KEEP: 'x keep' } })]);
  state.alerts = [];
  const R = ctx.updateResults();
  ok(tab('PEOPLE') && tab('FLAGS') && tab('COMPLETION') && tab('DASH') && tab('SUMMARY') && tab('ACCOUNT') && tab('BLAME'), tag + 'results tabs written');
  ok(tab('DASH').charts >= 1, tag + 'dashboard charts inserted');
  ok(tab('ASSIGN').data.slice(1).filter(r => r[6] === ctx.tr_(L, 'word.yes')).length === asg.length, tag + 'every pairing is ticked as done');
  ctx.REPORT_BUDGET_MS = -1; state.alerts = []; ctx.makeReports();
  ok(state.alerts[0].indexOf(ctx.tr_(L, 'reports.partial', { d: 0, n: 12, folder: '' }).slice(0, 20)) === 0, tag + 'reports stop safely before the time limit and say how far they got');
  const foldersAfterFirst = state.folders.length;
  ctx.REPORT_BUDGET_MS = 270000; state.alerts = []; state.dialog = false; ctx.makeReports();
  ok(state.dialog && state.lastHtml.indexOf(ctx.esc_(ctx.tr_(L, 'reports.done', { folder: '' }).slice(0, 15))) >= 0 && state.folders.length === foldersAfterFirst, tag + 'the next run continues in the same folder and finishes');
  ok(/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/.test(state.lastHtml), tag + 'the finished window offers a calendar reminder for the follow-up');
  const acts = tab('ACTIONS');
  ok(acts && acts.data.length >= 11 && acts.data[0][3] === ctx.tr_(L, 'col.actions.action'), tag + 'an «Agreed actions» tab is made, one starting row per person');
  const before = acts.data.length; ctx.actionsTab_(R);
  ok(acts.data.length === before, tag + '…and making the reports again does not add the same people twice');
  const withMgr = acts.data.findIndex((r, i) => i > 0 && r[2]);
  acts.data[withMgr][3] = 'Share the weekly plan every Monday'; acts.data[withMgr][5] = '2027-01-15';
  state.mail = []; state.alerts = []; ctx.followUpActions();
  ok(state.mail.length === 1 && state.mail[0].to === acts.data[withMgr][2] && state.mail[0].text.indexOf('Share the weekly plan every Monday') >= 0, tag + 'the follow-up emails the manager the open action of their team, and nobody else');
  ok(acts.data[withMgr][7], tag + '…and records the date of the follow-up');
  acts.data[withMgr][6] = ctx.tr_(L, 'word.yes'); state.mail = []; state.alerts = []; ctx.followUpActions();
  ok(state.mail.length === 0 && state.alerts[0] === ctx.tr_(L, 'followUp.none'), tag + 'an action marked done is not sent again');
  const docs = Object.keys(state.docs);
  const staffDocs = docs.filter(t => t.indexOf(ctx.tr_(L, 'report.staffTitle', { name: '' }).split('–').slice(-1)[0].trim()) >= 0 && !/^TEST|^تجريبي/.test(t));
  const adminDocs = docs.filter(t => /private|سري/.test(t) && !/organisation|للمؤسسة/.test(t));
  ok(staffDocs.length >= 10 && adminDocs.length >= 10 && docs.some(t => /organisation|للمؤسسة/.test(t)), tag + 'employee copies, admin copies and the organisation report made (' + staffDocs.length + ' / ' + adminDocs.length + ')');
  const flagWords = Object.keys(ctx.STR_EN).filter(k => k.indexOf('flagName.') === 0).map(k => ctx.tr_(L, k)).concat([ctx.tr_(L, 'tab.FLAGS'), ctx.tr_(L, 'report.excluded', { n: '' }).slice(0, 12)]);
  let leaks = [];
  staffDocs.forEach(t => {
    const text = state.docs[t].join('\n');
    const who = R.persons[Object.keys(R.persons).find(e => t.indexOf(R.persons[e].name) >= 0)];
    team.forEach(p => { if (who && p.name !== who.name && text.indexOf(p.name) >= 0) leaks.push(t + ' names ' + p.name); });
    flagWords.forEach(w => { if (w && text.indexOf(w) >= 0) leaks.push(t + ' contains "' + w + '"'); });
    if (text.indexOf('@') >= 0) leaks.push(t + ' contains an email');
  });
  staffDocs.forEach(t => { const text = state.docs[t].join(' '); if (/LEADLEAK|RECOGLEAK/.test(text)) leaks.push(t + ' contains words a colleague wrote about a small group'); });
  ok(adminDocs.some(t => state.docs[t].some(l => /LEADLEAK/.test(l))), tag + 'the admin copy still has the leadership example');
  ok(!leaks.length, tag + 'employee copies contain no rater name, no email and no warning' + (leaks.length ? ': ' + leaks.slice(0, 3).join('; ') : ''));
  ok(adminDocs.some(t => state.docs[t].some(l => /Start note/.test(l))), tag + 'admin copies include the raters\' notes');

  step("reports done");
  // paper forms
  state.alerts = []; step("paper start"); ctx.makePaperForms(); step("paper made");
  const paperDoc = docs.length !== Object.keys(state.docs).length ? Object.keys(state.docs).find(t => t.indexOf(samir.name) >= 0 && /paper|ورقي/.test(t)) : null;
  ok(paperDoc && state.docs[paperDoc].some(l => l.indexOf('Rami') >= 0 || l.indexOf('رامي') >= 0), tag + 'a paper form is made for the person without email, with the people they rate');

  step("paper checked");
  // emails
  state.mail = []; state.user = 'nadia@example.org';
  ctx.sendMyPreview();
  ok(state.mail.length === 1 && state.mail[0].to === 'nadia@example.org', tag + 'the preview goes to the admin only');
  ok(state.mail[0].html.indexOf('dir="' + (L === 'ar' ? 'rtl' : 'ltr') + '"') >= 0 && state.mail[0].html.indexOf('/exec') > 0, tag + 'the email has the right direction and the page button');
  state.mail = []; state.quota = 4; state.alerts = []; ctx.sendInvitations();
  ok(state.mail.length === 4 && state.alerts.pop() === ctx.tr_(L, 'email.invitesPartial', { n: 4, left: 7 }), tag + 'invitations stop at the daily email limit and say how many are left');
  const firstFour = state.mail.map(m => m.to); state.quota = null; ctx.sendInvitations();
  ok(state.mail.length === 11 && new Set(state.mail.map(m => m.to)).size === 11 && state.mail.slice(4).every(m => firstFour.indexOf(m.to) < 0), tag + 'the next send continues with the rest and nobody gets it twice');
  state.alerts = []; ctx.sendInvitations();
  ok(state.alerts.pop() === ctx.tr_(L, 'email.allInvited') && state.mail.length === 11, tag + 'once everyone is invited, sending again sends nothing');
  ok(state.mail.every(m => /@example\.org$/.test(m.to)), tag + 'invitations to the 11 people with email, none to the paper person');
  ok(state.mail.every(m => m.subject.indexOf('Example Foundation') > 0), tag + 'subjects carry the organisation name');
  state.mail = []; ctx.sendReminders();
  ok(state.mail.length >= 1 && state.mail.length <= 11 && state.mail.every(m => /@example\.org$/.test(m.to)), tag + 'reminders go only to people with email who have not finished (' + state.mail.length + ')');

  step("emails done");
  // the built-in test
  state.alerts = []; ctx.runTest();
  ok(state.alerts.length === 2 && state.alerts[0] === ctx.tr_(L, 'test.confirmReal') && Object.keys(state.docs).some(t => /^TEST|^تجريبي/.test(t)), tag + 'with real answers present the test asks first, then runs and makes test reports');
  ctx.clearTest();
  ok(state.folders.some(f => f.trashed), tag + 'clearing the test moves the test folder to the bin');

  // a new round: answers and pairings go, team and settings stay
  state.alerts = []; ctx.newRound();
  ok(tab('RESPONSES').data.slice(1).every(r => r.every(c => c === '')) && tab('ASSIGN').data.slice(1).every(r => r.every(c => c === '')), tag + 'a new round clears answers and pairings');
  ok(tab('TEAM').data.length === 13 && ctx.readTeam_().length === 12 && ctx.orgName_() === 'Example Foundation', tag + '…and keeps the team and settings');
  state.mail = []; ctx.makePairings(); ctx.savePageUrl('https://script.google.com/a/macros/example.org/s/TESTID/exec'); ctx.sendInvitations();
  ok(state.mail.length === 11, tag + 'after a new round, invitations go to everyone again');

  // a copied sheet forgets the file it was copied from
  const P = ctx.PropertiesService.getScriptProperties();
  P.setProperty('CONTROL_SHEET_ID', 'LAST-YEAR'); P.setProperty('REPORT_JOB', '{"folder":"x"}'); P.setProperty('INVITED', '["a@example.org"]');
  ctx.resetCfg_(); ctx.book_();
  ok(!P.getProperty('REPORT_JOB') && !P.getProperty('INVITED') && P.getProperty('CONTROL_SHEET_ID') !== 'LAST-YEAR', tag + 'a copy of the sheet forgets the file of last year, reports job and invitation list');
  // asking managers who works with whom
  const HM = 'hala@example.org', KZ = 'karim@example.org', LZ = 'laila@example.org', MO = 'mona@example.org';
  state.user = HM; let lp = ctx.linksPageHtml_(HM);
  ok(lp.indexOf(ctx.tr_(L, 'links.title')) >= 0 && lp.indexOf(team.find(p => p.email === KZ).name) >= 0, tag + 'a manager sees the short page with their own team');
  ok(ctx.linksPageHtml_(KZ).indexOf(ctx.esc_(ctx.tr_(L, 'links.notManager'))) >= 0, tag + 'someone who manages nobody gets a plain message instead');
  const linksBefore = tab('LINKS').data.length;
  let lr = ctx.submitLinks([{ member: KZ, colleague: MO, reason: 'Monthly newsletter stories from the field' }]);
  const added = tab('LINKS').data[tab('LINKS').data.length - 1];
  ok(lr.ok && lr.added === 1 && tab('LINKS').data.length === linksBefore + 1 && added[2] === 'Monthly newsletter stories from the field' && added[4] === ctx.tr_(L, 'links.fromManager', { name: team.find(p => p.email === HM).name }), tag + 'the answer goes into «Work links», marked with the name of the manager');
  lr = ctx.submitLinks([{ member: LZ, colleague: KZ, reason: 'Same pair the other way round' }]);
  ok(!lr.ok, tag + 'a manager cannot add links for someone outside their team');
  lr = ctx.submitLinks([{ member: KZ, colleague: MO, reason: 'Again' }]);
  ok(lr.ok && lr.added === 0, tag + 'a pair already listed is not added twice');
  lr = ctx.submitLinks([{ member: KZ, colleague: MO, reason: '' }]);
  ok(!lr.ok, tag + 'a link without a reason is refused');
  state.user = KZ; lr = ctx.submitLinks([{ member: 'yasmin@example.org', colleague: LZ, reason: 'Pretending to be a manager' }]);
  ok(!lr.ok && tab('LINKS').data.length === linksBefore + 1, tag + 'someone who manages nobody cannot add links');
  state.user = HM; ctx.doGet({ parameter: { view: 'links' } });
  ok(state.lastHtml.indexOf(ctx.tr_(L, 'links.title')) >= 0, tag + 'the published page opens the short page for managers with ?view=links');
  state.user = 'nadia@example.org'; state.mail = []; state.alerts = []; ctx.askManagers();
  const mgrs = team.filter(p => p.active !== false && p.email && !ctx.isNoEmail_(p.email) && team.some(q => q.manager === p.email && q.active !== false));
  ok(state.mail.length === mgrs.length && state.mail.every(m => m.text.indexOf('?view=links') >= 0), tag + 'asking managers emails each manager once, with the link to their short page');
  ctx.rememberControlSheet_();

  // only the admin
  state.user = 'karim@example.org';
  const adminFns = ['newRound', 'openSetup', 'wizardSave', 'checkSetup', 'makePairings', 'publishGuide', 'savePageUrl', 'sendMyPreview', 'sendInvitations', 'updateResults', 'sendReminders', 'makeReports', 'makePaperForms', 'enterPaperAnswers', 'followUpActions', 'askManagers', 'runTest', 'clearTest'];
  adminFns.forEach(fn => {
    let threw = false; try { ctx[fn]({}); } catch (e) { threw = e.message === ctx.tr_(L, 'err.adminOnly'); }
    ok(threw, tag + fn + ' is refused for a non-admin');
  });
}

// every function a page could call: either the three the page needs, or it checks for the admin first
const publicFns = [];
ORDER.forEach(f => { const src = read(f); const re = /^function ([A-Za-z0-9]+)\(/gm; let m; while ((m = re.exec(src))) publicFns.push([m[1], f, src]); });
const PAGE = ['doGet', 'submitEval', 'saveDraft', 'submitLinks', 'onOpen'];
publicFns.forEach(([fn, f, src]) => {
  if (PAGE.indexOf(fn) >= 0) return;
  const body = src.slice(src.indexOf('function ' + fn + '('), src.indexOf('\n}', src.indexOf('function ' + fn + '(')));
  ok(/requireOwner_\(\)/.test(body), 'public function ' + fn + ' (' + f + ') starts with the admin check');
});
console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
