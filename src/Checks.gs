/**
 * nonprofit-360 — plain-language checks of the team, the work links and the settings.
 * Pure (no Google services): the sheet menu uses it, and so does the local check Claude Code runs on the org/ folder.
 * Returns [{ level: 'error' | 'warn', msg }]. Errors must be fixed before pairings are made; warnings are advice.
 */
function checkOrg_(team, links, never, deptLinks, opts) {
  opts = opts || {};
  var out = [];
  function err(k, v) { out.push({ level: 'error', msg: t_('check.' + k, v) }); }
  function warn(k, v) { out.push({ level: 'warn', msg: t_('check.' + k, v) }); }
  var active = team.filter(function (p) { return p.active !== false; });
  if (!active.length) { err('noTeam'); return out; }
  var by = {}, dup = {};
  team.forEach(function (p) { if (by[p.email]) dup[p.email] = 1; by[p.email] = p; });
  Object.keys(dup).forEach(function (e) { err('duplicate', { who: isNoEmail_(e) ? e.slice(NO_EMAIL.length) : e }); });
  var names = {};
  active.forEach(function (p) { var k = p.name.trim().toLowerCase(); if (names[k] && !isNoEmail_(p.email)) warn('sameName', { name: p.name }); names[k] = 1; });
  var tops = active.filter(function (p) { return !p.manager; });
  if (!tops.length) err('noTop');
  if (tops.length > 1) warn('manyTops', { names: tops.map(function (p) { return p.name; }).join(', ') });
  active.forEach(function (p) {
    if (!isNoEmail_(p.email) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) err('badEmail', { name: p.name, email: p.email });
    if (p.manager && p.manager === p.email) err('selfManager', { name: p.name });
    else if (p.manager && !by[p.manager]) err('managerMissing', { name: p.name, manager: p.manager });
    else if (p.manager && by[p.manager] && by[p.manager].active === false) warn('managerInactive', { name: p.name });
    if (p.manager && isNoEmail_(p.manager)) warn('managerNoEmail', { name: p.name });
    if (!p.dept) warn('noDept', { name: p.name });
  });
  // a manager chain that loops back on itself
  active.forEach(function (p) {
    var seen = {}, cur = p;
    while (cur && cur.manager) { if (seen[cur.email]) { err('loop', { name: p.name }); break; } seen[cur.email] = 1; cur = by[cur.manager]; }
  });
  (links || []).forEach(function (l, i) {
    if (!by[l.rater]) err('linkUnknown', { row: i + 2, who: l.rater });
    if (!by[l.ratee]) err('linkUnknown', { row: i + 2, who: l.ratee });
    if (l.rater && l.rater === l.ratee) err('linkSelf', { row: i + 2 });
    if (!String(l.reason || '').trim()) warn('linkNoReason', { row: i + 2 });
  });
  (never || []).forEach(function (n, i) { if (!by[n.a] || !by[n.b]) err('neverUnknown', { row: i + 2 }); });
  var depts = {}; active.forEach(function (p) { if (p.dept) depts[p.dept] = 1; });
  Object.keys(deptLinks || {}).forEach(function (d) {
    if (!depts[d]) warn('deptUnknown', { dept: d });
    (deptLinks[d] || []).forEach(function (x) { if (!depts[x]) warn('deptUnknown', { dept: x }); });
  });
  // a role question switched on for a department that nobody is in reaches nobody
  try { Q_().ROLE.forEach(function (q) { if (!(q.depts || []).length) warn('roleNoDept', { q: q.title }); (q.depts || []).forEach(function (d) { if (!depts[d]) warn('roleDeptUnknown', { q: q.title, dept: d }); }); }); } catch (e) {}
  if (opts.admin && !by[lower_(opts.admin)]) warn('adminNotInTeam', { email: opts.admin });
  if (!opts.deadline) warn('noDeadline');
  // how many ratings each person gets and gives (a fair evaluation needs enough raters; a heavy list tires people)
  var asg = generateAssignments_(team, links, never, opts.assignOpts);
  var given = {}, got = {};
  asg.forEach(function (a) { given[a.rater] = (given[a.rater] || 0) + 1; got[a.ratee] = (got[a.ratee] || 0) + 1; });
  var min = opts.minGroup || 3;
  active.forEach(function (p) {
    if ((got[p.email] || 0) < min) warn('fewRaters', { name: p.name, n: got[p.email] || 0, min: min });
    if ((given[p.email] || 0) > 12) warn('heavy', { name: p.name, n: given[p.email] });
  });
  out.assignments = asg;
  return out;
}
