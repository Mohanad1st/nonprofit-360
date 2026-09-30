/**
 * nonprofit-360 — reports and paper forms as Google Docs.
 * Reports go into a private folder next to the sheet and are shared with nobody. The admin decides what anyone sees.
 * Three kinds: the admin's full copy per person, the employee's copy (no rater names, no warnings), and the organisation report.
 */

function makeReports() {
  requireOwner_();
  var started = Date.now(), R = analyzeNow_();
  writeResults_(R, false);
  var res = makeReportsFrom_(R, false, started);
  uiAlert_(res.complete ? t_('reports.done', { folder: res.folder.getName() }) : t_('reports.partial', { d: res.done, n: res.total, folder: res.folder.getName() }));
}
/**
 * Google stops any single run after 6 minutes, and each person's two reports take several seconds.
 * So reports are made in rounds: when a round nears its time budget, what is done is remembered, and the next
 * «Make the reports» continues in the same folder. Returns { folder, complete, done, total }.
 */
var REPORT_BUDGET_MS = 270000;
function makeReportsFrom_(R, isTest, started) {
  var props = PropertiesService.getScriptProperties(), key = isTest ? 'REPORT_JOB_TEST' : 'REPORT_JOB';
  var job = null, folder, admin, staff;
  started = started || Date.now();
  try { job = JSON.parse(props.getProperty(key) || 'null'); } catch (e) { job = null; }
  // an unfinished job is continued only within 12 hours, and only if its folder is still there
  if (job && (!job.created || Date.now() - job.created > 12 * 3600000)) job = null;
  if (job) {
    try {
      folder = DriveApp.getFolderById(job.folder); admin = DriveApp.getFolderById(job.admin); staff = DriveApp.getFolderById(job.staff);
      if (folder.isTrashed()) job = null;
    } catch (e) { job = null; }
  }
  if (!job) {
    var stamp = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH-mm');
    folder = parentFolder_().createFolder((isTest ? t_('reports.testFolder') : t_('reports.folder')) + ' ' + stamp);
    admin = folder.createFolder(t_('reports.adminFolder'));
    staff = folder.createFolder(t_('reports.staffFolder'));
    orgReport_(R, folder, isTest);
    job = { folder: folder.getId(), admin: admin.getId(), staff: staff.getId(), done: [], created: Date.now() };
    props.setProperty(key, JSON.stringify(job));
  }
  var todo = Object.keys(R.persons).filter(function (e) { var p = R.persons[e]; return p.nRaters || p.hasSelf; });
  for (var i = 0; i < todo.length; i++) {
    var e = todo[i];
    if (job.done.indexOf(e) >= 0) continue;
    if (Date.now() - started > REPORT_BUDGET_MS) {
      props.setProperty(key, JSON.stringify(job));
      return { folder: folder, complete: false, done: job.done.length, total: todo.length };
    }
    personReport_(R, R.persons[e], admin, isTest);
    employeeReport_(R, R.persons[e], staff, isTest);
    job.done.push(e);
    props.setProperty(key, JSON.stringify(job)); // progress is kept even if Google stops the run early
  }
  props.deleteProperty(key);
  return { folder: folder, complete: true, done: todo.length, total: todo.length };
}

// ——— charts ———
function chartBlob_(title, labels, series, max) {
  try {
    var col = colors_();
    var dt = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, t_('report.item'));
    series.forEach(function (s) { dt.addColumn(Charts.ColumnType.NUMBER, s.name); });
    labels.forEach(function (l, i) { dt.addRow([l].concat(series.map(function (s) { var v = s.values[i]; return v == null ? null : Number(v); }))); });
    return Charts.newBarChart().setDataTable(dt.build()).setTitle(title)
      .setDimensions(640, 70 + labels.length * 44).setRange(0, max || 5)
      .setLegendPosition(Charts.Position.TOP).setColors([col.accent, col.primary, '#9aa9b6'].slice(0, series.length))
      .build().getAs('image/png');
  } catch (e) { Logger.log('chart: ' + e); return null; }
}
function image_(body, blob, width) {
  if (!blob) return null;
  var img = body.appendImage(blob);
  var w = img.getWidth(), h = img.getHeight();
  if (w && h) img.setWidth(width).setHeight(Math.round(h * width / w));
  try { img.getParent().asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER); } catch (e) {}
  return img;
}
function selfVsOthersChart_(p, othersOf) {
  var B = Q_();
  othersOf = othersOf || function (id) { return p.scores[id].others; };
  return chartBlob_(t_('report.chartSelf'), B.CORE.map(function (q) { return q.title; }),
    [{ name: t_('report.yourSelf'), values: B.CORE.map(function (q) { return p.scores[q.id].self; }) },
     { name: t_('report.others'), values: B.CORE.map(function (q) { return othersOf(q.id); }) }]);
}

// ——— writing helpers (right-to-left for Arabic, left-to-right for English) ———
function newDoc_(title, folder) {
  var doc = DocumentApp.create(title);
  DriveApp.getFileById(doc.getId()).moveTo(folder);
  doc.getBody().setMarginLeft(50).setMarginRight(50);
  return doc;
}
function p_(body, text, heading, opts) {
  var par = body.appendParagraph(String(text == null ? '' : text));
  // An RTL paragraph with no explicit alignment starts at the right. Never set RIGHT: Docs treats it as "end" (= left) in RTL.
  par.setLeftToRight(!isRtl_());
  if (heading) par.setHeading(heading);
  // Docs copies the previous paragraph's style onto new ones, so reset bold and colour every time.
  par.editAsText().setBold(!!(opts && opts.bold)).setForegroundColor(opts && opts.color ? opts.color : '#000000');
  if (opts && opts.muted) par.editAsText().setForegroundColor('#555555'); // no italics: Arabic italics fall back to an unreadable font
  if (opts && opts.size) par.editAsText().setFontSize(opts.size);
  return par;
}
function li_(body, text) {
  var item = body.appendListItem(String(text));
  item.setLeftToRight(!isRtl_()).setGlyphType(DocumentApp.GlyphType.BULLET);
  item.editAsText().setBold(false).setForegroundColor('#000000');
  return item;
}
function scoreColor_(v) {
  if (v == null || v === '' || isNaN(v)) return null;
  return v < 2.5 ? '#f4c7c3' : (v < 3.5 ? '#fce8b2' : '#b7e1cd');
}
/** A table. Google Docs has no table direction, so for Arabic the columns are reversed to read from the right. */
function table_(body, rows, scoreCols) {
  var rtl = isRtl_();
  var visual = rows.map(function (r) { var x = r.map(function (c) { return c == null ? '' : String(c); }); return rtl ? x.reverse() : x; });
  var t = body.appendTable(visual), n = rows[0].length;
  for (var i = 0; i < t.getNumRows(); i++) {
    var row = t.getRow(i);
    for (var j = 0; j < row.getNumCells(); j++) {
      var cell = row.getCell(j);
      cell.setPaddingTop(3).setPaddingBottom(3);
      var par = cell.getChild(0).asParagraph();
      par.setLeftToRight(!rtl);
      par.editAsText().setFontSize(10).setBold(i === 0).setForegroundColor('#000000');
      var logical = rtl ? n - 1 - j : j;
      if (i === 0) cell.setBackgroundColor(colors_().mist);
      else if (scoreCols && scoreCols.indexOf(logical) >= 0) { var c = scoreColor_(parseFloat(rows[i][logical])); if (c) cell.setBackgroundColor(c); }
    }
  }
  return t;
}
function fmt_(v) { return v == null ? '—' : String(v); }
function sortedTexts_(arr) { return arr.filter(function (x) { return String(x || '').trim(); }).sort(); }
function H1_() { return DocumentApp.ParagraphHeading.HEADING1; }
function header_(b, title, p) {
  image_(b, logoBlob_(), 140);
  p_(b, setting_('TAGLINE'), null, { bold: true, color: colors_().primary }).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p_(b, title, DocumentApp.ParagraphHeading.TITLE);
  if (p) p_(b, p.name + ' · ' + (p.title || '') + ' · ' + p.dept, DocumentApp.ParagraphHeading.SUBTITLE);
}

// ——— the employee's copy: to hand over after the admin decides — no names, no warnings, constructive wording ———
function employeeReport_(R, p, folder, isTest) {
  var B = Q_(), C = t_, min = Number(cfg_().MIN_GROUP);
  var doc = newDoc_((isTest ? C('report.testPrefix') : '') + C('report.staffTitle', { name: p.name }), folder);
  var b = doc.getBody();
  header_(b, C('report.title', { cycle: setting_('CYCLE_NAME') }), p);
  p_(b, C('report.staffIntro'));
  if (!p.releasable) { p_(b, C('report.staffTooFew'), null, { bold: true }); doc.saveAndClose(); return; }
  p_(b, '1. ' + C('report.overview'), H1_());
  table_(b, [['', C('report.of5')], [C('report.othersAvg'), fmt_(p.coreOthers)], [C('report.selfAvg'), fmt_(p.coreSelf)], [C('report.nRaters'), String(p.nRaters)]]);
  // an item's score is shown only when enough people answered THAT item ("I don't know" answers do not count)
  var enough = function (q) { return p.scores[q] && p.scores[q].n >= min; };
  var others = function (q) { return enough(q) ? p.scores[q].others : null; };
  image_(b, selfVsOthersChart_(p, others), 470);
  p_(b, C('report.scale'), null, { size: 9, muted: true });
  p_(b, '2. ' + C('report.byItem'), H1_());
  var rows = [[C('report.item'), C('report.yourSelf'), C('report.others')]];
  B.CORE.forEach(function (q) { rows.push([q.title, fmt_(p.scores[q.id].self), fmt_(others(q.id))]); });
  table_(b, rows, [1, 2]);
  if (B.CORE.some(function (q) { return !enough(q.id) && p.scores[q.id].n > 0; })) p_(b, C('report.itemTooFew', { n: min }), null, { size: 9, muted: true });
  p_(b, '3. ' + C('report.strengthsDev'), H1_());
  p_(b, C('report.strengthsYou'), null, { bold: true });
  p.strengths.filter(enough).forEach(function (q) { li_(b, titleOf_(q) + ' – ' + fmt_(p.scores[q].others)); });
  p_(b, C('report.devYou'), null, { bold: true });
  p.devAreas.filter(function (q) { return enough(q) && p.strengths.indexOf(q) < 0; }).forEach(function (q) { li_(b, titleOf_(q) + ' – ' + fmt_(p.scores[q].others)); });
  var over = p.blindOver.filter(enough), under = p.blindUnder.filter(enough);
  if (over.length || under.length) {
    p_(b, C('report.reflect'), null, { bold: true });
    over.forEach(function (q) { li_(b, C('report.overYou', { item: titleOf_(q), self: fmt_(p.scores[q].self), others: fmt_(p.scores[q].others) })); });
    under.forEach(function (q) { li_(b, C('report.underYou', { item: titleOf_(q), self: fmt_(p.scores[q].self), others: fmt_(p.scores[q].others) })); });
  }
  var n = 4;
  // leadership answers (scores AND examples) are shown only when enough people rated the leadership to keep them anonymous
  var LI = leadIds_(), leadRaters = p.ratings.filter(function (x) { return LI.some(function (q) { return x.scores[q] != null; }); }).length;
  if (p.isHead) {
    p_(b, (n++) + '. ' + C('report.leadYou'), H1_());
    if (leadRaters >= min) {
      var lr = [[C('report.leadItem'), C('report.yourSelf'), C('report.teamAndManager')]];
      B.LEAD.forEach(function (q) { lr.push([q.title, fmt_(p.scores[q.id].self), fmt_(others(q.id))]); });
      table_(b, lr, [1, 2]);
    } else p_(b, C('report.leadTooFew', { n: min }));
  }
  p_(b, (n++) + '. ' + C('report.saidYou'), H1_());
  [['O_KEEP', 'report.keep'], ['O_START', 'report.start'], ['O_STOP', 'report.stop'], ['O_EASIER', 'report.easierYou']].forEach(function (pair) {
    var texts = sortedTexts_(p.ratings.map(function (x) { return x.texts[pair[0]]; }));
    if (!texts.length) return;
    p_(b, C(pair[1]), null, { bold: true });
    texts.forEach(function (t) { li_(b, t); });
  });
  var ex = [];
  B.CORE.concat(leadRaters >= min ? B.LEAD : []).forEach(function (q) { p.ratings.forEach(function (x) { var t = String(x.evidence[q.id] || '').trim(); if (t) ex.push(q.title + ': «' + t + '»'); }); });
  if (ex.length) { p_(b, C('report.examples'), null, { bold: true }); sortedTexts_(ex).forEach(function (t) { li_(b, t); }); }
  if (p.recogFrom.length) {
    p_(b, (n++) + '. ' + C('report.recogYou'), H1_());
    // only the count: one colleague's note names everyone they recognised, so it is never copied into anyone's report
    p_(b, C('report.recogYouText', { n: p.recogFrom.length }));
  }
  var xp = p.expected || {};
  if (xp.selfExpect || xp.selfAch || xp.selfContrib) {
    p_(b, (n++) + '. ' + C('report.expectedYou'), H1_());
    if (xp.selfExpect) { p_(b, C('report.expectYou'), null, { bold: true }); p_(b, xp.selfExpect); }
    if (xp.selfAch) { p_(b, C('report.achYou'), null, { bold: true }); p_(b, xp.selfAch); }
    if (xp.selfContrib) { p_(b, C('report.contribYou'), null, { bold: true }); p_(b, xp.selfContrib); }
  }
  p_(b, (n++) + '. ' + C('report.plan'), H1_());
  if (p.selfTexts.S_PLAN) { p_(b, C('report.planYou'), null, { bold: true }); p_(b, p.selfTexts.S_PLAN); }
  [C('report.agreed'), C('report.reply')].forEach(function (t) { p_(b, t, null, { bold: true }); p_(b, '\n\n\n'); });
  p_(b, C('report.signatures'));
  p_(b, C('intro.closing') + ' — ' + setting_('SIGNATURE'), null, { size: 10 });
  doc.saveAndClose();
}

// ——— the admin's full copy ———
function personReport_(R, p, folder, isTest) {
  var B = Q_(), C = t_, min = Number(cfg_().MIN_GROUP), red = '#b00020';
  var doc = newDoc_((isTest ? C('report.testPrefix') : '') + C('report.adminTitle', { name: p.name }), folder);
  var b = doc.getBody();
  p_(b, C('report.title', { cycle: setting_('CYCLE_NAME') }), DocumentApp.ParagraphHeading.TITLE);
  p_(b, p.name + ' · ' + (p.title || '') + ' · ' + p.dept, DocumentApp.ParagraphHeading.SUBTITLE);
  p_(b, (isTest ? C('report.testNote') + ' ' : '') + C('report.adminOnly'), null, { color: red, bold: true });
  p_(b, p.releasable ? C('report.releasable', { n: p.nRaters }) : C('report.notReleasable', { n: p.nRaters, min: min }), null, { muted: true });
  if (p.nExcluded) p_(b, C('report.excluded', { n: p.nExcluded }), null, { muted: true });

  p_(b, '1. ' + C('report.summary'), H1_());
  table_(b, [[C('report.measure'), C('report.value')], [C('report.othersCore'), fmt_(p.coreOthers)], [C('report.selfCore'), fmt_(p.coreSelf)],
    [C('report.byGroup'), p.nByGroup.HEAD + ' / ' + p.nByGroup.TEAM + ' / ' + p.nByGroup.PEERS], [C('report.recogCount'), String(p.recogFrom.length)]]);
  p_(b, C('report.scaleWeighted'), null, { size: 9, muted: true });

  p_(b, '2. ' + C('report.byItemWho'), H1_());
  var merged = C('report.merged');
  var rows = [[C('report.item'), C('report.self'), C('report.manager'), C('report.team'), C('report.peers'), C('report.others'), C('report.gap')]];
  B.CORE.forEach(function (q) {
    var s = p.scores[q.id];
    rows.push([q.title, fmt_(s.self), fmt_(s.head), p.showTeamSeparately ? fmt_(s.team) : (s.team != null ? merged : '—'),
      p.showPeersSeparately ? fmt_(s.peers) : (s.peers != null ? merged : '—'), fmt_(s.others), fmt_(s.gap)]);
  });
  table_(b, rows, [1, 2, 3, 4, 5]);
  image_(b, selfVsOthersChart_(p), 470);
  if (!p.showTeamSeparately || !p.showPeersSeparately) p_(b, C('report.mergedNote', { n: min }), null, { size: 9, muted: true });

  p_(b, '3. ' + C('report.strengthsDev'), H1_());
  p_(b, C('report.strengths'), null, { bold: true });
  p.strengths.forEach(function (q) { li_(b, titleOf_(q) + ' – ' + fmt_(p.scores[q].others)); });
  p_(b, C('report.dev'), null, { bold: true });
  p.devAreas.forEach(function (q) { li_(b, titleOf_(q) + ' – ' + fmt_(p.scores[q].others)); });
  if (p.blindOver.length || p.blindUnder.length) {
    p_(b, C('report.blind'), null, { bold: true });
    p.blindOver.forEach(function (q) { li_(b, C('report.over', { item: titleOf_(q), self: fmt_(p.scores[q].self), others: fmt_(p.scores[q].others) })); });
    p.blindUnder.forEach(function (q) { li_(b, C('report.under', { item: titleOf_(q), self: fmt_(p.scores[q].self), others: fmt_(p.scores[q].others) })); });
  }

  if (p.isHead || p.blame) {
    p_(b, '4. ' + C('report.lead'), H1_());
    var lr = [[C('report.leadItem'), C('report.self'), C('report.team'), C('report.others')]];
    B.LEAD.forEach(function (q) { var s = p.scores[q.id]; lr.push([q.title, fmt_(s.self), p.showTeamSeparately ? fmt_(s.team) : (s.team != null ? merged : '—'), fmt_(s.others)]); });
    table_(b, lr, [1, 2, 3]);
    if (p.blame) {
      var x = p.blame;
      p_(b, C('report.compare'), null, { bold: true });
      table_(b, [[C('report.measure'), C('report.value')], [C('report.headView'), fmt_(x.headViewOfTeam)], [C('report.othersView'), fmt_(x.othersViewOfTeam)],
        [C('report.gap'), fmt_(x.gap)], [C('report.teamLead'), fmt_(x.teamViewOfLeadership)], [C('report.teamResp'), fmt_(x.teamViewOfResponsibility)],
        [C('report.peerComm'), fmt_(x.peersViewOfCommunication)]], [1]);
      if (x.pattern) p_(b, C('report.patternNote'), null, { color: red, bold: true });
    }
    var mg = p.managing || [];
    if (mg.length) {
      p_(b, C('report.handling'), null, { bold: true });
      var weak = mg.filter(function (m) { return m.low > 0; });
      table_(b, [[C('report.measure'), C('report.count')],
        [C('report.weakMembers'), weak.length + ' / ' + mg.length],
        [C('report.discussed'), String(weak.filter(function (m) { return m.disc === 'DISC_DOC' || m.disc === 'DISC_VERBAL'; }).length)],
        [C('report.noFollow'), String(weak.filter(function (m) { return m.noFollowUp; }).length)],
        [C('report.notWritten'), String(mg.filter(function (m) { return m.set !== 'SET_WRITTEN' || (m.memberSet && m.memberSet !== 'SET_WRITTEN'); }).length)]], []);
      var did = sortedTexts_(mg.map(function (m) { return m.did; })), mine = sortedTexts_(mg.map(function (m) { return m.mine; }));
      if (did.length) { p_(b, C('report.didSaid'), null, { bold: true }); did.forEach(function (t) { li_(b, t); }); }
      if (mine.length) { p_(b, C('report.mineSaid'), null, { bold: true }); mine.forEach(function (t) { li_(b, t); }); }
    }
  }

  var xp = p.expected || {};
  if (xp.selfExpect || xp.selfAch || xp.selfContrib || xp.head != null) {
    p_(b, C('report.expected'), H1_());
    if (xp.selfExpect) { p_(b, C('report.expect'), null, { bold: true }); p_(b, xp.selfExpect); }
    if (xp.selfAch) { p_(b, C('report.ach'), null, { bold: true }); p_(b, xp.selfAch); }
    if (xp.selfContrib) { p_(b, C('report.contrib'), null, { bold: true }); p_(b, xp.selfContrib); }
    table_(b, [['', C('report.value')], [C('report.x1Head'), fmt_(xp.head)], [C('report.setHead'), ansLabel_(xp.headSet) || '—'], [C('report.setThem'), ansLabel_(xp.memberSet) || '—']], [1]);
    if (xp.headEvidence) p_(b, C('report.headExample', { t: xp.headEvidence }));
  }

  p_(b, '5. ' + C('report.evidence'), H1_());
  var any = false;
  B.CORE.concat(B.LEAD, B.HEAD_ITEMS).forEach(function (q) {
    var ex = p.ratings.filter(function (x) { return x.evidence[q.id] && String(x.evidence[q.id]).trim(); });
    if (!ex.length) return;
    any = true;
    p_(b, q.title, DocumentApp.ParagraphHeading.HEADING3);
    ex.sort(function (a, c) { return (a.scores[q.id] || 0) - (c.scores[q.id] || 0); }).forEach(function (x) {
      var g = groupOf_(x.rel);
      var who = g === 'HEAD' ? C('group.HEAD') : ((g === 'TEAM' && p.showTeamSeparately) || (g === 'PEERS' && p.showPeersSeparately) ? C('group.' + g) : C('group.ANY'));
      li_(b, C('report.scoreBy', { v: x.scores[q.id], who: who }) + ': «' + String(x.evidence[q.id]).trim() + '»');
    });
  });
  if (!any) p_(b, C('report.noExamples'));

  p_(b, '6. ' + C('report.notes'), H1_());
  [['O_START', 'report.start'], ['O_STOP', 'report.stop'], ['O_KEEP', 'report.keep'], ['O_EASIER', 'report.easier']].forEach(function (pair) {
    var texts = sortedTexts_(p.ratings.map(function (x) { return x.texts[pair[0]]; }));
    if (!texts.length) return;
    p_(b, C(pair[1]), null, { bold: true });
    texts.forEach(function (t) { li_(b, t); });
  });
  if (p.recogFrom.length) {
    p_(b, '7. ' + C('report.recog'), H1_());
    p_(b, C('report.recogText', { n: p.recogFrom.length }));
    sortedTexts_(p.recogWhy).forEach(function (t) { li_(b, t); });
  }
  p_(b, '8. ' + C('report.selfWords'), H1_());
  if (!p.hasSelf) p_(b, C('report.noSelf'), null, { color: red });
  openFor_('SELF_OPEN', p.dept).concat(B.SELF_HEAD).forEach(function (q) {
    var t = p.selfTexts[q.id]; if (!t) return;
    p_(b, q.title, null, { bold: true }); p_(b, t);
  });
  p_(b, '9. ' + C('report.next'), H1_());
  [C('report.nextSession'), C('report.nextReply'), C('report.nextPlan')].forEach(function (t) { p_(b, t); p_(b, '\n\n'); });
  p_(b, C('report.readWith'));
  p_(b, C('report.signaturesAdmin'));
  doc.saveAndClose();
}

// ——— the organisation report ———
function orgReport_(R, folder, isTest) {
  var B = Q_(), C = t_, P = R.persons, red = '#b00020';
  var doc = newDoc_((isTest ? C('report.testPrefix') : '') + C('report.orgTitleDoc'), folder);
  var b = doc.getBody();
  header_(b, C('report.orgTitle', { cycle: setting_('CYCLE_NAME') }));
  p_(b, orgName_(), DocumentApp.ParagraphHeading.SUBTITLE);
  p_(b, (isTest ? C('report.testNote') + ' ' : '') + C('report.adminOnly'), null, { color: red, bold: true });
  var emails = Object.keys(P);
  p_(b, '1. ' + C('report.participation'), H1_());
  table_(b, [[C('report.measure'), C('report.count')], [C('report.included'), String(emails.length)],
    [C('report.withRatings'), String(emails.filter(function (e) { return P[e].nRaters > 0; }).length)],
    [C('report.withSelf'), String(emails.filter(function (e) { return P[e].hasSelf; }).length)], [C('report.flagCount'), String(R.flags.length)]]);
  p_(b, '2. ' + C('report.orgWeak'), H1_());
  var w = [[C('report.item'), C('report.orgAvg'), C('report.below3')]];
  R.orgWeak.forEach(function (x) { w.push([x.title, fmt_(x.avg), x.pctBelow3 == null ? '—' : Math.round(x.pctBelow3 * 100) + '%']); });
  table_(b, w, [1]);
  var od = orgChartData_(R);
  image_(b, chartBlob_(C('dash.chart1'), od.items, [{ name: C('report.self'), values: od.self }, { name: C('report.others'), values: od.others }]), 470);
  p_(b, '3. ' + C('report.depts'), H1_());
  var dr = [[C('col.people.dept'), C('report.total')].concat(B.DEPT.map(function (q) { return q.title; }))];
  R.deptSummary.forEach(function (s) { dr.push([s.dept, fmt_(s.received)].concat(B.DEPT.map(function (q) { return fmt_(s.perItem[q.id]); }))); });
  table_(b, dr, B.DEPT.map(function (_, i) { return i + 1; }).concat([B.DEPT.length + 1]));
  if (od.depts.length) image_(b, chartBlob_(C('dash.chart2'), od.depts, [{ name: C('dash.seenByOthers'), values: od.deptReceived }, { name: C('dash.peopleAvg'), values: od.deptPeople }]), 470);
  R.deptSummary.forEach(function (s) {
    if (!s.evidence.length) return;
    p_(b, C('report.deptExamples', { dept: s.dept }), DocumentApp.ParagraphHeading.HEADING3);
    s.evidence.forEach(function (x) { li_(b, C('report.from', { d: x.from }) + ': «' + x.text + '»' + (x.sugg ? ' — ' + C('report.sugg') + ': ' + x.sugg : '')); });
  });
  p_(b, C('results.matrix'), DocumentApp.ParagraphHeading.HEADING3);
  var mx = [[C('report.matrixCorner')].concat(R.depts)];
  R.depts.forEach(function (a) { mx.push([a].concat(R.depts.map(function (c) { return a === c ? '—' : fmt_(R.deptMatrix[a][c]); }))); });
  table_(b, mx, R.depts.map(function (_, i) { return i + 1; }));
  p_(b, '4. ' + C('report.managers'), H1_());
  var br = [[C('col.blame.head'), C('col.blame.headView'), C('col.blame.othersView'), C('col.blame.teamLead'), C('col.blame.teamResp'), C('col.blame.pattern')]];
  R.blame.forEach(function (x) { br.push([x.name, fmt_(x.headViewOfTeam), fmt_(x.othersViewOfTeam), fmt_(x.teamViewOfLeadership), fmt_(x.teamViewOfResponsibility), x.pattern ? C('results.patternYes') : '']); });
  table_(b, br, [1, 2, 3, 4]);
  p_(b, '5. ' + C('report.stars'), H1_());
  if (!R.stars.length) p_(b, C('report.none'));
  R.stars.forEach(function (x) { li_(b, C('report.starLine', { name: x.name, dept: x.dept, n: x.recogCount, v: fmt_(x.others) }) + (x.hidden ? ' ★ ' + C('col.stars.hidden') : '') + (x.humble ? ' – ' + C('col.stars.humble') : '')); });
  p_(b, '6. ' + C('report.heat'), H1_());
  var hm = [[C('col.people.name'), C('col.people.dept')].concat(B.CORE.map(function (q) { return q.id; }), [C('results.leadAvg')])];
  emails.sort(function (a, c) { return (P[a].dept + P[a].name) < (P[c].dept + P[c].name) ? -1 : 1; }).forEach(function (e) {
    hm.push([P[e].name, P[e].dept].concat(B.CORE.map(function (q) { return fmt_(P[e].scores[q.id].others); }), [fmt_(P[e].leadOthers)]));
  });
  table_(b, hm, B.CORE.map(function (_, i) { return i + 2; }).concat([B.CORE.length + 2]));
  p_(b, C('report.codes') + ' ' + B.CORE.map(function (q) { return q.id + ' = ' + q.title; }).join(' · '), null, { size: 9 });
  p_(b, '7. ' + C('report.slow'), H1_());
  var slow = R.flags.filter(function (f) { return f.type === 'LOW_RESPONSIVENESS' || f.type === 'LOW_COMPLETION'; });
  if (!slow.length) p_(b, C('report.none'));
  slow.forEach(function (f) { li_(b, name_(R, f.person) + ' – ' + flagName_(f.type) + ': ' + f.detail); });
  p_(b, '8. ' + C('report.highFlags'), H1_());
  var hi = R.flags.filter(function (f) { return f.severity === 'HIGH'; });
  if (!hi.length) p_(b, C('report.none'));
  hi.forEach(function (f) { li_(b, flagName_(f.type) + ' – ' + (f.person ? name_(R, f.person) : '') + (f.about ? ' (' + f.about + ')' : '') + ': ' + f.detail); });
  p_(b, C('report.flagsTab'), null, { muted: true, size: 9 });
  doc.saveAndClose();
}

// ——— paper forms for people without an email ———
/** One printable Google Doc per person without an email: their self-evaluation and everyone they are assigned to rate. */
function makePaperForms() {
  requireOwner_();
  var team = readTeam_(), byEmail = indexTeam_(team), asg = readAssignments_();
  var paper = team.filter(function (p) { return p.active !== false && isNoEmail_(p.email); });
  if (!paper.length) { uiAlert_(t_('paper.none')); return; }
  var folder = parentFolder_().createFolder(t_('paper.folder') + ' ' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'));
  paper.forEach(function (p) { paperForm_(p, asg.filter(function (a) { return a.rater === p.email; }), byEmail, folder); });
  uiAlert_(t_('paper.done', { n: paper.length, folder: folder.getName() }));
}
/** A window with one link per person without email: the admin opens it to type in the answers from their returned paper form. */
function enterPaperAnswers() {
  requireOwner_();
  var paper = readTeam_().filter(function (p) { return p.active !== false && isNoEmail_(p.email); });
  if (!paper.length) { uiAlert_(t_('paper.none')); return; }
  var url = portalUrl_();
  if (!url) { uiAlert_(t_('paper.noPage')); return; }
  var html = '<div dir="' + (isRtl_() ? 'rtl' : 'ltr') + '" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8">' +
    '<p>' + esc_(t_('paper.entryIntro')) + '</p><ul>' + paper.map(function (p) {
      return '<li><a target="_blank" href="' + esc_(url + '?as=' + encodeURIComponent(p.name)) + '">' + esc_(p.name) + '</a></li>';
    }).join('') + '</ul></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(460).setHeight(420), t_('menu.paperEntry'));
}
function paperForm_(p, mine, byEmail, folder) {
  var B = Q_(), C = t_;
  var doc = newDoc_(C('paper.title', { name: p.name }), folder), b = doc.getBody();
  header_(b, C('paper.heading', { cycle: setting_('CYCLE_NAME') }), p);
  p_(b, C('intro.title'), H1_());
  p_(b, C('email.hello', { name: p.name }), null, { bold: true });
  p_(b, C('paper.opening') + ' ' + C('intro.what360'));
  p_(b, C('intro.whyTitle'), null, { bold: true, color: colors_().primary });
  p_(b, C('intro.why1', { period: C('default.period') })); p_(b, C('intro.why2'));
  var vals = values_();
  if (vals.length) { p_(b, C('intro.valuesTitle'), null, { bold: true, color: colors_().primary }); vals.forEach(function (x) { li_(b, x[0] + ': ' + x[1]); }); }
  p_(b, C('paper.howTitle'), null, { bold: true, color: colors_().primary });
  [1, 2, 3, 4, 5, 6].forEach(function (i) { li_(b, C('paper.how' + i, { date: deadlineText_() || '—', n: Number(cfg_().EVIDENCE_MIN_CHARS) })); });
  function ratingTable(items) {
    var rows = [[C('report.item'), C('paper.circle'), C('paper.example')]];
    items.forEach(function (q) { rows.push([q.title + '\n' + String(q.help).split('\n')[0], '1   2   3   4   5\n' + C('ui.na'), '\n\n']); });
    table_(b, rows, []);
  }
  function lines(q, n) { p_(b, q.title + (q.required ? ' *' : ''), null, { bold: true }); if (q.help) p_(b, q.help, null, { size: 9, muted: true }); for (var i = 0; i < n; i++) p_(b, '______________________________________________________________'); }
  function choice(q) { p_(b, q.title + (q.required ? ' *' : ''), null, { bold: true }); p_(b, C('paper.circleOne') + '   ' + q.options.map(ansLabel_).join('   ·   ')); }
  p_(b, C('paper.part1'), H1_());
  p_(b, C('ui.scaleMeaning'), null, { size: 9, muted: true });
  p_(b, C('ui.describesSelf'), null, { size: 9, muted: true });
  ratingTable(B.CORE);
  if (hasReports_(p.email, byEmail)) { ratingTable(B.LEAD); B.SELF_HEAD.forEach(function (q) { lines(q, 3); }); }
  openFor_('SELF_OPEN', p.dept).forEach(function (q) { lines(q, 3); });
  p_(b, C('paper.recog'), null, { bold: true }); lines({ title: C('ui.recogWhy'), help: '' }, 2);
  mine.forEach(function (a, n) {
    var t = byEmail[a.ratee]; if (!t) return;
    var rel = deriveRel_(p.email, t.email, byEmail);
    b.appendPageBreak();
    p_(b, C('paper.partN', { n: n + 2, name: t.name }) + (rel === 'MEMBER_TO_HEAD' ? ' (' + C('relFor.MEMBER_TO_HEAD') + ')' : ''), H1_());
    if (a.reason) p_(b, C('ui.whyShown') + ' ' + a.reason, null, { size: 9, muted: true });
    p_(b, C('ui.freqQ') + ' — ' + C('paper.circleOne') + '   ' + FREQ_CODES.map(function (f) { return C('freq.' + f); }).join('   ·   '), null, { bold: true });
    p_(b, C('ui.scaleMeaning'), null, { size: 9, muted: true });
    ratingTable(B.CORE);
    if (leadAllowed_(p.email, t.email, byEmail)) { p_(b, C('ui.leadTitle') + ' — ' + C('ui.leadNa'), null, { bold: true }); ratingTable(B.LEAD); }
    if (rel === 'HEAD_TO_MEMBER') { ratingTable(B.HEAD_ITEMS); B.HEAD_OPEN.forEach(function (q) { if (q.kind === 'choice') choice(q); else lines(q, 2); }); }
    if (rel === 'MEMBER_TO_HEAD') { p_(b, C('ui.memberTitle') + ': ' + C('ui.memberIntro'), null, { bold: true }); B.MEMBER_OPEN.forEach(function (q) { if (q.kind === 'choice') choice(q); else lines(q, 2); }); }
    B.PERSON_OPEN.forEach(function (q) { lines(q, 2); });
  });
  p_(b, '');
  p_(b, C('intro.closing') + ' — ' + setting_('SIGNATURE'));
  p_(b, C('paper.sign'));
  p_(b, C('paper.office'), null, { size: 8, muted: true });
  doc.saveAndClose();
}
