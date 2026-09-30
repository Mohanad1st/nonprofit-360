/**
 * nonprofit-360 — the sheet menu, the setup wizard, the checks and the publishing guide.
 * ORG_SEED is empty in the public file. When Claude Code builds an organisation's own copy it fills ORG_SEED
 * with that organisation's settings and team (from its private org/ folder), and the setup writes them into the tabs.
 */
var ORG_SEED = null;

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var ready = !!sheet_('SETTINGS');
  if (!ready) {
    ui.createMenu('360').addItem(tr_('en', 'menu.start') + ' · ' + tr_('ar', 'menu.start'), 'openSetup').addToUi();
    return;
  }
  ui.createMenu(t_('menu.title'))
    .addItem(t_('menu.setup'), 'openSetup')
    .addItem(t_('menu.check'), 'checkSetup')
    .addItem(t_('menu.askManagers'), 'askManagers')
    .addItem(t_('menu.pairs'), 'makePairings')
    .addItem(t_('menu.publish'), 'publishGuide')
    .addSeparator()
    .addItem(t_('menu.preview'), 'sendMyPreview')
    .addItem(t_('menu.invite'), 'sendInvitations')
    .addSeparator()
    .addItem(t_('menu.update'), 'updateResults')
    .addItem(t_('menu.remind'), 'sendReminders')
    .addItem(t_('menu.reports'), 'makeReports')
    .addItem(t_('menu.paper'), 'makePaperForms')
    .addItem(t_('menu.paperEntry'), 'enterPaperAnswers')
    .addSeparator()
    .addItem(t_('menu.followUp'), 'followUpActions')
    .addSeparator()
    .addItem(t_('menu.testRun'), 'runTest')
    .addItem(t_('menu.testClear'), 'clearTest')
    .addSeparator()
    .addItem(t_('menu.newRound'), 'newRound')
    .addToUi();
}

/**
 * A new round (next year, or in a copy of this sheet): clears answers, drafts, review decisions, pairings and results,
 * and keeps the team, links, questions and settings. Asks first.
 */
function newRound() {
  requireOwner_();
  var ui = SpreadsheetApp.getUi();
  if (ui.alert(t_('round.confirm'), ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  ['RESPONSES', 'DRAFTS', 'DECISIONS', 'ASSIGN'].forEach(function (id) {
    var sh = sheet_(id); if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(1, sh.getLastColumn())).clearContent();
  });
  ['PEOPLE', 'HEAT', 'DEPTS', 'FLAGS', 'COMPLETION', 'STARS', 'BLAME', 'SUMMARY', 'ACCOUNT', 'DASH'].forEach(function (id) {
    var sh = sheet_(id); if (sh) { sh.clear(); try { sh.clearConditionalFormatRules(); sh.getCharts().forEach(function (c) { sh.removeChart(c); }); } catch (e) {} }
  });
  var props = PropertiesService.getScriptProperties();
  ['INVITED', 'REPORT_JOB', 'REPORT_JOB_TEST'].forEach(function (k) { props.deleteProperty(k); });
  // a copied sheet still holds last round's page address: keep it only if it is this sheet's own published page
  var own = ''; try { own = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  if (String(cfg_().PAGE_URL || '') !== own) setSetting_('PAGE_URL', '');
  rememberControlSheet_();
  ui.alert(t_('round.done'));
}

/** Opens the setup side panel. */
function openSetup() {
  requireOwner_();
  var html = HtmlService.createHtmlOutput(wizardHtml_()).setTitle('360');
  SpreadsheetApp.getUi().showSidebar(html);
}

/** What the wizard shows: current settings, and the defaults of both languages so switching language refills them. */
function wizardData_() {
  var c = cfg_(), me = '';
  try { me = lower_(Session.getActiveUser().getEmail()); } catch (e) {}
  var seed = ORG_SEED && ORG_SEED.settings ? ORG_SEED.settings : {};
  var cur = {};
  SETTINGS.forEach(function (s) { var v = c[s[0]]; cur[s[0]] = v instanceof Date ? Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') : (v == null ? '' : v); });
  Object.keys(seed).forEach(function (k) { if (cur[k] === '' || cur[k] == null || !sheet_('SETTINGS')) cur[k] = seed[k]; });
  if (!cur.ADMIN_EMAIL) cur.ADMIN_EMAIL = me;
  var defaults = {}, labels = {};
  ['en', 'ar'].forEach(function (L) {
    defaults[L] = {}; labels[L] = {};
    Object.keys(SETTING_DEFAULT_KEY).forEach(function (k) { defaults[L][k] = tr_(L, SETTING_DEFAULT_KEY[k]); });
    Object.keys(STR_EN).forEach(function (k) { if (k.indexOf('wiz.') === 0 || k.indexOf('set.') === 0) labels[L][k] = tr_(L, k); });
  });
  var teamEmpty = !sheet_('TEAM') || sheet_('TEAM').getLastRow() < 2;
  return { cur: cur, defaults: defaults, labels: labels, lang: sheet_('SETTINGS') ? (c.LANGUAGE === 'ar' ? 'ar' : 'en') : (seed.LANGUAGE === 'ar' ? 'ar' : 'en'),
    teamEmpty: teamEmpty, hasSeed: !!(ORG_SEED && ORG_SEED.team && ORG_SEED.team.length), fresh: !sheet_('SETTINGS') };
}

/** Saves the wizard and builds every tab. Returns a plain message. */
function wizardSave(form) {
  requireOwner_();
  form = form || {};
  var L = form.LANGUAGE === 'ar' ? 'ar' : 'en';
  return withLang_(L, function () {
    var ss = book_();
    var sh = sheet_('SETTINGS', true);
    var old = {};
    if (sh.getLastRow() > 0) sh.getRange(1, 1, sh.getLastRow(), 3).getValues().forEach(function (r) { old[String(r[0])] = r[2]; });
    sh.clear();
    var rows = [[t_('col.settings.id'), t_('col.settings.name'), t_('col.settings.value'), t_('col.settings.help')]];
    var seed = ORG_SEED && ORG_SEED.settings ? ORG_SEED.settings : {};
    SETTINGS.forEach(function (s) {
      // the side panel's value, else what the sheet already had, else what was prepared with Claude Code, else the default
      var id = s[0], v = form.hasOwnProperty(id) ? form[id] : old.hasOwnProperty(id) ? old[id] : seed.hasOwnProperty(id) ? seed[id] : s[1];
      if (id === 'LANGUAGE') v = L;
      if (s[2] === 'number' && v !== '' && toNumber_(v) == null) v = s[1];
      rows.push([id, t_('set.' + id), v, t_('set.' + id + '.help')]);
    });
    sh.getRange(1, 1, rows.length, 4).setValues(rows).setWrap(true).setVerticalAlignment('top');
    headerStyle_(sh.getRange(1, 1, 1, 4)); sh.setFrozenRows(1);
    sh.getRange(2, 1, rows.length - 1, 1).setFontColor('#8a97a3').setFontSize(8);
    sh.setColumnWidth(1, 90); sh.setColumnWidth(2, 220); sh.setColumnWidth(3, 260); sh.setColumnWidth(4, 420);
    try { if (form.TIME_ZONE) ss.setSpreadsheetTimeZone(form.TIME_ZONE); } catch (e) {}
    resetCfg_(); __LANG_OVERRIDE = L;
    rememberControlSheet_();
    buildTabs_(form.loadExample === true);
    var renamed = renameTabs_();
    try { onOpen(); } catch (e) { /* run from the script editor: no menu to refresh */ }
    return t_('wiz.saved') + (renamed ? ' ' + t_('wiz.renamed') : '');
  });
}

/** Creates the tabs the organisation fills (never overwrites what is already written). */
function buildTabs_(loadExample) {
  var seed = ORG_SEED || {};
  guideTab_();
  var team = sheet_('TEAM', true);
  if (team.getLastRow() < 2) {
    team.clear();
    var head = cols_('team', TEAM_COLS);
    var rows = seed.team && seed.team.length ? seed.team : (loadExample ? exampleTeamRows_() : []);
    writeHeader_(team, head);
    if (rows.length) team.getRange(2, 1, rows.length, head.length).setValues(safeRows_(rows.map(function (r) { return fit_(r, head.length); })));
    team.getRange(1, 1).setNote(t_('note.team'));
    team.setColumnWidths(1, head.length, 150);
  }
  var links = sheet_('LINKS', true);
  if (links.getLastRow() < 2) {
    links.clear();
    var lh = cols_('links', ['rater', 'ratee', 'reason', 'both', 'note']);
    writeHeader_(links, lh);
    var lrows = seed.links && seed.links.length ? seed.links : (loadExample ? exampleLinks_(lang_()).map(function (l) {
      var names = {}; exampleTeam_(lang_()).forEach(function (p) { names[p.email] = p.name; });
      var show = function (e) { return isNoEmail_(e) ? names[e] : e; };
      return [show(l.rater), show(l.ratee), l.reason, l.both ? t_('word.yes') : t_('word.no'), ''];
    }) : []);
    lrows = lrows.map(function (r) { return fit_(r, lh.length); });
    if (lrows.length) links.getRange(2, 1, lrows.length, lh.length).setValues(safeRows_(lrows));
    links.getRange(1, 1).setNote(t_('note.links'));
    links.setColumnWidths(1, lh.length, 190);
  }
  var never = sheet_('NEVER', true);
  if (never.getLastRow() < 1) {
    writeHeader_(never, cols_('never', ['a', 'b', 'note']));
    if (seed.never && seed.never.length) never.getRange(2, 1, seed.never.length, 3).setValues(safeRows_(seed.never.map(function (r) { return fit_(r, 3); })));
    never.getRange(1, 1).setNote(t_('note.never'));
  }
  var dl = sheet_('DEPTLINKS', true);
  if (dl.getLastRow() < 1) {
    writeHeader_(dl, cols_('deptlinks', ['dept', 'rates']));
    if (seed.deptLinks && seed.deptLinks.length) dl.getRange(2, 1, seed.deptLinks.length, 2).setValues(safeRows_(seed.deptLinks.map(function (r) { return fit_(r, 2); })));
    dl.getRange(1, 1).setNote(t_('note.deptlinks'));
  }
  if (!sheet_('QUESTIONS') || sheet_('QUESTIONS').getLastRow() < 2) {
    resetBank_();
    writeQuestionsTab_(seed.questions ? seedBank_(seed.questions) : defaultBank_(lang_(), true));
    resetBank_();
  } else { addMissingRoleRows_(); resetBank_(); }
  readDecisions_();
  responsesSheet_();
  draftSheet_();
  var yn = SpreadsheetApp.newDataValidation().requireValueInList([t_('word.yes'), t_('word.no')], true).setAllowInvalid(true).build();
  sheet_('TEAM').getRange(2, 6, 300, 1).setDataValidation(yn);
  sheet_('LINKS').getRange(2, 4, 500, 1).setDataValidation(yn);
  var dec = SpreadsheetApp.newDataValidation().requireValueInList([t_('word.keep'), t_('word.exclude')], true).setAllowInvalid(true).build();
  sheet_('DECISIONS').getRange(2, 3, 500, 1).setDataValidation(dec);
  [sheet_('RESPONSES'), sheet_('DRAFTS')].forEach(function (s) { try { s.hideSheet(); } catch (e) {} });
  ['GUIDE', 'SETTINGS', 'TEAM', 'LINKS', 'NEVER', 'DEPTLINKS', 'QUESTIONS'].forEach(function (id, i) {
    try { book_().setActiveSheet(sheet_(id)); book_().moveActiveSheet(i + 1); } catch (e) {}
  });
  try { book_().setActiveSheet(sheet_('GUIDE')); } catch (e) {}
}
function fit_(r, n) { r = (r || []).slice(0, n); while (r.length < n) r.push(''); return r; }
function exampleTeamRows_() {
  return exampleTeam_(lang_()).map(function (p) { return [p.name, isNoEmail_(p.email) ? '' : p.email, p.dept, p.title, p.manager, t_('word.yes'), isNoEmail_(p.email) ? t_('note.paperPerson') : '']; });
}
/** Seed questions arrive as rows [code, section, question, help, required, depts, in use]. Role questions start off unless marked in use. */
function seedBank_(rows) {
  var out = {}; SECTIONS.forEach(function (s) { out[s] = []; });
  var seen = {};
  rows.forEach(function (r) {
    var id = String(r[0] || '').trim().toUpperCase(), sec = sectionOf_(r[1]);
    if (!sec || seen[id] || !/^[A-Z][A-Z0-9_]{0,15}$/.test(id)) return;
    var off = no_(r[6]) || (sec === 'ROLE' && !yes_(r[6]));
    seen[id] = 1; out[sec].push(makeQuestion_(sec, [id, r[2], r[3], r[4], r[5], off ? 'off' : '']));
  });
  return out.CORE.length ? out : defaultBank_(lang_(), true);
}
/** Sheets set up before the role questions existed get the ready-made ones added, switched off. */
function addMissingRoleRows_() {
  var sh = sheet_('QUESTIONS'); if (!sh || sh.getLastRow() < 2) return;
  var have = {}; sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { have[String(r[0]).trim().toUpperCase()] = 1; });
  var rows = defaultBank_(lang_(), true).ROLE.filter(function (q) { return !have[q.id]; }).map(function (q) {
    return [q.id, t_('section.ROLE'), q.title, q.help, t_('word.yes'), (q.depts || []).join(', '), t_('word.no')];
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(safeRows_(rows));
}
/** After a language change, tabs take their names in the new language. */
function renameTabs_() {
  var n = 0;
  TABS.forEach(function (id) {
    var sh = sheet_(id); if (!sh) return;
    var want = tabName_(id);
    if (sh.getName() !== want && !book_().getSheetByName(want)) { sh.setName(want); n++; }
    dirSheet_(sh);
  });
  return n;
}
function guideTab_() {
  var g = sheet_('GUIDE', true);
  g.clear();
  var lines = [[t_('guide.title', { org: orgName_() })], [t_('guide.private')], ['']];
  for (var i = 1; i <= 13; i++) { var s = t_('guide.step' + i); if (s !== 'guide.step' + i) lines.push([s]); }
  lines.push(['']); lines.push([t_('guide.help')]);
  g.getRange(1, 1, lines.length, 1).setValues(lines).setWrap(true);
  g.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor(colors_().primary);
  g.getRange(2, 1).setFontColor('#b00020').setFontWeight('bold');
  g.setColumnWidth(1, 900);
}

/** Checks the team, the links and the settings, and explains any problem in plain words. */
function checkSetup() {
  requireOwner_();
  var team = readTeam_();
  var res = checkOrg_(team, readLinks_(team), readNever_(team), readDeptLinks_(),
    { admin: cfg_().ADMIN_EMAIL, deadline: cfg_().DEADLINE, minGroup: Number(cfg_().MIN_GROUP), assignOpts: assignOpts_() });
  var errs = res.filter(function (x) { return x.level === 'error'; }), warns = res.filter(function (x) { return x.level === 'warn'; });
  var msg = !res.length ? t_('check.allGood', { n: res.assignments.length })
    : (errs.length ? t_('check.errorsTitle', { n: errs.length }) + '\n• ' + errs.map(function (x) { return x.msg; }).join('\n• ') + '\n\n' : '') +
      (warns.length ? t_('check.warnsTitle', { n: warns.length }) + '\n• ' + warns.map(function (x) { return x.msg; }).join('\n• ') : '') +
      (errs.length ? '' : '\n\n' + t_('check.canPair', { n: res.assignments.length }));
  uiAlert_(msg);
  return res;
}

/** Makes the list of who rates whom, with the reason for every pair. */
function makePairings() {
  requireOwner_();
  var ui = SpreadsheetApp.getUi();
  var team = readTeam_(), links = readLinks_(team), never = readNever_(team);
  var res = checkOrg_(team, links, never, readDeptLinks_(), { assignOpts: assignOpts_(), minGroup: Number(cfg_().MIN_GROUP) });
  var errs = res.filter(function (x) { return x.level === 'error'; });
  if (errs.length) { ui.alert(t_('check.errorsTitle', { n: errs.length }) + '\n• ' + errs.map(function (x) { return x.msg; }).join('\n• ')); return; }
  var sh = sheet_('ASSIGN');
  if (sh && sh.getLastRow() > 1 && ui.alert(t_('pairs.replace'), ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var byEmail = indexTeam_(team.filter(function (p) { return p.active !== false; }));
  writeAssignments_(res.assignments, byEmail);
  ui.alert(t_('pairs.done', { n: res.assignments.length }));
}

/** Step-by-step help for publishing the personal page (only a person can press these buttons in Google). */
function publishGuide() {
  requireOwner_();
  var url = portalUrl_();
  var html = '<div dir="' + (isRtl_() ? 'rtl' : 'ltr') + '" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">' +
    '<ol>' + [1, 2, 3, 4, 5, 6].map(function (i) { return '<li>' + esc_(t_('publish.step' + i)) + '</li>'; }).join('') + '</ol>' +
    '<p><b>' + esc_(t_('publish.current')) + '</b> ' + (url ? '<a target="_blank" href="' + esc_(url) + '">' + esc_(url) + '</a>' : esc_(t_('publish.none'))) + '</p>' +
    '<p>' + esc_(t_('publish.paste')) + '</p><input id="u" style="width:100%" placeholder="https://script.google.com/.../exec">' +
    '<p><button onclick="google.script.run.withSuccessHandler(function(m){document.getElementById(\'m\').textContent=m}).savePageUrl(document.getElementById(\'u\').value)">' +
    esc_(t_('publish.save')) + '</button> <span id="m"></span></p></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(520), t_('menu.publish'));
}
function savePageUrl(u) {
  requireOwner_();
  u = String(u || '').trim();
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) return t_('publish.bad');
  setSetting_('PAGE_URL', u);
  return t_('publish.saved');
}
/** Writes one setting into the Settings tab. */
function setSetting_(id, value) {
  var sh = sheet_('SETTINGS', true), data = sh.getLastRow() ? sh.getRange(1, 1, sh.getLastRow(), 1).getValues() : [];
  for (var i = 0; i < data.length; i++) if (String(data[i][0]) === id) { sh.getRange(i + 1, 3).setValue(value); resetCfg_(); return; }
  sh.appendRow([id, t_('set.' + id), value, t_('set.' + id + '.help')]); resetCfg_();
}
/** The personal page address: the saved one, else the one Google reports (never the owner-only /dev address). */
function portalUrl_() {
  var u = String(cfg_().PAGE_URL || '').trim();
  if (/^https:\/\/script\.google\.com\/[^\s"'<>]+\/exec$/.test(u)) return u;
  try { var g = ScriptApp.getService().getUrl() || ''; return /\/exec$/.test(g) ? g : ''; } catch (e) { return ''; }
}
function uiAlert_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function wizardHtml_() {
  var data = JSON.stringify(wizardData_()).replace(/</g, '\\u003c');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:13px;margin:10px;color:#14283a}label{display:block;font-weight:bold;margin:10px 0 2px}' +
    'input,select,textarea{width:100%;box-sizing:border-box;padding:6px;border:1px solid #c9d6e2;border-radius:6px;font:inherit}' +
    '.h{color:#5b6b7a;font-size:12px;margin:2px 0}.row{display:flex;gap:6px}.row>*{flex:1}' +
    'button{background:#1f5f8b;color:#fff;border:0;border-radius:8px;padding:10px;width:100%;font-weight:bold;margin-top:14px;cursor:pointer}' +
    'h3{margin:14px 0 4px;color:#1f5f8b}.msg{margin-top:10px;padding:8px;border-radius:6px;background:#eef5fa}</style></head><body><div id="w"></div><script>' +
    'var D=' + data + ';' +
    'var F=["ORG_NAME","CYCLE_NAME","DEADLINE","ADMIN_EMAIL","SIGNATURE","TAGLINE","LOGO","COLOR_PRIMARY","COLOR_ACCENT","VALUE_1_NAME","VALUE_1_TEXT","VALUE_2_NAME","VALUE_2_TEXT","VALUE_3_NAME","VALUE_3_TEXT","VALUE_4_NAME","VALUE_4_TEXT","ORG_TARGETS","TIME_ZONE"];' +
    'var V=Object.assign({},D.cur);function T(k){return (D.labels[D.lang]||{})[k]||(D.labels.en||{})[k]||k;}' +
    'function draw(){var w=document.getElementById("w");document.body.dir=D.lang==="ar"?"rtl":"ltr";var h="<h3>"+T("wiz.title")+"</h3><div class=h>"+T("wiz.intro")+"</div>";' +
    'h+="<label>"+T("set.LANGUAGE")+"</label><select id=LANGUAGE><option value=en>English</option><option value=ar>العربية</option></select>";' + // i18n-ok: reads both languages
    'F.forEach(function(k){if(k==="VALUE_1_NAME")h+="<h3>"+T("wiz.values")+"</h3><div class=h>"+T("wiz.valuesHelp")+"</div>";' +
    'var v=V[k];if((v===""||v==null)&&D.defaults[D.lang][k]!=null)v=D.defaults[D.lang][k];var type=k==="DEADLINE"?"date":k.indexOf("COLOR")===0?"color":"text";' +
    'h+="<label>"+T("set."+k)+"</label><div class=h>"+T("set."+k+".help")+"</div>"+(k.indexOf("_TEXT")>0||k==="ORG_TARGETS"?"<textarea id="+k+" rows=2></textarea>":"<input id="+k+" type="+type+">");V[k]=v;});' +
    'if(D.teamEmpty&&!D.hasSeed)h+="<label><input type=checkbox id=ex style=width:auto> "+T("wiz.example")+"</label>";' +
    'if(D.hasSeed)h+="<div class=msg>"+T("wiz.seed")+"</div>";' +
    'h+="<button id=go>"+T("wiz.save")+"</button><div id=m></div>";w.innerHTML=h;' +
    'document.getElementById("LANGUAGE").value=D.lang;F.forEach(function(k){document.getElementById(k).value=V[k]==null?"":V[k];});' +
    'document.getElementById("LANGUAGE").onchange=function(){F.forEach(function(k){var x=document.getElementById(k).value;var o=D.defaults[D.lang][k];V[k]=(o!=null&&x===o)?"":x;});D.lang=this.value;draw();};' +
    'document.getElementById("go").onclick=function(){var o={LANGUAGE:D.lang};F.forEach(function(k){o[k]=document.getElementById(k).value;});var ex=document.getElementById("ex");o.loadExample=!!(ex&&ex.checked);' +
    'this.disabled=true;this.textContent=T("wiz.saving");var b=this;google.script.run.withSuccessHandler(function(msg){b.disabled=false;b.textContent=T("wiz.save");var d=document.createElement("div");d.className="msg";d.textContent=msg;var m=document.getElementById("m");m.innerHTML="";m.appendChild(d);})' +
    '.withFailureHandler(function(e){b.disabled=false;b.textContent=T("wiz.save");var d=document.createElement("div");d.className="msg";d.textContent=e.message;var m=document.getElementById("m");m.innerHTML="";m.appendChild(d);}).wizardSave(o);};}' +
    'draw();</script></body></html>';
}
