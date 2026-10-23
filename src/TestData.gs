/**
 * nonprofit-360 — made-up answers with known stories, for the built-in test and the automatic checks.
 * Uses the example team (Bank.gs). Nothing here is real.
 * Stories: 1) a finance manager who rates the team harshly while everyone else rates them well, and never discussed it
 * 2) someone slow to respond  3) a quiet star  4) a revenge rating  5) two colleagues flattering each other
 * 6) a duplicate answer  7) filler and copied examples  + department ratings where finance is seen as slow.
 */
function testTeam_() { return exampleTeam_(lang_()); }
function testDept_(i) { return (EXAMPLE_TEAM[lang_()] || EXAMPLE_TEAM.en)[i][2]; }
function testRecords_() {
  var CI = coreIds_(), LI = leadIds_(), DI = deptIds_();
  var ts = 1790000000000, rid = 0, out = [];
  function sc(ids, v) { var o = {}; ids.forEach(function (q, i) { o[q] = typeof v === 'function' ? v(q, i) : v; }); return o; }
  function ev(scores) { var o = {}; Object.keys(scores).forEach(function (q) { if (EXTREME.indexOf(scores[q]) >= 0) o[q] = t_('test.example', { item: titleOf_(q) }); }); return o; }
  function person(rater, ratee, scores, freq, texts) {
    out.push({ form: 'PERSON', rid: 'T' + (++rid), ts: ts + rid, rater: rater, ratee: ratee, relDeclared: '', freq: freq || 'WEEKLY',
      scores: scores, evidence: ev(scores), texts: Object.assign({ O_START: t_('test.start'), O_KEEP: t_('test.keep') }, texts || {}) });
  }
  function self(rater, scores, texts, recog) {
    out.push({ form: 'SELF', rid: 'T' + (++rid), ts: ts + rid, rater: rater, ratee: rater, relDeclared: 'SELF', freq: '',
      scores: scores, evidence: ev(scores), texts: texts || { S_ACH: t_('test.ach'), S_PLAN: t_('test.plan') }, recog: recog || [] });
  }
  function dept(rater, target, v) {
    out.push({ form: 'DEPT', rid: 'T' + (++rid), ts: ts + rid, rater: rater, ratee: target, freq: 'WEEKLY',
      scores: sc(DI, v), evidence: {}, texts: { D_EX: t_('test.deptExample'), D_SUG: t_('test.deptSugg') } });
  }
  var K = 'khaled@example.org', S = 'saeed@example.org', M = 'mona@example.org', R = 'rami@example.org',
      H = 'hala@example.org', KA = 'karim@example.org', Y = 'yasmin@example.org', O = 'omar@example.org', L = 'laila@example.org';
  var FIN = testDept_(1), PRG = testDept_(6);

  // 1) harsh manager, never discussed weaknesses, never set expectations; the team says they were never told
  [S, M, R].forEach(function (m) { person(K, m, Object.assign(sc(CI, 2), { X1: 2 }), null, { H_SET: 'SET_NO', H_DISC: 'DISC_NO', H_DID: '', H_MINE: t_('test.headMine') }); });
  [S, M, R].forEach(function (m) { person(H, m, sc(CI, 4)); person(O, m, sc(CI, function (q, i) { return i % 2 ? 4 : 3; })); });
  [S, M, R].forEach(function (m) { person(m, K, Object.assign(sc(CI, function (q, i) { return i === 1 ? 2 : 3; }), sc(LI, function (q) { return q === 'L4' ? 1 : 2; })), null, { M_SET: 'SET_NO', M_TOLD: 'TOLD_NEVER' }); });
  person(H, K, sc(CI, function (q) { return q === 'C2' ? 2 : 3; }));
  person(O, K, sc(CI, function (q) { return q === 'C2' ? 2 : 3; }));
  self(K, Object.assign(sc(CI, 5), sc(LI, 5)), { S_ACH: t_('test.ach'), S_TEAMCH: t_('test.teamch'), S_PLAN: t_('test.plan') });

  // 2) slow to respond; a good manager who warned, documented and followed up
  person(H, KA, Object.assign(sc(CI, function (q) { return q === 'C1' || q === 'C3' ? 2 : 3; }), { X1: 3 }), null,
    { H_SET: 'SET_WRITTEN', H_DISC: 'DISC_DOC', H_DID: t_('test.headDid'), H_MINE: t_('test.headMine2') });
  person(Y, KA, sc(CI, function (q) { return q === 'C1' || q === 'C3' ? 1 : 3; }));
  person(S, KA, sc(CI, function (q) { return q === 'C1' ? 2 : 3; }));

  // 3) a quiet star: modest self-rating, recognised by colleagues
  person(H, Y, sc(CI, function (q, i) { return i % 4 ? 5 : 4; })); person(M, Y, sc(CI, function (q, i) { return i % 2 ? 5 : 4; })); person(S, Y, sc(CI, function (q, i) { return i % 3 ? 5 : 4; }));
  self(Y, sc(CI, 3), { S_ACH: t_('test.ach'), S_PLAN: t_('test.plan') });
  self(S, sc(CI, 4), { S_ACH: t_('test.ach'), S_PLAN: t_('test.plan') }, [Y]);
  self(M, sc(CI, 4), { S_ACH: t_('test.ach'), S_PLAN: t_('test.plan') }, [Y, S]);

  // 4) revenge: 1 on every item, and not assigned
  person(L, Y, sc(CI, 1), 'RARELY');

  // 5) two colleagues flattering each other
  person(O, H, sc(CI, 5)); person(H, O, sc(CI, 5));
  person(Y, H, Object.assign(sc(CI, 4), sc(LI, 5)));
  person(L, O, Object.assign(sc(CI, 4), sc(LI, 4)));

  // 7) filler and copied examples
  var copied = t_('test.copied');
  out.push({ form: 'PERSON', rid: 'T' + (++rid), ts: ts + rid, rater: R, ratee: S, relDeclared: '', freq: 'WEEKLY',
    scores: sc(CI, function (q, i) { return i < 4 ? 2 : 3; }), evidence: { C1: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', C2: copied, C3: copied, C4: copied }, texts: {} });

  // 6) a duplicate: only the latest counts
  person(H, M, sc(CI, 3));

  // departments: finance is seen as slow
  dept(H, FIN, function (q) { return q === 'D1' || q === 'D4' ? 2 : 3; });
  dept(Y, FIN, function (q) { return q === 'D1' ? 1 : 3; });
  dept(O, FIN, 2);
  dept(S, PRG, 4);
  dept(K, PRG, 4);
  dept(L, FIN, 3);
  return out;
}
/** Assignments for the test: the real rules on the example team, plus every test pair — except the revenge rating. */
function testAssignments_() {
  var team = testTeam_(), a = generateAssignments_(team, exampleLinks_(lang_()), []), seen = {};
  a.forEach(function (x) { seen[x.rater + '>' + x.ratee] = 1; });
  testRecords_().forEach(function (r) {
    if (r.form === 'PERSON' && !seen[r.rater + '>' + r.ratee]) { seen[r.rater + '>' + r.ratee] = 1; a.push({ rater: r.rater, ratee: r.ratee, rel: 'PEER_OTHER', reason: '' }); }
  });
  return a.filter(function (x) { return !(x.rater === 'laila@example.org' && x.ratee === 'yasmin@example.org'); });
}
