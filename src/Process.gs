/**
 * nonprofit-360 — results tabs, the dashboard, invitations and reminders.
 * Everything written here is for the admin only. Nothing is sent or shared without the admin pressing a button and confirming.
 */
var SEV_ORDER = { HIGH: 0, MED: 1, LOW: 2 };
var PERSON_FLAGS = ['BLAME_PATTERN', 'BLIND_SPOT', 'LOW_RESPONSIVENESS', 'LOW_COMPLETION', 'NO_FOLLOW_UP', 'NO_EXPECTATIONS'];
var RATER_FLAGS = ['STRAIGHT_LINE', 'OUTLIER', 'MUTUAL_HIGH', 'UNASSIGNED', 'COPIED_EVIDENCE'];

function analyzeNow_() {
  var team = readTeam_();
  return analyze_(team, readAssignments_(), readRecords_(), readDecisions_(), analysisCfg_());
}

/** Update results: progress, flags, people, departments, dashboard. */
function updateResults() {
  requireOwner_();
  var R = analyzeNow_();
  writeResults_(R, false);
  markAssignmentsDone_(R);
  uiAlert_(t_('results.updated'));
  return R;
}
function markAssignmentsDone_(R) {
  var sh = sheet_('ASSIGN'); if (!sh || sh.getLastRow() < 2) return;
  var done = {};
  Object.keys(R.persons).forEach(function (e) { R.persons[e].ratings.concat(R.persons[e].excluded).forEach(function (x) { done[x.rater + '>' + e] = 1; }); });
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  sh.getRange(2, 7, vals.length, 1).setValues(vals.map(function (r) { return [done[lower_(r[0]) + '>' + lower_(r[2])] ? t_('word.yes') : '']; }));
}

function name_(R, email) { return R.persons[email] ? R.persons[email].name : email; }
function v_(x) { return x == null ? '' : x; }
function titles_(ids) { return ids.map(titleOf_).join(', '); }
function writeTab_(id, rows, isTest, widths) {
  var sh = sheet_(id, true);
  sh.clear(); try { sh.clearConditionalFormatRules(); sh.getCharts().forEach(function (c) { sh.removeChart(c); }); } catch (e) {}
  var banner = isTest ? t_('results.testBanner') : t_('results.banner', { date: Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm') });
  var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
  var all = [[banner].concat(new Array(width - 1).fill(''))].concat(rows.map(function (r) { return r.concat(new Array(width - r.length).fill('')); }));
  sh.getRange(1, 1, all.length, width).setValues(safeRows_(all));
  sh.getRange(1, 1).setFontWeight('bold').setFontColor(isTest ? '#e65100' : '#b00020');
  if (rows.length) headerStyle_(sh.getRange(2, 1, 1, width));
  sh.setFrozenRows(2);
  (widths || []).forEach(function (w, i) { if (w) sh.setColumnWidth(i + 1, w); });
  return sh;
}
function colorScale_(range) {
  var rule = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#e67c73', SpreadsheetApp.InterpolationType.NUMBER, '1')
    .setGradientMidpointWithValue('#ffd666', SpreadsheetApp.InterpolationType.NUMBER, '3')
    .setGradientMaxpointWithValue('#57bb8a', SpreadsheetApp.InterpolationType.NUMBER, '5')
    .setRanges([range]).build();
  var sh = range.getSheet();
  sh.setConditionalFormatRules(sh.getConditionalFormatRules().concat([rule]));
}
function flagName_(type) { return t_('flagName.' + type); }
function sevName_(s) { return t_('sev.' + s); }
function ansLabel_(code) { return code ? t_('ans.' + code) : ''; }

function writeResults_(R, isTest) {
  var P = R.persons, B = Q_(), C = t_;
  var emails = Object.keys(P).sort(function (a, b) { return (P[a].dept + P[a].name) < (P[b].dept + P[b].name) ? -1 : 1; });
  var yes = C('word.yes'), no = C('word.no'), min = Number(cfg_().MIN_GROUP);

  // progress
  var c = [cols_('completion', ['name', 'dept', 'self', 'assigned', 'done', 'pct', 'deptForms', 'pending'])];
  R.completion.slice().sort(function (a, b) { return (a.pct || 0) - (b.pct || 0); }).forEach(function (x) {
    c.push([x.name, x.dept, x.self ? yes : no, x.assigned, x.done, x.pct == null ? '' : Math.round(x.pct * 100) + '%', x.deptForms, (x.pending || []).join(', ')]);
  });
  writeTab_('COMPLETION', c, isTest, [150, 130, 90, 90, 80, 80, 90, 420]);

  // flags (with rater names — admin only). The two email columns can be copied into «Review decisions».
  var f = [cols_('flags', ['sev', 'type', 'person', 'rater', 'detail', 'raterEmail', 'personEmail'])];
  R.flags.slice().sort(function (a, b) { return SEV_ORDER[a.severity] - SEV_ORDER[b.severity]; }).forEach(function (x) {
    f.push([sevName_(x.severity), flagName_(x.type), x.person ? name_(R, x.person) : '', x.about, x.detail, x.rater, x.rater ? x.person : '']);
  });
  writeTab_('FLAGS', f, isTest, [70, 200, 150, 150, 520, 220, 220]);

  // people
  var rows = [cols_('people', ['name', 'dept', 'manages', 'raters', 'head', 'team', 'peers', 'others', 'self', 'gap', 'lead', 'strengths', 'dev', 'blind', 'releasable'])];
  emails.forEach(function (e) {
    var p = P[e];
    rows.push([p.name, p.dept, p.isHead ? yes : '', p.nRaters, p.nByGroup.HEAD, p.nByGroup.TEAM, p.nByGroup.PEERS,
      v_(p.coreOthers), v_(p.coreSelf), p.coreSelf != null && p.coreOthers != null ? round2_(p.coreSelf - p.coreOthers) : '',
      v_(p.leadTeam), titles_(p.strengths), titles_(p.devAreas), titles_(p.blindOver), p.releasable ? yes : C('results.notReleasable', { n: min })]);
  });
  var sh = writeTab_('PEOPLE', rows, isTest, [150, 130]);
  if (rows.length > 1) { colorScale_(sh.getRange(3, 8, rows.length - 1, 2)); colorScale_(sh.getRange(3, 11, rows.length - 1, 1)); }

  // heat map
  var heat = [[C('col.people.name'), C('col.people.dept')].concat(B.CORE.map(function (q) { return q.title; }), [C('results.leadAvg')])];
  emails.forEach(function (e) { heat.push([P[e].name, P[e].dept].concat(B.CORE.map(function (q) { return v_(P[e].scores[q.id].others); }), [v_(P[e].leadOthers)])); });
  var hs = writeTab_('HEAT', heat, isTest, [150, 130]);
  if (heat.length > 1) colorScale_(hs.getRange(3, 3, heat.length - 1, B.CORE.length + 1));

  // departments
  var d = [[C('col.people.dept'), C('results.members'), C('results.seenByOthers')].concat(B.DEPT.map(function (q) { return q.title; }), B.CORE.map(function (q) { return C('results.membersOn', { item: q.title }); }))];
  R.deptSummary.forEach(function (s) { d.push([s.dept, s.members, v_(s.received)].concat(B.DEPT.map(function (q) { return v_(s.perItem[q.id]); }), B.CORE.map(function (q) { return v_(s.coreAvg[q.id]); }))); });
  d.push([]); d.push([C('results.matrix')].concat(R.depts));
  R.depts.forEach(function (a) { d.push([a].concat(R.depts.map(function (b) { return a === b ? '—' : v_(R.deptMatrix[a][b]); }))); });
  var ds = writeTab_('DEPTS', d, isTest, [160]);
  if (R.deptSummary.length) colorScale_(ds.getRange(3, 3, R.deptSummary.length, 1 + B.DEPT.length + B.CORE.length));
  if (R.depts.length) colorScale_(ds.getRange(3 + R.deptSummary.length + 2, 2, R.depts.length, R.depts.length));

  // one-line summary per person — a first indication, never a decision
  var flagsAbout = {}, flagsBy = {};
  R.flags.forEach(function (x) {
    if (x.person && PERSON_FLAGS.indexOf(x.type) >= 0 && (flagsAbout[x.person] || []).indexOf(x.type) < 0) (flagsAbout[x.person] = flagsAbout[x.person] || []).push(x.type);
    if (x.rater && RATER_FLAGS.indexOf(x.type) >= 0) flagsBy[x.rater] = (flagsBy[x.rater] || 0) + 1;
  });
  var comp = {}; R.completion.forEach(function (x) { comp[x.email] = x; });
  var ct = [cols_('summary', ['name', 'dept', 'title', 'raters', 'excluded', 'others', 'self', 'lead', 'recog', 'x1', 'set', 'completion', 'flags', 'doubtful', 'band', 'kpi', 'decision'])];
  emails.forEach(function (e) {
    var p = P[e], cc = comp[e], about = flagsAbout[e] || [];
    var band = p.nRaters < min ? C('band.notEnough')
      : (about.indexOf('BLAME_PATTERN') >= 0 || about.indexOf('NO_FOLLOW_UP') >= 0 || (p.coreOthers != null && p.coreOthers < 3)) ? C('band.review')
      : (p.coreOthers >= 4 ? C('band.strong') : C('band.ok'));
    var set = [p.expected.headSet && C('results.byManager', { a: ansLabel_(p.expected.headSet) }), p.expected.memberSet && C('results.byThem', { a: ansLabel_(p.expected.memberSet) })].filter(Boolean).join(' · ');
    ct.push([p.name, p.dept, p.title || '', p.nRaters, p.nExcluded || 0, v_(p.coreOthers), v_(p.coreSelf), v_(p.leadTeam),
      p.recogFrom.length, v_(p.scores.X1 ? p.scores.X1.head : null), set, cc ? Math.round((cc.pct || 0) * 100) + '%' : C('results.paper'),
      about.map(flagName_).join(', '), flagsBy[e] || 0, band, '', '']);
  });
  var cs = writeTab_('SUMMARY', ct, isTest, [150, 130, 150]);
  if (ct.length > 1) { colorScale_(cs.getRange(3, 6, ct.length - 1, 1)); colorScale_(cs.getRange(3, 8, ct.length - 1, 1)); }

  // recognition
  var s = [cols_('stars', ['name', 'dept', 'recog', 'others', 'self', 'humble', 'hidden', 'why'])];
  R.stars.forEach(function (x) { s.push([x.name, x.dept, x.recogCount, v_(x.others), v_(x.self), x.humble ? yes : '', x.hidden ? '★ ' + yes : '', x.why.join(' | ')]); });
  writeTab_('STARS', s, isTest, [150, 130, 90, 90, 90, 80, 90, 500]);

  // managers: how they see their team, and how the team sees them
  var b = [cols_('blame', ['head', 'dept', 'size', 'headView', 'othersView', 'gap', 'teamLead', 'teamResp', 'peerComm', 'selfLead', 'noFollow', 'noSet', 'pattern'])];
  R.blame.forEach(function (x) {
    b.push([x.name, x.dept, x.teamSize, v_(x.headViewOfTeam), v_(x.othersViewOfTeam), v_(x.gap), v_(x.teamViewOfLeadership),
      v_(x.teamViewOfResponsibility), v_(x.peersViewOfCommunication), v_(x.selfLeadership), x.noFollowUp || 0, x.noExpectations || 0, x.pattern ? C('results.patternYes') : '']);
  });
  var bs = writeTab_('BLAME', b, isTest, [150, 130]);
  if (R.blame.length) { colorScale_(bs.getRange(3, 4, R.blame.length, 2)); colorScale_(bs.getRange(3, 7, R.blame.length, 4)); }

  // manager accountability, member by member
  var ac = [cols_('account', ['head', 'member', 'low', 'which', 'setHead', 'setMember', 'disc', 'told', 'did', 'mine', 'help', 'noFollow'])];
  emails.forEach(function (h) {
    (P[h].managing || []).forEach(function (m) {
      ac.push([P[h].name, m.name, m.low, m.lowTitles.join(', '), ansLabel_(m.set), ansLabel_(m.memberSet), ansLabel_(m.disc), ansLabel_(m.memberTold), m.did, m.mine, m.memberHelp, m.noFollowUp ? '⚠ ' + yes : '']);
    });
  });
  writeTab_('ACCOUNT', ac, isTest, [140, 140, 80, 220, 110, 110, 130, 130, 300, 260, 260, 90]);

  // dashboard with charts
  var od = orgChartData_(R), dash = [[C('dash.item'), C('dash.selfAvg'), C('dash.othersAvg')]];
  od.items.forEach(function (t, i) { dash.push([t, v_(od.self[i]), v_(od.others[i])]); });
  var d2 = dash.length + 2; dash.push([]); dash.push([C('col.people.dept'), C('dash.seenByOthers'), C('dash.peopleAvg'), C('dash.completion')]);
  od.depts.forEach(function (x, i) { dash.push([x, v_(od.deptReceived[i]), v_(od.deptPeople[i]), v_(od.deptCompletion[i])]); });
  var db = writeTab_('DASH', dash, isTest, [220, 150, 150, 150]);
  try {
    var col = colors_(), n1 = od.items.length, n2 = od.depts.length;
    db.insertChart(db.newChart().setChartType(Charts.ChartType.BAR).addRange(db.getRange(2, 1, n1 + 1, 3)).setNumHeaders(1)
      .setPosition(2, 6, 0, 0).setOption('title', C('dash.chart1')).setOption('hAxis', { minValue: 0, maxValue: 5 })
      .setOption('colors', [col.accent, col.primary]).setOption('width', 620).setOption('height', 420).build());
    if (n2) {
      db.insertChart(db.newChart().setChartType(Charts.ChartType.BAR).addRange(db.getRange(d2 + 1, 1, n2 + 1, 3)).setNumHeaders(1)
        .setPosition(24, 6, 0, 0).setOption('title', C('dash.chart2')).setOption('hAxis', { minValue: 0, maxValue: 5 })
        .setOption('colors', [col.primary, '#9aa9b6']).setOption('width', 620).setOption('height', 360).build());
      db.insertChart(db.newChart().setChartType(Charts.ChartType.COLUMN).addRange(db.getRange(d2 + 1, 1, n2 + 1, 1)).addRange(db.getRange(d2 + 1, 4, n2 + 1, 1)).setNumHeaders(1)
        .setPosition(44, 6, 0, 0).setOption('title', C('dash.chart3')).setOption('vAxis', { minValue: 0, maxValue: 100 })
        .setOption('colors', [col.accent]).setOption('width', 620).setOption('height', 320).build());
    }
  } catch (e) { Logger.log('dashboard charts: ' + e); }
}

/** Numbers for the organisation charts — the same in the dashboard tab and in the organisation report. */
function orgChartData_(R) {
  var P = R.persons, emails = Object.keys(P), B = Q_();
  function avg(fn) { return round2_(mean_(emails.map(fn).filter(function (v) { return v != null; }))); }
  var comp = {};
  (R.completion || []).forEach(function (c) { (comp[c.dept] = comp[c.dept] || []).push(c.pct || 0); });
  var ds = R.deptSummary.filter(function (s) { return s.members > 0; });
  return {
    items: B.CORE.map(function (q) { return q.title; }),
    others: B.CORE.map(function (q) { return avg(function (e) { return P[e].scores[q.id].others; }); }),
    self: B.CORE.map(function (q) { return avg(function (e) { return P[e].scores[q.id].self; }); }),
    depts: ds.map(function (s) { return s.dept; }),
    deptReceived: ds.map(function (s) { return s.received; }),
    deptPeople: ds.map(function (s) { return round2_(mean_(B.CORE.map(function (q) { return s.coreAvg[q.id]; }).filter(function (v) { return v != null; }))); }),
    deptCompletion: ds.map(function (s) { return comp[s.dept] ? Math.round(100 * mean_(comp[s.dept])) : null; })
  };
}

/** A full test with made-up people. It never touches real answers. */
function runTest() {
  requireOwner_();
  if (readRecords_().length) {
    var ui = null; try { ui = SpreadsheetApp.getUi(); } catch (e) {}
    if (ui && ui.alert(t_('test.confirmReal'), ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  }
  var R = analyze_(testTeam_(), testAssignments_(), testRecords_(), [], analysisCfg_());
  writeResults_(R, true);
  var res = makeReportsFrom_(R, true);
  uiAlert_(res.complete ? t_('test.done', { folder: res.folder.getName() }) : t_('reports.partial', { d: res.done, n: res.total, folder: res.folder.getName() }));
}
function clearTest() {
  requireOwner_();
  var it = parentFolder_().getFolders(), n = 0, prefix = t_('reports.testFolder');
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf(prefix) === 0) { f.setTrashed(true); n++; } }
  PropertiesService.getScriptProperties().deleteProperty('REPORT_JOB_TEST');
  ['PEOPLE', 'HEAT', 'DEPTS', 'FLAGS', 'COMPLETION', 'STARS', 'BLAME', 'SUMMARY', 'ACCOUNT', 'DASH'].forEach(function (id) {
    var sh = sheet_(id); if (sh) { sh.clear(); try { sh.clearConditionalFormatRules(); sh.getCharts().forEach(function (c) { sh.removeChart(c); }); } catch (e) {} }
  });
  uiAlert_(t_('test.cleared', { n: n }));
}

// ——— email ———
/** The logo as an image: a Drive file (link or id) or a web address. null when there is none. */
var __LOGO = undefined;
function logoBlob_() {
  if (__LOGO !== undefined) return __LOGO;
  __LOGO = null;
  var v = String(cfg_().LOGO || '').trim();
  try {
    var m = v.match(/[-\w]{25,}/);
    if (v && (/drive\.google\.com|docs\.google\.com/.test(v) || (m && m[0] === v))) __LOGO = DriveApp.getFileById(m[0]).getBlob();
    else if (/^https:\/\//.test(v)) __LOGO = UrlFetchApp.fetch(v).getBlob();
    if (__LOGO && (!/^image\//.test(String(__LOGO.getContentType() || '')) || __LOGO.getBytes().length > 900000)) __LOGO = null;
  } catch (e) { Logger.log('logo: ' + e); __LOGO = null; }
  return __LOGO;
}
function logoDataUri_() {
  var b = logoBlob_();
  return b ? 'data:' + (b.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(b.getBytes()) : '';
}
function emailTasks_(p, team) {
  var byEmail = indexTeam_(team), ctx = deptCtx_();
  var persons = readAssignments_().filter(function (a) { return a.rater === p.email && byEmail[a.ratee]; }).map(function (a) { return byEmail[a.ratee].name; });
  return { persons: persons, depts: linkedDepts_(p.dept, team, ctx.deptLinks, ctx.deptRatings) };
}
/** A message with one button — { text, html }. full = the first invitation (why, values, how); otherwise a short reminder. */
function oneButtonEmail_(p, intro, buttonLabel, url, full, tasks) {
  var C = t_, col = colors_(), dir = isRtl_() ? 'rtl' : 'ltr', align = isRtl_() ? 'right' : 'left';
  var dl = deadlineText_(), vals = full ? values_() : [], T = tasks || null;
  var lead = full ? [C('intro.why1', { period: C('default.period') }), C('intro.why2')] : [intro];
  var taskLines = T ? [C('email.taskSelf')]
    .concat(T.persons.length ? [C('email.taskPersons', { n: T.persons.length, names: T.persons.join(', ') })] : [])
    .concat(T.depts.length ? [C('email.taskDepts', { n: T.depts.length })] : []) : [];
  var steps = full ? [C('intro.step2'), C('intro.step3'), C('intro.autosave')] : [];
  var tasksTitle = dl ? C('email.tasksBy', { date: dl }) : C('email.tasks');
  var opening = C('intro.openingEmail', { cycle: setting_('CYCLE_NAME'), org: orgName_() }) + ' ' + C('intro.what360');
  var text = C('email.hello', { name: p.name }) + '\n\n' + (full ? opening + '\n\n' + C('intro.whyTitle') + '\n' : '') + lead.join('\n\n') + '\n\n' +
    (taskLines.length ? tasksTitle + '\n' + taskLines.map(function (t, i) { return (i + 1) + ') ' + t; }).join('\n') + '\n\n' : '') +
    C('email.openPage') + '\n' + url + '\n\n' +
    (vals.length ? C('intro.valuesTitle') + '\n' + vals.map(function (x) { return '• ' + x[0] + ': ' + x[1]; }).join('\n') + '\n\n' : '') +
    (steps.length ? C('intro.stepsTitle') + '\n' + steps.map(function (t) { return '- ' + t; }).join('\n') + '\n\n' : '') +
    (full ? '' : '🔒 ' + C('email.confidential') + '\n\n') + C('intro.closing') + '\n' + setting_('SIGNATURE');
  var H = function (t) { return '<p style="margin:16px 0 4px"><b style="color:' + col.primary + '">' + esc_(t) + '</b></p>'; };
  var pad = isRtl_() ? 'padding-right:22px;padding-left:0' : 'padding-left:22px;padding-right:0';
  var list = function (arr, small) { return '<ol style="margin:0 0 10px;' + pad + (small ? ';color:#33475b;font-size:14px' : '') + '">' + arr.map(function (t) { return '<li style="margin:3px 0">' + esc_(t) + '</li>'; }).join('') + '</ol>'; };
  var logo = logoBlob_();
  var html = '<div dir="' + dir + '" lang="' + lang_() + '" style="direction:' + dir + ';text-align:' + align + ';font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8;color:' + col.ink + ';max-width:600px;margin:0 auto">' +
    (logo ? '<div style="text-align:center;margin-bottom:6px"><img src="cid:orglogo" alt="' + esc_(orgName_()) + '" style="height:80px"></div>' : '<div style="text-align:center;font-weight:bold;font-size:18px;color:' + col.primary + '">' + esc_(orgName_()) + '</div>') +
    '<div style="text-align:center;color:' + col.primary + ';font-weight:bold;font-size:16px;margin-bottom:14px">' + esc_(setting_('TAGLINE')) + '</div>' +
    '<p style="margin:0 0 10px">' + esc_(C('email.hello', { name: p.name })) + '</p>' +
    (full ? '<p style="margin:0 0 10px">' + esc_(opening) + '</p>' + H(C('intro.whyTitle')) : '') +
    lead.map(function (t) { return '<p style="margin:0 0 10px">' + esc_(t) + '</p>'; }).join('') +
    (taskLines.length ? H(tasksTitle) + list(taskLines) : '') +
    '<p style="margin:22px 0 6px;text-align:center"><a href="' + esc_(url) + '" style="background:' + col.primary + ';color:#fff;text-decoration:none;padding:13px 30px;border-radius:8px;font-weight:bold;display:inline-block">' + esc_(buttonLabel) + '</a></p>' +
    '<p style="text-align:center;color:#5b6b7a;font-size:13px;margin:0 0 16px">' + esc_(C('email.openWith')) + (p.email ? ' (' + esc_(p.email) + ')' : '') + '</p>' +
    (vals.length ? H(C('intro.valuesTitle')) + '<div style="background:' + col.mist + ';border-radius:10px;padding:10px 16px;margin:0 0 12px">' +
      vals.map(function (x) { return '<div style="margin:4px 0"><b style="color:' + col.primary + '">' + esc_(x[0]) + ':</b> ' + esc_(x[1]) + '</div>'; }).join('') + '</div>' : '') +
    (steps.length ? H(C('intro.stepsTitle')) + list(steps, true) : '') +
    (full ? '' : '<p style="color:#5b6b7a;font-size:13px">🔒 ' + esc_(C('email.confidential')) + '</p>') +
    '<p>' + esc_(C('intro.closing')) + '<br>' + esc_(setting_('SIGNATURE')) + '</p></div>';
  return { text: text, html: html };
}
function invitationBody_(p, team) {
  var url = portalUrl_();
  if (!url) throw new Error(t_('err.noUrl'));
  return oneButtonEmail_(p, '', t_('email.button'), url, true, emailTasks_(p, team));
}
function send_(to, subject, body) {
  if (!/^[^@\s]+@[^@\s]+$/.test(String(to || '')) || isNoEmail_(to)) return false; // no account: paper
  var logo = logoBlob_();
  var opts = { htmlBody: body.html, name: orgName_() };
  if (logo) opts.inlineImages = { orglogo: logo };
  MailApp.sendEmail(to, subject, body.text, opts);
  return true;
}
function invitationTargets_(team) { return team.filter(function (p) { return p.active !== false && p.email && !isNoEmail_(p.email); }); }
/** Sends the invitation to the admin only, to see exactly what the team will receive. */
function sendMyPreview() {
  requireOwner_();
  rememberControlSheet_();
  var team = readTeam_(), byEmail = indexTeam_(team), me = byEmail[lower_(Session.getActiveUser().getEmail())];
  var target = me || { name: t_('email.previewName'), email: lower_(Session.getActiveUser().getEmail()), dept: '' };
  send_(target.email, t_('email.previewSubject', { org: orgName_() }), invitationBody_(target, team));
  Logger.log('invitations would go to ' + invitationTargets_(team).length + ' people'); // counts only: no names or emails in the logs
  uiAlert_(t_('email.previewSent'));
}
/** Sends the invitations to the team — asks for confirmation first. */
function sendInvitations() {
  requireOwner_();
  var ui = SpreadsheetApp.getUi(), team = readTeam_();
  if (!readAssignments_().length) { ui.alert(t_('err.noPairs')); return; }
  if (!portalUrl_()) { ui.alert(t_('err.noUrl')); return; }
  var left = invitationTargets_(team).filter(function (p) { return invitedList_().indexOf(p.email) < 0; });
  if (!left.length) { ui.alert(t_('email.allInvited')); return; }
  if (ui.alert(t_('email.confirmInvite', { n: left.length }), ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var res = sendInvitationsNow_(team);
  ui.alert(res.left ? t_('email.invitesPartial', { n: res.sent, left: res.left }) : t_('email.invitesSent', { n: res.sent }));
}
/** Who already received the invitation this round (so an interrupted send never emails anyone twice). */
function invitedList_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('INVITED') || '[]'); } catch (e) { return []; }
}
/**
 * Sends to everyone not yet invited, stopping safely before Google's daily email limit or the 6-minute run limit.
 * Returns { sent, left }: when something is left, choosing the menu again continues with the rest.
 */
function sendInvitationsNow_(team) {
  rememberControlSheet_();
  var props = PropertiesService.getScriptProperties(), done = invitedList_(), started = Date.now();
  var subject = t_('email.inviteSubject', { org: orgName_() }), sent = 0;
  var todo = invitationTargets_(team).filter(function (p) { return done.indexOf(p.email) < 0; });
  for (var i = 0; i < todo.length; i++) {
    var quota = 1; try { quota = MailApp.getRemainingDailyQuota(); } catch (e) {}
    if (quota < 1 || Date.now() - started > REPORT_BUDGET_MS) break;
    try { if (send_(todo[i].email, subject, invitationBody_(todo[i], team))) sent++; } catch (e) { Logger.log('invitation not sent: ' + e); break; }
    done.push(todo[i].email);
    props.setProperty('INVITED', JSON.stringify(done));
  }
  setSetting_('PAGE_URL', portalUrl_());
  return { sent: sent, left: todo.length - sent };
}
/** A friendly reminder to people who have not finished — asks for confirmation first. */
function sendReminders() {
  requireOwner_();
  var ui = SpreadsheetApp.getUi(), team = readTeam_();
  var R = analyze_(team, readAssignments_(), readRecords_(), readDecisions_(), analysisCfg_());
  var pending = R.completion.filter(function (c) { return (c.pct == null || c.pct < 1) && !isNoEmail_(c.email); });
  if (!pending.length) { ui.alert(t_('remind.none')); return; }
  var url = portalUrl_();
  if (!url) { ui.alert(t_('err.noUrl')); return; }
  if (ui.alert(t_('remind.confirm', { n: pending.length }), ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var byEmail = indexTeam_(team), sent = 0;
  for (var i = 0; i < pending.length; i++) {
    var c = pending[i], quota = 1;
    try { quota = MailApp.getRemainingDailyQuota(); } catch (e) {}
    if (quota < 1) break;
    var left = (c.pending || []).length + (c.self ? 0 : 1);
    var intro = t_(c.self ? 'remind.body' : 'remind.bodySelf', { n: left });
    try { if (send_(c.email, t_('remind.subject', { org: orgName_() }), oneButtonEmail_(byEmail[c.email] || { name: c.name }, intro, t_('remind.button'), url, false))) sent++; }
    catch (e) { Logger.log('reminder not sent: ' + e); break; }
  }
  ui.alert(sent < pending.length ? t_('remind.partial', { n: sent, left: pending.length - sent }) : t_('remind.sent', { n: sent }));
}
