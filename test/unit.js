// Unit checks of the analysis, the pairing rules, the checks and the answer validation — in English and in Arabic.
// Runs the real .gs files in a Node sandbox on the made-up example team. `node test/unit.js`
'use strict';
const { load } = require('../tools/lib');
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log('FAIL ' + msg); } }

for (const L of ['en', 'ar']) {
  const ctx = load(); ctx.useSettings_({ LANGUAGE: L });
  const tag = '[' + L + '] ';
  const team = ctx.testTeam_(), asg = ctx.testAssignments_(), recs = ctx.testRecords_();
  const R = ctx.analyze_(team, asg, recs, [], ctx.analysisCfg_());
  const P = R.persons, has = (type, email) => R.flags.some(f => f.type === type && (!email || f.person === email || f.rater === email));
  const K = 'khaled@example.org', S = 'saeed@example.org', Y = 'yasmin@example.org', KA = 'karim@example.org', LA = 'laila@example.org', H = 'hala@example.org', O = 'omar@example.org';

  // 1) the harsh manager
  ok(has('BLAME_PATTERN', K), tag + 'blame signal for the harsh finance manager');
  ok(!has('BLAME_PATTERN', H) && !has('BLAME_PATTERN', O), tag + 'no blame signal for the other managers');
  const kb = R.blame.find(b => b.head === K);
  ok(kb && kb.headViewOfTeam === 2 && kb.othersViewOfTeam > 3, tag + 'manager view 2 vs others > 3');
  ok(kb.teamViewOfResponsibility === 1, tag + 'team rates L4 = 1');
  ok(kb.noFollowUp === 3 && kb.noExpectations === 3, tag + 'three members without follow-up and without expectations');
  ok(has('NO_FOLLOW_UP', K) && has('NO_EXPECTATIONS', K), tag + 'criticism without follow-up and no expectations flagged on the manager');
  ok(has('BLIND_SPOT', K), tag + 'manager\'s self-rating blind spot');
  // 2) slow to respond
  ok(P[KA].devAreas.includes('C1'), tag + 'responsiveness is a development area for Karim');
  ok(has('LOW_RESPONSIVENESS', KA), tag + 'Karim seen as slow');
  ok(has('LOW_COMPLETION', KA), tag + 'Karim has not finished');
  ok(!P[H].managing.find(m => m.member === KA).noFollowUp, tag + 'the good manager who followed up is not flagged');
  // 3) quiet star
  const y = R.stars.find(s => s.email === Y);
  ok(y && y.recogCount === 2 && y.hidden && y.humble, tag + 'Yasmin: recognised twice, a quiet star, underrates herself');
  // 4) revenge
  ok(R.flags.some(f => f.type === 'STRAIGHT_LINE' && f.rater === LA), tag + 'revenge straight-line flagged');
  ok(P[Y].excluded.some(x => x.rater === LA) && !P[Y].ratings.some(x => x.rater === LA), tag + 'revenge rating kept out of the score');
  ok(R.flags.some(f => f.type === 'UNASSIGNED' && f.rater === LA), tag + 'unassigned rating flagged');
  // the admin's word beats the rule
  const R2 = ctx.analyze_(team, asg, recs, [{ rater: LA, ratee: Y, decision: 'KEEP' }], ctx.analysisCfg_());
  ok(R2.persons[Y].ratings.some(x => x.rater === LA), tag + '"keep" brings an auto-excluded rating back');
  const R3 = ctx.analyze_(team, asg, recs, [{ rater: H, ratee: Y, decision: 'EXCLUDE' }], ctx.analysisCfg_());
  ok(R3.persons[Y].excluded.some(x => x.rater === H) && R3.flags.some(f => f.type === 'EXCLUDED_BY_YOU'), tag + '"exclude" removes a rating');
  ok(ctx.decisionCode_('keep') === 'KEEP' && ctx.decisionCode_('إبقاء') === 'KEEP' && ctx.decisionCode_('استبعاد') === 'EXCLUDE' && ctx.decisionCode_('Exclude') === 'EXCLUDE', tag + 'decisions read in both languages');
  // 5) mutual flattery, 6) duplicates, 7) filler
  ok(has('MUTUAL_HIGH'), tag + 'mutual high rating flagged');
  ok(has('DUPLICATE'), tag + 'duplicate found');
  const hm = P['mona@example.org'].ratings.filter(x => x.rater === H);
  ok(hm.length === 1 && hm[0].scores.C1 === 3, tag + 'only the latest duplicate counts');
  ok(has('COPIED_EVIDENCE') && has('WEAK_EVIDENCE'), tag + 'copied and filler examples flagged');
  // confidentiality
  ok(P[LA].releasable === false && P[Y].releasable === true, tag + 'fewer than 3 raters → not releasable');
  ok(P[K].showTeamSeparately === true, tag + 'a group of 3 is shown on its own');
  const R4 = ctx.analyze_(team, asg, recs, [], Object.assign(ctx.analysisCfg_(), { MIN_GROUP: 4 }));
  ok(R4.persons[K].showTeamSeparately === false && R4.persons[Y].releasable === false, tag + 'minimum group size setting is respected');
  // departments
  const fin = R.deptSummary.find(d => d.dept === ctx.testDept_(1));
  ok(fin && fin.received < 3 && fin.perItem.D1 <= 2, tag + 'finance seen as slow by other departments');
  ok(R.orgWeak.length === 8, tag + 'organisation ranking covers the 8 core items');

  // pairing rules
  const ex = ctx.generateAssignments_(team, ctx.exampleLinks_(L), []);
  const key = a => a.rater + '>' + a.ratee, set = new Set(ex.map(key));
  ok(ex.every(a => a.rater !== a.ratee), tag + 'nobody rates themselves');
  ok(ex.every(a => String(a.reason).trim()), tag + 'every pair has a reason');
  ok(set.has(K + '>' + S) && set.has(S + '>' + K), tag + 'manager and member rate each other');
  ok(set.has(K + '>' + H) && set.has(H + '>' + O) && set.has(O + '>' + K), tag + 'managers rate each other');
  ok(!ex.some(a => a.ratee === 'nadia@example.org' && team.find(p => p.email === a.rater).manager !== 'nadia@example.org'), tag + 'the head is rated only by direct reports');
  ok(set.has('karim@example.org>rami@example.org') && set.has('rami@example.org>karim@example.org'), tag + 'a two-way work link works');
  const exNoMesh = ctx.generateAssignments_(team, [], [], { managersMesh: false });
  ok(!exNoMesh.some(a => a.rater === K && a.ratee === H), tag + 'managers mesh can be turned off');
  const exNever = ctx.generateAssignments_(team, ctx.exampleLinks_(L), [{ a: 'karim@example.org', b: 'rami@example.org' }, { a: K, b: S }]);
  ok(!exNever.some(a => (a.rater === 'karim@example.org' && a.ratee === 'rami@example.org') || (a.rater === S && a.ratee === K)), tag + '"never pair" removes a pair in both directions, whatever rule made it');

  // checks
  const good = ctx.checkOrg_(team, ctx.exampleLinks_(L), [], {}, { deadline: 'x' });
  ok(good.length === 0, tag + 'the example team passes every check');
  const broken = JSON.parse(JSON.stringify(team));
  broken[2].manager = 'nobody@example.org'; broken[3].email = broken[4].email; broken[5].manager = broken[5].email;
  const bad = ctx.checkOrg_(broken, [{ rater: 'ghost@example.org', ratee: K, reason: '' }], [], { Nowhere: [] }, {});
  const lv = bad.filter(x => x.level === 'error').map(x => x.msg).join(' | ');
  ok(/nobody@example.org/.test(lv) && bad.filter(x => x.level === 'error').length >= 4, tag + 'checks explain a missing manager, a duplicate email, a self-manager and an unknown person');
  ok(bad.some(x => x.level === 'warn' && /Nowhere/.test(x.msg)), tag + 'an unknown department in department links is pointed out');

  // validation of answers from the page
  const tk = ctx.tasksFor_(KA, team, asg, recs);
  ok(tk && tk.total === 1 + tk.persons.length && tk.persons.every(x => x.person && x.rel), tag + 'task list for Karim');
  ok(tk.depts.every(d => d !== ctx.testDept_(6)), tag + 'own department is not offered');
  ok(ctx.tasksFor_('stranger@example.net', team, asg, []) === null, tag + 'an outsider gets no page');
  ok(ctx.tasksFor_('no-email:' + team[5].name, team, asg, []) === null, tag + 'someone without an account gets no page (paper instead)');
  ok(ctx.tasksFor_('no-email:' + team[5].name, team, asg, [], true) !== null, tag + '…but the admin can enter their paper form');
  const allFive = {}; ctx.coreIds_().forEach(q => allFive[q] = 4);
  const texts = { O_START: 'Start sharing the weekly plan', O_KEEP: 'Keep the clear reports' };
  let v = ctx.validateSubmission_('PERSON', { ratee: 'rami@example.org', freq: 'WEEKLY', scores: allFive, texts }, KA, team, asg, false);
  ok(v.rec && v.rec.ratee === 'rami@example.org', tag + 'a complete rating is accepted');
  v = ctx.validateSubmission_('PERSON', { ratee: 'omar@example.org', freq: 'WEEKLY', scores: allFive, texts }, KA, team, asg, false);
  ok(v.error, tag + 'rating someone not on your list is refused');
  v = ctx.validateSubmission_('PERSON', { ratee: 'rami@example.org', freq: 'Weekly!', scores: allFive, texts }, KA, team, asg, false);
  ok(v.error, tag + 'a made-up frequency is refused');
  const withFive = Object.assign({}, allFive, { C3: 5 });
  v = ctx.validateSubmission_('PERSON', { ratee: 'rami@example.org', freq: 'WEEKLY', scores: withFive, texts }, KA, team, asg, false);
  ok(v.error && v.error.indexOf(ctx.titleOf_('C3')) >= 0, tag + 'a 5 without an example is refused, naming the item');
  const head = Object.assign({}, allFive, { X1: 2 });
  v = ctx.validateSubmission_('PERSON', { ratee: KA, freq: 'DAILY', scores: Object.assign(head, { L1: 3 }), evidence: { X1: 'x'.repeat(40) }, texts: Object.assign({ H_SET: 'SET_WRITTEN', H_DISC: 'DISC_VERBAL', H_MINE: 'I set weekly check-ins' }, texts) }, H, team, asg, false);
  ok(v.error, tag + 'a manager giving a 2 must say what they did to help');
  v = ctx.validateSubmission_('PERSON', { ratee: KA, freq: 'DAILY', scores: head, evidence: { X1: 'x'.repeat(40) + ' late twice in May with no warning' }, texts: Object.assign({ H_SET: 'SET_WRITTEN', H_DISC: 'DISC_VERBAL', H_MINE: 'I set weekly check-ins', H_DID: 'We agreed a weekly follow-up table in May and I checked it every Monday' }, texts) }, H, team, asg, false);
  ok(v.rec && v.rec.texts.H_DID, tag + '…and is accepted once they do');
  v = ctx.validateSubmission_('PERSON', { ratee: KA, freq: 'DAILY', scores: head, evidence: { X1: 'x'.repeat(40) + ' late twice' }, texts: Object.assign({ H_SET: 'Yes!', H_DISC: 'DISC_VERBAL', H_MINE: 'x', H_DID: 'y'.repeat(40) }, texts) }, H, team, asg, false);
  ok(v.error, tag + 'a made-up answer to a choice question is refused');
  v = ctx.validateSubmission_('DEPT', { dept: ctx.testDept_(6), freq: 'WEEKLY', scores: {}, texts: {} }, KA, team, asg, false);
  ok(v.error, tag + 'rating your own department is refused');
  const naDept = {}; ctx.deptIds_().forEach(q => naDept[q] = null);
  v = ctx.validateSubmission_('DEPT', { dept: ctx.testDept_(1), freq: 'RARELY', scores: naDept, texts: {} }, KA, team, asg, false);
  ok(v.rec && v.rec.texts.D_EX === ctx.t_('ui.deptSkip'), tag + '"not dealt with this department" is recorded');
  v = ctx.validateSubmission_('SELF', { scores: allFive, texts: {} }, KA, team, asg, false);
  ok(v.error, tag + 'a self-evaluation without the required open answers is refused');
  const selfTexts = {}; ctx.openFor_('SELF_OPEN', ctx.testDept_(6)).forEach(q => selfTexts[q.id] = 'A clear answer for ' + q.id);
  v = ctx.validateSubmission_('SELF', { scores: allFive, texts: selfTexts, recog: [Y, KA, 'ghost@example.org'] }, KA, team, asg, false);
  ok(v.rec && v.rec.recog.length === 1 && v.rec.recog[0] === Y, tag + 'self accepted; recognition keeps only real colleagues, never yourself');

  // drafts
  ok(ctx.draftKeyAllowed_('PERSON|rami@example.org', KA, team, asg, false) && !ctx.draftKeyAllowed_('PERSON|omar@example.org', KA, team, asg, false), tag + 'drafts only for your own tasks');
  const cd = ctx.cleanDraft_({ scores: { C1: 9, C2: 3, 'bad key': 1 }, texts: { O_START: 'x'.repeat(5000) } });
  ok(cd.scores.C2 === 3 && !('C1' in cd.scores) && !('bad key' in cd.scores) && cd.texts.O_START.length === 3000, tag + 'drafts are cleaned');

  // the question bank
  const B = ctx.Q_();
  ok(B.CORE.length === 8 && B.LEAD.length === 7 && B.DEPT.length === 5 && B.HEAD_OPEN.find(q => q.id === 'H_DID').requiredIfLow, tag + 'default bank loaded');
  ok(B.HEAD_OPEN.find(q => q.id === 'H_SET').kind === 'choice' && B.MEMBER_OPEN.find(q => q.id === 'M_TOLD').options.length === 4, tag + 'choice questions carry their fixed answers');
  ok(ctx.sectionOf_('CORE') === 'CORE' && ctx.sectionOf_(ctx.tr_('ar', 'section.LEAD')) === 'LEAD' && ctx.sectionOf_(ctx.tr_('en', 'section.DEPT')) === 'DEPT', tag + 'sections read by code or by label in either language');
  const seeded = ctx.seedBank_([['C1', 'CORE', 'Replies fast', 'One line', 'yes', ''], ['S_X', 'SELF_OPEN', 'Extra for finance', '', 'yes', ctx.testDept_(1)]]);
  ctx.__BANK = seeded;
  ok(ctx.openFor_('SELF_OPEN', ctx.testDept_(1)).length === 1 && ctx.openFor_('SELF_OPEN', ctx.testDept_(6)).length === 0, tag + 'a question limited to one department shows only there');
  ctx.resetBank_();
  ctx.useSettings_({ LANGUAGE: L, ORG_TARGETS: 'Target: 500 families' });
  ok(ctx.Q_().SELF_OPEN.find(q => q.id === 'S_CONTRIB').help.indexOf('500 families') >= 0, tag + 'organisation targets appear in the contribution question');
  ok(ctx.toNumber_('٣') === 3 && ctx.toNumber_('3,5') === 3.5 && ctx.toNumber_('4 people') === 4 && ctx.toNumber_('abc') === null && ctx.toNumber_(2) === 2, tag + 'numbers are read in any common form, including Arabic digits');
  // someone who left after the pairings were made
  const left = JSON.parse(JSON.stringify(team)); left.find(p => p.email === 'rami@example.org').active = false;
  ok(!ctx.tasksFor_(KA, left, asg, []).persons.some(x => x.person.email === 'rami@example.org'), tag + 'a person marked as not included disappears from the lists of others');
  ok(ctx.validateSubmission_('PERSON', { ratee: 'rami@example.org', freq: 'WEEKLY', scores: allFive, texts }, KA, left, asg, false).error, tag + '…and cannot be rated any more');
  const R5 = ctx.analyze_(left, asg, recs, [], ctx.analysisCfg_());
  ok(R5.completion.every(c => c.pending.indexOf('Rami Wahba') < 0 && c.pending.indexOf('رامي وهبة') < 0), tag + '…and is not listed as pending for anyone');
  // a department rating from someone whose department no longer has active people does not crash the analysis
  const lone = JSON.parse(JSON.stringify(team)); lone.push({ name: 'Old Hand', email: 'old@example.org', dept: 'Closed unit', title: 'x', manager: 'nadia@example.org', active: true });
  const recs2 = recs.concat([{ form: 'DEPT', rid: 'Z', ts: 1, rater: 'old@example.org', ratee: ctx.testDept_(1), freq: 'WEEKLY', scores: { D1: 3, D2: 3, D3: 3, D4: 3, D5: 3 }, evidence: {}, texts: { D_EX: 'x'.repeat(40) } }]);
  lone[lone.length - 1].active = false;
  let crashed = false; try { ctx.analyze_(lone, asg, recs2, [], ctx.analysisCfg_()); } catch (e) { crashed = true; }
  ok(!crashed, tag + 'a department rating from someone who left does not stop the analysis');
  const dx = {}; ctx.deptIds_().forEach(q => dx[q] = 3); dx.D1 = 1;
  const dv = ctx.validateSubmission_('DEPT', { dept: ctx.testDept_(1), freq: 'WEEKLY', scores: dx, evidence: {}, texts: { D_EX: 'y'.repeat(40) } }, KA, team, asg, false);
  ok(dv.error && dv.error.indexOf(ctx.titleOf_('D1')) >= 0, tag + 'a department score of 1 needs its own example, like any other score');
  ok(ctx.yes_('yes') && ctx.yes_('نعم') && ctx.yes_(true) && ctx.no_('لا') && ctx.no_('No') && !ctx.yes_(''), tag + 'yes/no read in both languages');
}
console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
