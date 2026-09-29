/**
 * nonprofit-360 — analysis logic.
 * Pure functions: no Google services here, so the whole file runs and is tested locally in Node.
 *
 * record = { form: 'SELF'|'PERSON'|'DEPT', rid, ts, rater, ratee, relDeclared, freq,
 *            scores: {qid: 1..5|null}, evidence: {qid: text}, texts: {qid: text}, recog: [email] }
 * Every value the logic compares against is a language-neutral code (FREQ_CODES, ANS, severities, decisions).
 * Labels are looked up with t_() only when something is shown to a person.
 */

var NO_EMAIL = 'no-email:';          // people without an account are rated online and rate others on paper
var EXTREME = [1, 2, 5];             // these scores need a real example
var LOW_SCORES = [1, 2];
var FREQ_CODES = ['DAILY', 'WEEKLY', 'MONTHLY', 'RARELY'];
var FREQ_WEIGHT = { DAILY: 1.0, WEEKLY: 1.0, MONTHLY: 0.7, RARELY: 0.4 };
/** Fixed answers of the choice questions. The analysis relies on these codes. */
var ANS = {
  SET: ['SET_WRITTEN', 'SET_VERBAL', 'SET_NO'],
  DISC: ['DISC_DOC', 'DISC_VERBAL', 'DISC_NO', 'DISC_NONE'],
  TOLD: ['TOLD_REG', 'TOLD_SOME', 'TOLD_NEVER', 'TOLD_NA']
};
var CHOICE_OPTIONS = { H_SET: ANS.SET, H_DISC: ANS.DISC, M_SET: ANS.SET, M_TOLD: ANS.TOLD };

function lower_(s) { return String(s || '').trim().toLowerCase(); }
function isNoEmail_(e) { return String(e || '').indexOf(NO_EMAIL) === 0; }
/** The id of someone without an email: 'no-email:' + their name, in lower case like every other id. */
function noEmailId_(name) { return NO_EMAIL + lower_(name); }
function round2_(x) { return x == null || isNaN(x) ? null : Math.round(x * 100) / 100; }
function mean_(arr) {
  var a = arr.filter(function (x) { return x != null && !isNaN(x); });
  return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null;
}
function wmean_(pairs) { // [[value, weight]]
  var sw = 0, s = 0;
  pairs.forEach(function (p) { if (p[0] != null && !isNaN(p[0])) { s += p[0] * p[1]; sw += p[1]; } });
  return sw ? s / sw : null;
}
function ids_(section) { return Q_()[section].map(function (c) { return c.id; }); }
function coreIds_() { return ids_('CORE'); }
function leadIds_() { return ids_('LEAD'); }
function deptIds_() { return ids_('DEPT'); }
function headIds_() { return ids_('HEAD_ITEMS'); }
function titleOf_(qid) {
  var B = Q_(), all = B.CORE.concat(B.LEAD, B.DEPT, B.HEAD_ITEMS);
  for (var i = 0; i < all.length; i++) if (all[i].id === qid) return all[i].title;
  return qid;
}
/** Open questions of a section that apply to this person (a question can be limited to some departments). */
function openFor_(section, dept) {
  return Q_()[section].filter(function (q) { return !q.depts || !q.depts.length || q.depts.indexOf(dept) >= 0; });
}

function indexTeam_(team) {
  var byEmail = {};
  team.forEach(function (p) { p.email = lower_(p.email); p.manager = lower_(p.manager); byEmail[p.email] = p; });
  return byEmail;
}

/** The real relationship comes from the team structure, never from what the rater claims. */
function deriveRel_(rater, ratee, byEmail) {
  var a = byEmail[rater], b = byEmail[ratee];
  if (!a || !b) return null;
  if (rater === ratee) return 'SELF';
  if (b.manager === rater) return 'HEAD_TO_MEMBER';
  if (a.manager === ratee) return 'MEMBER_TO_HEAD';
  if (a.dept && a.dept === b.dept) return 'PEER_SAME';
  return 'PEER_OTHER';
}

/** Keeps the latest answer for each (form, rater, ratee). */
function dedupe_(records) {
  var latest = {};
  records.forEach(function (r) {
    var k = r.form + '|' + r.rater + '|' + r.ratee;
    if (!latest[k] || r.ts >= latest[k].ts) latest[k] = r; // the latest wins, also on a tie
  });
  return { records: Object.keys(latest).map(function (k) { return latest[k]; }), dropped: records.length - Object.keys(latest).length };
}

/**
 * Who rates whom. Every pair has a written reason; nothing is random.
 *  1) each manager ↔ each member of their team (both directions);
 *  2) the managers who report to the head of the organisation rate each other (setting MANAGERS_RATE_EACH_OTHER);
 *  3) the work links the admin wrote in the «Work links» tab, with their reasons.
 * The head of the organisation is rated only by direct reports (setting TOP_RATED_BY_DIRECTS_ONLY).
 * Pairs in the «Never pair» tab are removed in both directions, whatever rule created them.
 *
 * links: [{ rater, ratee, reason, both }]   never: [{ a, b }]   opts: { managersMesh, topDirectsOnly }
 */
function generateAssignments_(team, links, never, opts) {
  links = links || []; never = never || []; opts = opts || {};
  var mesh = opts.managersMesh !== false, topOnly = opts.topDirectsOnly !== false;
  var active = team.filter(function (p) { return p.active !== false; });
  var byEmail = indexTeam_(active);
  var out = [], seen = {}, banned = {};
  never.forEach(function (n) { var a = lower_(n.a), b = lower_(n.b); banned[a + '>' + b] = 1; banned[b + '>' + a] = 1; });
  function isTop(e) { var p = byEmail[e]; return !!p && (!p.manager || !byEmail[p.manager]); }
  function add(rater, ratee, reason) {
    var k = rater + '>' + ratee;
    if (rater === ratee || seen[k] || banned[k] || !byEmail[rater] || !byEmail[ratee]) return false;
    seen[k] = 1;
    out.push({ rater: rater, ratee: ratee, rel: deriveRel_(rater, ratee, byEmail), reason: reason });
    return true;
  }
  var sorted = active.slice().sort(function (x, y) { return x.email < y.email ? -1 : 1; });
  sorted.forEach(function (p) {
    if (p.manager && byEmail[p.manager]) { add(p.manager, p.email, t_('reason.headToMember')); add(p.email, p.manager, t_('reason.memberToHead')); }
  });
  if (mesh) {
    var managers = sorted.filter(function (p) {
      return !isTop(p.email) && isTop(p.manager) && !isNoEmail_(p.email) && hasReports_(p.email, byEmail);
    });
    managers.forEach(function (a) { managers.forEach(function (b) { add(a.email, b.email, t_('reason.managers')); }); });
  }
  links.forEach(function (w) {
    var a = lower_(w.rater), b = lower_(w.ratee), reason = String(w.reason || '').trim() || t_('reason.workLink');
    var blockAB = topOnly && isTop(b) && byEmail[a] && byEmail[a].manager !== b;
    var blockBA = topOnly && isTop(a) && byEmail[b] && byEmail[b].manager !== a;
    if (!blockAB) add(a, b, reason);
    if (w.both && !blockBA) add(b, a, reason);
  });
  return out;
}

/** Leadership questions are shown only to people who see the leadership: the team, or the manager's own manager. */
function leadAllowed_(rater, ratee, byEmail) {
  if (!hasReports_(ratee, byEmail)) return false;
  var rel = deriveRel_(rater, ratee, byEmail);
  return rel === 'MEMBER_TO_HEAD' || rel === 'HEAD_TO_MEMBER';
}
function hasReports_(email, byEmail) {
  return Object.keys(byEmail).some(function (e) { return byEmail[e].manager === email && byEmail[e].active !== false; });
}
/** Departments this department rates. deptLinks = { dept: [depts] }; a department with no row rates every other department. */
function linkedDepts_(dept, team, deptLinks, enabled) {
  if (enabled === false || !dept) return [];
  var all = {};
  team.forEach(function (p) { if (p.active !== false && p.dept && !isNoEmail_(p.email)) all[p.dept] = 1; });
  var l = deptLinks && deptLinks[dept] ? deptLinks[dept] : Object.keys(all);
  return l.filter(function (d) { return d !== dept && all[d]; });
}

/**
 * Checks any rating that arrives from the personal page. Runs on the server; the browser cannot skip it.
 * Returns { rec } ready to store, or { error } with a message in the organisation's language.
 * ctx = { deptLinks, deptRatings, minChars }
 */
function validateSubmission_(kind, p, email, team, assignments, paper, ctx) {
  email = lower_(email); p = p || {}; ctx = ctx || {};
  var minChars = ctx.minChars || 30;
  var byEmail = indexTeam_(team), me = byEmail[email];
  if (!me || (isNoEmail_(email) && !paper) || me.active === false) return { error: t_('err.notTeam') };
  if (paper && kind === 'DEPT') return { error: t_('err.paperNoDept') };
  var CI = coreIds_(), LI = leadIds_(), DI = deptIds_();
  function cleanScores(ids, src) {
    var out = {};
    for (var i = 0; i < ids.length; i++) {
      var v = src ? src[ids[i]] : undefined;
      if (v === undefined || v === '') return { error: t_('err.rateAll') };
      if (v === null || v === 'na') { out[ids[i]] = null; continue; }
      v = Number(v);
      if (!(v >= 1 && v <= 5) || Math.round(v) !== v) return { error: t_('err.badScore') };
      out[ids[i]] = v;
    }
    return { scores: out };
  }
  function cleanEvidence(scores, src) {
    var ev = {};
    for (var q in scores) {
      if (EXTREME.indexOf(scores[q]) >= 0) {
        var t = String((src || {})[q] || '').trim();
        if (t.length < minChars) return { error: t_('err.example', { n: minChars, item: titleOf_(q) }) };
        ev[q] = t.slice(0, 1500);
      }
    }
    return { evidence: ev };
  }
  function text(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 2500); } // keeps one answer under Google's cell size
  function openAnswers(qs, src, out) {
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i], t = text(src && src[q.id]);
      if (q.required && t.length < 3) return { error: t_('err.complete', { q: q.title }) };
      out[q.id] = t;
    }
    return null;
  }
  var rec = { form: kind, rid: 'W' + Date.now(), ts: Date.now(), rater: email, ratee: '', relDeclared: '', freq: '', scores: {}, evidence: {}, texts: {}, recog: [] };

  if (kind === 'PERSON') {
    var ratee = lower_(p.ratee);
    var assigned = (assignments || []).some(function (a) { return lower_(a.rater) === email && lower_(a.ratee) === ratee; });
    if (!assigned || !byEmail[ratee] || byEmail[ratee].active === false) return { error: t_('err.notInList') };
    if (FREQ_CODES.indexOf(p.freq) < 0) return { error: t_('err.freq') };
    var rel = deriveRel_(email, ratee, byEmail);
    var ids = CI.concat(leadAllowed_(email, ratee, byEmail) ? LI : [], rel === 'HEAD_TO_MEMBER' ? headIds_() : []);
    var s = cleanScores(ids, p.scores); if (s.error) return s;
    var e = cleanEvidence(s.scores, p.evidence); if (e.error) return e;
    var pt = p.texts || {}, texts = {};
    var bad = openAnswers(Q_().PERSON_OPEN, pt, texts); if (bad) return bad;
    rec.ratee = ratee; rec.relDeclared = rel; rec.freq = p.freq;
    rec.scores = s.scores; rec.evidence = e.evidence; rec.texts = texts;
    // the manager's own part, and the mirror questions for the team member
    var extra = rel === 'HEAD_TO_MEMBER' ? Q_().HEAD_OPEN : rel === 'MEMBER_TO_HEAD' ? Q_().MEMBER_OPEN : [];
    var low = Object.keys(s.scores).some(function (q) { return LOW_SCORES.indexOf(s.scores[q]) >= 0; });
    for (var k = 0; k < extra.length; k++) {
      var q = extra[k], v = text(pt[q.id]);
      if (q.kind === 'choice') {
        if (q.required && q.options.indexOf(v) < 0) return { error: t_('err.choose', { q: q.title }) };
        if (v && q.options.indexOf(v) < 0) v = '';
      } else if (q.requiredIfLow && low && v.length < minChars) {
        return { error: t_('err.headDid', { n: minChars }) };
      } else if (q.required && v.length < 3) return { error: t_('err.complete', { q: q.title }) };
      rec.texts[q.id] = v;
    }
    if (rel === 'HEAD_TO_MEMBER' && low && rec.texts.H_DISC === 'DISC_NONE') return { error: t_('err.headDisc') };
    return { rec: rec };
  }
  if (kind === 'SELF') {
    var lead = hasReports_(email, byEmail);
    var s2 = cleanScores(CI.concat(lead ? LI : []), p.scores); if (s2.error) return s2;
    var e2 = cleanEvidence(s2.scores, p.evidence); if (e2.error) return e2;
    var texts2 = {};
    var bad2 = openAnswers(openFor_('SELF_OPEN', me.dept), p.texts, texts2); if (bad2) return bad2;
    if (lead) { bad2 = openAnswers(Q_().SELF_HEAD, p.texts, texts2); if (bad2) return bad2; }
    texts2.R_WHY = text(p.texts && p.texts.R_WHY);
    var recog = [];
    (p.recog || []).forEach(function (r) { r = lower_(r); if (r && r !== email && byEmail[r] && recog.indexOf(r) < 0 && recog.length < 3) recog.push(r); });
    rec.ratee = email; rec.relDeclared = 'SELF'; rec.scores = s2.scores; rec.evidence = e2.evidence; rec.texts = texts2; rec.recog = recog;
    return { rec: rec };
  }
  if (kind === 'DEPT') {
    var target = String(p.dept || '');
    if (linkedDepts_(me.dept, team, ctx.deptLinks, ctx.deptRatings).indexOf(target) < 0) return { error: t_('err.deptNotInList') };
    if (FREQ_CODES.indexOf(p.freq) < 0) return { error: t_('err.deptFreq') };
    var s3 = cleanScores(DI, p.scores); if (s3.error) return s3;
    var e3 = cleanEvidence(s3.scores, p.evidence); if (e3.error) return e3;
    var ex = text(p.texts && p.texts.D_EX);
    var none = DI.every(function (q) { return s3.scores[q] == null; }); // "I have not dealt with this department"
    if (none) ex = ex || t_('ui.deptSkip');
    else if (ex.length < minChars) return { error: t_('err.deptExample', { n: minChars }) };
    rec.ratee = target; rec.freq = p.freq; rec.scores = s3.scores; rec.evidence = e3.evidence; rec.texts = { D_EX: ex, D_SUG: text((p.texts || {}).D_SUG) };
    return { rec: rec };
  }
  return { error: t_('err.unknownKind') };
}

/**
 * The full analysis.
 * decisionList: [{ rater, ratee, decision: 'KEEP'|'EXCLUDE' }] — the admin's word beats the automatic rules.
 * cfg: { MIN_GROUP, BLIND_SPOT, OUTLIER, MUTUAL_HIGH, BLAME_GAP, BLAME_UPWARD_MAX, WEAK_EVIDENCE_CHARS, deptLinks, deptRatings }
 */
function analyze_(team, assignments, rawRecords, decisionList, cfg) {
  cfg = Object.assign({ MIN_GROUP: 3, BLIND_SPOT: 1.0, OUTLIER: 1.5, MUTUAL_HIGH: 4.5, BLAME_GAP: -0.75, BLAME_UPWARD_MAX: 3.0, WEAK_EVIDENCE_CHARS: 40 }, cfg || {});
  var byEmail = indexTeam_(team);
  var decisions = {};
  (decisionList || []).forEach(function (d) { if (d.rater && d.ratee) decisions[lower_(d.rater) + '>' + lower_(d.ratee)] = d.decision; });
  var allPersonEntries = [];
  var dd = dedupe_(rawRecords);
  var recs = dd.records, flags = [], assignSet = {};
  (assignments || []).forEach(function (a) { assignSet[lower_(a.rater) + '>' + lower_(a.ratee)] = 1; });
  var CI = coreIds_(), LI = leadIds_(), DI = deptIds_(), HI = headIds_();

  function flag(type, severity, who, about, detail, rater) {
    flags.push({ type: type, severity: severity, person: who, about: about || '', detail: detail, rater: rater || '' });
  }
  if (dd.dropped) flag('DUPLICATE', 'LOW', '', '', t_('flag.DUPLICATE.detail', { n: dd.dropped }));

  var persons = {};
  team.forEach(function (p) {
    if (p.active === false) return;
    persons[p.email] = { email: p.email, name: p.name, dept: p.dept, title: p.title, isHead: false,
      manager: p.manager, self: {}, selfTexts: {}, ratings: [], excluded: [], recogFrom: [], recogWhy: [], hasSelf: false };
  });

  var personRecs = [], deptRecs = [];
  recs.forEach(function (r) {
    if (r.form === 'SELF') {
      var P = persons[r.rater];
      if (!P) { flag('UNKNOWN_RATER', 'MED', r.rater, '', t_('flag.UNKNOWN_RATER.self'), r.rater); return; }
      P.self = r.scores || {}; P.selfTexts = r.texts || {}; P.selfEvidence = r.evidence || {}; P.hasSelf = true;
      (r.recog || []).forEach(function (e) {
        e = lower_(e);
        if (persons[e] && e !== r.rater) { persons[e].recogFrom.push(r.rater); if (r.texts && r.texts.R_WHY) persons[e].recogWhy.push(r.texts.R_WHY); }
      });
    } else if (r.form === 'PERSON') personRecs.push(r);
    else if (r.form === 'DEPT') deptRecs.push(r);
  });

  personRecs.forEach(function (r) {
    var P = persons[r.ratee];
    if (!P) { flag('UNKNOWN_RATEE', 'MED', r.ratee, '', t_('flag.UNKNOWN_RATEE.detail'), r.rater); return; }
    if (!byEmail[r.rater]) { flag('UNKNOWN_RATER', 'MED', r.ratee, '', t_('flag.UNKNOWN_RATER.person'), r.rater); return; }
    if (r.rater === r.ratee) { flag('SELF_IN_PEER_FORM', 'MED', r.ratee, '', t_('flag.SELF_IN_PEER_FORM.detail'), r.rater); return; }
    var rel = deriveRel_(r.rater, r.ratee, byEmail);
    if (r.relDeclared && r.relDeclared !== rel) {
      flag('REL_MISMATCH', 'LOW', r.ratee, byEmail[r.rater].name, t_('flag.REL_MISMATCH.detail', { said: t_('rel.' + r.relDeclared), real: t_('rel.' + rel) }), r.rater);
    }
    var w = FREQ_WEIGHT[r.freq] != null ? FREQ_WEIGHT[r.freq] : 1.0;
    var entry = { rater: r.rater, rel: rel, w: w, scores: r.scores || {}, evidence: r.evidence || {}, texts: r.texts || {}, rid: r.rid };
    var raterName = byEmail[r.rater].name, autoReasons = [];

    if (!assignSet[r.rater + '>' + r.ratee]) autoReasons.push('UNASSIGNED');
    var vals = CI.map(function (q) { return entry.scores[q]; }).filter(function (v) { return v != null; });
    if (CI.length >= 6 && vals.length >= 6 && vals.every(function (v) { return v === vals[0]; }) && (vals[0] === 1 || vals[0] === 5)) autoReasons.push('STRAIGHT_LINE');
    var evTexts = {};
    Object.keys(entry.scores).forEach(function (q) {
      var v = entry.scores[q];
      if (EXTREME.indexOf(v) < 0) return;
      var ev = String(entry.evidence[q] || '').trim();
      if (ev) evTexts[ev] = (evTexts[ev] || 0) + 1;
      if (ev.length < cfg.WEAK_EVIDENCE_CHARS || isJunkText_(ev)) flag('WEAK_EVIDENCE', 'LOW', r.ratee, raterName, t_('flag.WEAK_EVIDENCE.detail', { v: v, item: titleOf_(q) }), r.rater);
    });
    Object.keys(evTexts).forEach(function (t) {
      if (evTexts[t] >= 3) flag('COPIED_EVIDENCE', 'MED', r.ratee, raterName, t_('flag.COPIED_EVIDENCE.detail', { n: evTexts[t] }), r.rater);
    });

    var decision = decisions[r.rater + '>' + r.ratee];
    var excluded = decision === 'EXCLUDE' || (decision !== 'KEEP' && autoReasons.length > 0);
    var tail = excluded ? (decision === 'EXCLUDE' ? t_('flag.tail.excludedByYou') : t_('flag.tail.excludedAuto'))
      : (decision === 'KEEP' && autoReasons.length ? t_('flag.tail.keptByYou') : '');
    if (autoReasons.indexOf('UNASSIGNED') >= 0) flag('UNASSIGNED', 'MED', r.ratee, raterName, t_('flag.UNASSIGNED.detail') + tail, r.rater);
    if (autoReasons.indexOf('STRAIGHT_LINE') >= 0) flag('STRAIGHT_LINE', 'HIGH', r.ratee, raterName, t_('flag.STRAIGHT_LINE.detail', { v: vals[0] }) + tail, r.rater);
    if (decision === 'EXCLUDE' && !autoReasons.length) flag('EXCLUDED_BY_YOU', 'LOW', r.ratee, raterName, t_('flag.EXCLUDED_BY_YOU.detail'), r.rater);

    entry.excluded = excluded;
    allPersonEntries.push({ ratee: r.ratee, entry: entry });
    if (excluded) P.excluded.push(entry); else P.ratings.push(entry);
  });

  Object.keys(persons).forEach(function (e) {
    var P = persons[e], others = P.ratings;
    P.nRaters = others.length;
    P.nByGroup = { HEAD: 0, TEAM: 0, PEERS: 0 };
    others.forEach(function (x) { P.nByGroup[groupOf_(x.rel)]++; });
    P.scores = {};
    CI.concat(LI, HI).forEach(function (q) {
      var g = { HEAD: [], TEAM: [], PEERS: [] }, all = [];
      others.forEach(function (x) { var v = x.scores[q]; if (v == null) return; g[groupOf_(x.rel)].push([v, x.w]); all.push([v, x.w]); });
      P.scores[q] = { self: P.self[q] != null ? P.self[q] : null, head: round2_(wmean_(g.HEAD)), team: round2_(wmean_(g.TEAM)),
        peers: round2_(wmean_(g.PEERS)), others: round2_(wmean_(all)), n: all.length };
      P.scores[q].gap = (P.scores[q].self != null && P.scores[q].others != null) ? round2_(P.scores[q].self - P.scores[q].others) : null;
    });
    P.coreOthers = round2_(mean_(CI.map(function (q) { return P.scores[q].others; })));
    P.coreSelf = round2_(mean_(CI.map(function (q) { return P.scores[q].self; })));
    P.leadOthers = round2_(mean_(LI.map(function (q) { return P.scores[q].others; })));
    P.leadTeam = round2_(mean_(LI.map(function (q) { return P.scores[q].team; })));
    P.leadSelf = round2_(mean_(LI.map(function (q) { return P.scores[q].self; })));
    // confidentiality: a group is shown on its own only with MIN_GROUP people or more
    P.showTeamSeparately = P.nByGroup.TEAM >= cfg.MIN_GROUP;
    P.showPeersSeparately = P.nByGroup.PEERS >= cfg.MIN_GROUP;
    P.releasable = P.nRaters >= cfg.MIN_GROUP;
    var ranked = CI.filter(function (q) { return P.scores[q].others != null; }).sort(function (a, b) { return P.scores[b].others - P.scores[a].others; });
    P.strengths = ranked.slice(0, 3);
    P.devAreas = ranked.slice(-3).reverse();
    P.blindOver = CI.filter(function (q) { return P.scores[q].gap != null && P.scores[q].gap >= cfg.BLIND_SPOT; });
    P.blindUnder = CI.filter(function (q) { return P.scores[q].gap != null && P.scores[q].gap <= -cfg.BLIND_SPOT; });
    P.nExcluded = P.excluded.length;
    var c1 = P.scores.C1; // C1 = responsiveness in the default question bank
    if (c1 && c1.others != null && c1.n >= 2 && c1.others <= 2.5) flag('LOW_RESPONSIVENESS', 'MED', e, '', t_('flag.LOW_RESPONSIVENESS.detail', { n: c1.n, v: c1.others, item: titleOf_('C1') }));
    if (P.coreSelf != null && P.coreOthers != null && P.coreSelf - P.coreOthers >= cfg.BLIND_SPOT) flag('BLIND_SPOT', 'MED', e, '', t_('flag.BLIND_SPOT.detail', { self: P.coreSelf, others: P.coreOthers }));
  });

  // one rater far from the others, and very high ratings exchanged between two colleagues
  var pairMean = {};
  allPersonEntries.forEach(function (a) { pairMean[a.entry.rater + '>' + a.ratee] = { m: mean_(CI.map(function (q) { return a.entry.scores[q]; })), rel: a.entry.rel }; });
  Object.keys(persons).forEach(function (e) {
    var P = persons[e];
    P.ratings.forEach(function (x) {
      var m = mean_(CI.map(function (q) { return x.scores[q]; }));
      var rest = P.ratings.filter(function (y) { return y.rater !== x.rater; })
        .map(function (y) { return mean_(CI.map(function (q) { return y.scores[q]; })); }).filter(function (v) { return v != null; });
      if (rest.length >= 2 && m != null) {
        var d = m - mean_(rest);
        if (Math.abs(d) >= cfg.OUTLIER) flag('OUTLIER', 'HIGH', e, byEmail[x.rater] ? byEmail[x.rater].name : x.rater,
          t_(d < 0 ? 'flag.OUTLIER.lower' : 'flag.OUTLIER.higher', { m: round2_(m), rest: round2_(mean_(rest)) }), x.rater);
      }
    });
  });
  Object.keys(pairMean).forEach(function (k) {
    var ab = k.split('>'), rev = ab[1] + '>' + ab[0];
    if (ab[0] < ab[1] && pairMean[rev]) {
      var p1 = pairMean[k], p2 = pairMean[rev];
      var peers = String(p1.rel).indexOf('PEER') === 0 && String(p2.rel).indexOf('PEER') === 0;
      if (peers && p1.m >= cfg.MUTUAL_HIGH && p2.m >= cfg.MUTUAL_HIGH) flag('MUTUAL_HIGH', 'MED', ab[1], persons[ab[0]] ? persons[ab[0]].name : ab[0],
        t_('flag.MUTUAL_HIGH.detail', { a: round2_(p1.m), b: round2_(p2.m) }), ab[0]);
    }
  });

  // manager accountability: did the manager set expectations and discuss weaknesses before rating them low?
  var memberSays = {};
  Object.keys(persons).forEach(function (e) {
    persons[e].ratings.forEach(function (x) { if (x.rel === 'MEMBER_TO_HEAD') memberSays[x.rater + '>' + e] = x.texts || {}; });
  });
  Object.keys(persons).forEach(function (e) {
    var P = persons[e], H = persons[P.manager];
    var hx = P.ratings.filter(function (x) { return x.rel === 'HEAD_TO_MEMBER'; })[0];
    var ms = memberSays[e + '>' + P.manager] || {};
    P.expected = { selfExpect: P.selfTexts.S_EXPECT || '', selfAch: P.selfTexts.S_ACH || '', selfContrib: P.selfTexts.S_CONTRIB || '',
      head: hx && hx.scores.X1 != null ? hx.scores.X1 : null, headEvidence: hx ? (hx.evidence.X1 || '') : '', headSet: hx ? (hx.texts.H_SET || '') : '',
      memberSet: ms.M_SET || '' };
    if (!hx || !H) return;
    var lowQs = Object.keys(hx.scores).filter(function (q) { return LOW_SCORES.indexOf(hx.scores[q]) >= 0; });
    var t = hx.texts || {};
    var row = { member: e, name: P.name, low: lowQs.length, lowTitles: lowQs.map(titleOf_), set: t.H_SET || '', disc: t.H_DISC || '',
      did: t.H_DID || '', mine: t.H_MINE || '', memberSet: ms.M_SET || '', memberTold: ms.M_TOLD || '', memberHelp: ms.M_HELP || '', noFollowUp: false };
    if (lowQs.length && (t.H_DISC === 'DISC_NO' || ms.M_TOLD === 'TOLD_NEVER')) {
      row.noFollowUp = true;
      flag('NO_FOLLOW_UP', 'HIGH', P.manager, P.name, t_(t.H_DISC === 'DISC_NO' ? 'flag.NO_FOLLOW_UP.head' : 'flag.NO_FOLLOW_UP.member',
        { name: P.name, n: lowQs.length, items: row.lowTitles.join(', ') }), P.manager);
    }
    if (t.H_SET === 'SET_NO' || ms.M_SET === 'SET_NO') {
      flag('NO_EXPECTATIONS', 'MED', P.manager, P.name, t_(t.H_SET === 'SET_NO' ? 'flag.NO_EXPECTATIONS.head' : 'flag.NO_EXPECTATIONS.member', { name: P.name }), P.manager);
    }
    (H.managing = H.managing || []).push(row);
  });

  // a manager who rates the team much lower than everyone else does, while the team rates the leadership low
  var blame = [];
  Object.keys(persons).forEach(function (h) {
    var H = persons[h];
    var members = Object.keys(persons).filter(function (e) { return persons[e].manager === h; });
    if (!members.length) return;
    H.isHead = true;
    var headView = [], othersView = [];
    members.forEach(function (m) {
      persons[m].ratings.forEach(function (x) {
        var v = mean_(CI.map(function (q) { return x.scores[q]; }));
        if (v == null) return;
        if (x.rater === h) headView.push(v); else othersView.push(v);
      });
    });
    var hv = mean_(headView), ov = mean_(othersView);
    var gap = (hv != null && ov != null) ? hv - ov : null;
    var up = H.leadTeam != null ? H.leadTeam : H.leadOthers;
    var respTeam = H.scores.L4 ? (H.scores.L4.team != null ? H.scores.L4.team : H.scores.L4.others) : null;
    var peerComm = H.scores.C2 ? H.scores.C2.peers : null;
    var row = { head: h, name: H.name, dept: H.dept, teamSize: members.length,
      headViewOfTeam: round2_(hv), othersViewOfTeam: round2_(ov), gap: round2_(gap),
      teamViewOfLeadership: round2_(up), teamViewOfResponsibility: round2_(respTeam),
      peersViewOfCommunication: round2_(peerComm), selfLeadership: H.leadSelf, pattern: false,
      noFollowUp: (H.managing || []).filter(function (m) { return m.noFollowUp; }).length,
      noExpectations: (H.managing || []).filter(function (m) { return m.set === 'SET_NO' || m.memberSet === 'SET_NO'; }).length };
    if (gap != null && gap <= cfg.BLAME_GAP && up != null && up <= cfg.BLAME_UPWARD_MAX) {
      row.pattern = true;
      flag('BLAME_PATTERN', 'HIGH', h, '', t_('flag.BLAME_PATTERN.detail', { hv: round2_(hv), ov: round2_(ov), up: round2_(up) }) +
        (row.noFollowUp ? t_('flag.BLAME_PATTERN.noFollow', { n: row.noFollowUp }) : '') + t_('flag.BLAME_PATTERN.check'));
    }
    H.blame = row;
    blame.push(row);
  });

  // recognition, and people whose good work is not seen
  var stars = Object.keys(persons).map(function (e) {
    var P = persons[e];
    return { email: e, name: P.name, dept: P.dept, recogCount: P.recogFrom.length, others: P.coreOthers, self: P.coreSelf,
      humble: P.coreSelf != null && P.coreOthers != null && P.coreSelf - P.coreOthers <= -0.5, why: P.recogWhy };
  }).filter(function (s) { return s.recogCount > 0 || (s.others != null && s.others >= 4.2); })
    .sort(function (a, b) { return (b.recogCount - a.recogCount) || ((b.others || 0) - (a.others || 0)); });
  stars.forEach(function (s) { s.hidden = s.recogCount >= 2 || (s.humble && s.others >= 4); });

  // progress
  var done = {}, deptDone = {};
  personRecs.forEach(function (r) { done[r.rater + '>' + r.ratee] = 1; });
  deptRecs.forEach(function (r) { deptDone[r.rater] = (deptDone[r.rater] || 0) + 1; });
  var completion = Object.keys(persons).filter(function (e) { return !isNoEmail_(e); }).map(function (e) {
    var mine = (assignments || []).filter(function (a) { return lower_(a.rater) === e && persons[lower_(a.ratee)]; }); // people who left do not count
    var d = mine.filter(function (a) { return done[e + '>' + lower_(a.ratee)]; }).length;
    var total = mine.length + 1, finished = d + (persons[e].hasSelf ? 1 : 0);
    var pending = mine.filter(function (a) { return !done[e + '>' + lower_(a.ratee)]; })
      .map(function (a) { var q = persons[lower_(a.ratee)]; return q ? q.name : a.ratee; });
    return { email: e, name: persons[e].name, dept: persons[e].dept, assigned: mine.length, done: d,
      pct: round2_(finished / total), self: persons[e].hasSelf, deptForms: deptDone[e] || 0, pending: pending };
  });

  // departments
  var depts = {};
  team.forEach(function (p) { if (p.active !== false && p.dept) depts[p.dept] = 1; });
  depts = Object.keys(depts).sort();
  var matrix = {}, deptItems = {}, deptEvidence = {};
  depts.forEach(function (d) { matrix[d] = {}; deptItems[d] = {}; deptEvidence[d] = []; DI.forEach(function (q) { deptItems[d][q] = []; }); });
  deptRecs.forEach(function (r) {
    var rater = byEmail[r.rater];
    if (!rater) { flag('UNKNOWN_RATER', 'MED', r.ratee, '', t_('flag.UNKNOWN_RATER.dept'), r.rater); return; }
    if (!matrix[r.ratee] || !matrix[rater.dept]) return; // a department that has no active people any more
    if (rater.dept === r.ratee) { flag('OWN_DEPT', 'LOW', r.ratee, rater.name, t_('flag.OWN_DEPT.detail'), r.rater); return; }
    var m = mean_(DI.map(function (q) { return (r.scores || {})[q]; }));
    if (m == null) return; // "I have not dealt with this department"
    (matrix[rater.dept][r.ratee] = matrix[rater.dept][r.ratee] || []).push(m);
    DI.forEach(function (q) { if ((r.scores || {})[q] != null) deptItems[r.ratee][q].push(r.scores[q]); });
    if (r.texts && r.texts.D_EX) deptEvidence[r.ratee].push({ from: rater.dept, text: r.texts.D_EX, sugg: r.texts.D_SUG || '' });
  });
  var deptMatrix = {};
  depts.forEach(function (a) { deptMatrix[a] = {}; depts.forEach(function (b) { deptMatrix[a][b] = matrix[a] && matrix[a][b] ? round2_(mean_(matrix[a][b])) : null; }); });
  var deptSummary = depts.map(function (d) {
    var members = Object.keys(persons).filter(function (e) { return persons[e].dept === d; });
    var perItem = {}, coreAvg = {};
    DI.forEach(function (q) { perItem[q] = round2_(mean_(deptItems[d][q])); });
    CI.forEach(function (q) { coreAvg[q] = round2_(mean_(members.map(function (e) { return persons[e].scores[q].others; }))); });
    return { dept: d, members: members.length, received: round2_(mean_(DI.map(function (q) { return perItem[q]; }))),
      perItem: perItem, coreAvg: coreAvg, evidence: deptEvidence[d] };
  });

  var orgWeak = CI.map(function (q) {
    var vals = Object.keys(persons).map(function (e) { return persons[e].scores[q].others; }).filter(function (v) { return v != null; });
    return { qid: q, title: titleOf_(q), avg: round2_(mean_(vals)),
      pctBelow3: vals.length ? round2_(vals.filter(function (v) { return v < 3; }).length / vals.length) : null, n: vals.length };
  }).filter(function (x) { return x.avg != null; }).sort(function (a, b) { return a.avg - b.avg; });

  completion.forEach(function (c) {
    if (c.pct != null && c.pct < 0.5) flag('LOW_COMPLETION', 'LOW', c.email, '', t_(c.self ? 'flag.LOW_COMPLETION.detail' : 'flag.LOW_COMPLETION.noSelf', { d: c.done, n: c.assigned }));
  });

  return { persons: persons, flags: flags, blame: blame, stars: stars, completion: completion,
    deptMatrix: deptMatrix, depts: depts, deptSummary: deptSummary, orgWeak: orgWeak };
}

/** One person's task list for the personal page: what is theirs to do, and what they already did. */
function tasksFor_(email, team, assignments, records, paper, deptCtx) {
  email = lower_(email); deptCtx = deptCtx || {};
  var byEmail = indexTeam_(team), me = byEmail[email];
  if (!me || me.active === false || (isNoEmail_(email) && !paper)) return null;
  var latest = {};
  records.filter(function (r) { return r.rater === email; }).forEach(function (r) {
    var k = r.form + '|' + r.ratee;
    if (!latest[k] || (r.ts || 0) >= (latest[k].ts || 0)) latest[k] = r;
  });
  function prev(r) { return r ? { ts: r.ts || 0, scores: r.scores || {}, evidence: r.evidence || {}, texts: r.texts || {}, freq: r.freq || '', recog: r.recog || [] } : null; }
  var selfRec = latest['SELF|' + email];
  var persons = (assignments || []).filter(function (a) { var t = byEmail[lower_(a.ratee)]; return lower_(a.rater) === email && t && t.active !== false; })
    .map(function (a) {
      var p = byEmail[lower_(a.ratee)], r = latest['PERSON|' + p.email];
      return { person: p, rel: deriveRel_(email, p.email, byEmail), reason: a.reason || '', showLead: leadAllowed_(email, p.email, byEmail), done: !!r, prev: prev(r) };
    });
  var deptList = paper ? [] : linkedDepts_(me.dept, team, deptCtx.deptLinks, deptCtx.deptRatings).sort()
    .map(function (d) { var r = latest['DEPT|' + d]; return { dept: d, done: !!r, prev: prev(r) }; });
  var total = 1 + persons.length, done = (selfRec ? 1 : 0) + persons.filter(function (x) { return x.done; }).length;
  return { me: me, selfDone: !!selfRec, selfPrev: prev(selfRec), isHead: hasReports_(email, byEmail),
    persons: persons, depts: deptList, done: done, total: total, deptsDone: deptList.filter(function (d) { return d.done; }).length };
}

/**
 * Drafts: what someone wrote but has not sent is saved automatically, so nothing is lost when they stop and come back.
 * Key: 'SELF', 'PERSON|<email>' or 'DEPT|<department>' — accepted only if it is one of that person's own tasks.
 */
function draftKeyAllowed_(key, email, team, assignments, paper, deptCtx) {
  var T = tasksFor_(email, team, assignments, [], paper, deptCtx);
  if (!T) return false;
  key = String(key || '');
  if (key === 'SELF') return true;
  if (key.indexOf('PERSON|') === 0) { var r = lower_(key.slice(7)); return T.persons.some(function (x) { return x.person.email === r; }); }
  if (key.indexOf('DEPT|') === 0) { var d = key.slice(5); return !paper && T.depts.some(function (x) { return x.dept === d; }); }
  return false;
}
/** Keeps only known fields of a draft, with sensible lengths. Nothing in a draft counts in the results. */
function cleanDraft_(p) {
  p = p || {};
  function obj(o, isScore) {
    var out = {}; o = o && typeof o === 'object' ? o : {};
    Object.keys(o).slice(0, 80).forEach(function (k) {
      if (!/^[A-Z_0-9]{1,16}$/.test(k)) return;
      var v = o[k];
      if (isScore) { if (v === null || (Number(v) >= 1 && Number(v) <= 5)) out[k] = v === null ? null : Number(v); }
      else out[k] = String(v == null ? '' : v).slice(0, 3000);
    });
    return out;
  }
  return { scores: obj(p.scores, true), evidence: obj(p.evidence), texts: obj(p.texts), freq: String(p.freq || '').slice(0, 20),
    recog: (Array.isArray(p.recog) ? p.recog : []).slice(0, 3).map(function (x) { return String(x || '').slice(0, 120); }) };
}
function draftKeyFor_(rec) { return rec.form === 'SELF' ? 'SELF' : rec.form + '|' + rec.ratee; }

/** Filler text: very few distinct characters (like "aaaaa" or "....."). */
function isJunkText_(t) {
  var s = String(t || '').replace(/\s/g, '');
  if (!s) return true;
  var uniq = {}; s.split('').forEach(function (c) { uniq[c] = 1; });
  return Object.keys(uniq).length < Math.max(5, s.length * 0.15);
}
function groupOf_(rel) {
  if (rel === 'HEAD_TO_MEMBER') return 'HEAD';
  if (rel === 'MEMBER_TO_HEAD') return 'TEAM';
  return 'PEERS';
}
