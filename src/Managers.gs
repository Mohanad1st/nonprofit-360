/**
 * nonprofit-360 — asking managers who works with whom.
 * The slowest part of a first setup is finding out who works closely with whom outside their own team. Instead of
 * chasing managers one by one, the admin sends each manager one email; the manager opens a short page (the same
 * published page, with ?view=links), and for each person in their team picks the colleagues they work with and on what.
 * The answers go straight into the «Work links» tab, marked with the manager's name, for the admin to review.
 */

/** Admin menu: emails every manager the link to their short page — asks first. */
function askManagers() {
  requireOwner_();
  var url = portalUrl_();
  if (!url) { uiAlert_(t_('ask.noPage')); return; }
  var team = readTeam_(), byEmail = indexTeam_(team);
  var managers = team.filter(function (p) { return p.active !== false && p.email && !isNoEmail_(p.email) && teamOf_(p.email, team).length; });
  if (!managers.length) { uiAlert_(t_('ask.noManagers')); return; }
  var ui = SpreadsheetApp.getUi();
  if (ui.alert(t_('ask.confirm', { n: managers.length }), ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var sent = 0;
  managers.forEach(function (m) {
    var names = teamOf_(m.email, team).map(function (p) { return p.name; });
    var body = listEmail_(m, [t_('ask.intro'), t_('ask.how')], names, { label: t_('ask.button'), url: url + '?view=links' });
    if (send_(m.email, t_('ask.subject', { org: orgName_() }), body)) sent++;
  });
  Logger.log('asked ' + sent + ' managers'); // counts only
  uiAlert_(t_('ask.sent', { n: sent }));
}

/** The active people whose direct manager is this person. */
function teamOf_(email, team) {
  email = lower_(email);
  return team.filter(function (p) { return p.active !== false && lower_(p.manager) === email && p.email !== email; });
}

/** The manager's short page. Anyone who manages nobody gets a plain message. */
function linksPageHtml_(email) {
  var team = readTeam_(), byEmail = indexTeam_(team), me = byEmail[lower_(email)];
  var mine = me && me.active !== false ? teamOf_(me.email, team) : [];
  if (!mine.length) return messagePageHtml_(t_('links.notManager'));
  var links = readLinks_(team), name = function (e) { return byEmail[e] ? byEmail[e].name : e; };
  var members = mine.map(function (p) {
    var already = links.filter(function (l) { return l.rater === p.email || l.ratee === p.email; }).map(function (l) {
      var other = l.rater === p.email ? l.ratee : l.rater; return name(other) + (l.reason ? ' — ' + l.reason : '');
    });
    // teammates and their manager are paired automatically, so they are not offered
    var auto = {}; auto[p.email] = 1; auto[lower_(p.manager)] = 1;
    team.forEach(function (q) { if (lower_(q.manager) === lower_(p.manager)) auto[q.email] = 1; });
    var options = team.filter(function (q) { return q.active !== false && !auto[q.email]; })
      .sort(function (a, b) { return (a.dept + a.name) < (b.dept + b.name) ? -1 : 1; })
      .map(function (q) { return { key: q.email, label: q.name + (q.dept ? ' — ' + q.dept : '') }; });
    return { key: p.email, name: p.name, sub: [p.title, p.dept].filter(String).join(' · '), already: already, options: options };
  });
  var labels = {};
  Object.keys(STR_EN).forEach(function (k) { if (k.indexOf('links.') === 0) labels[k] = t_(k); });
  var data = JSON.stringify({ dir: isRtl_() ? 'rtl' : 'ltr', org: orgName_(), me: me.name, members: members, s: labels, colors: colors_() }).replace(/</g, '\\u003c');
  var col = colors_();
  return '<!DOCTYPE html><html lang="' + lang_() + '" dir="' + (isRtl_() ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
    'body{margin:0;background:#f4f8fb;font-family:Tahoma,Arial,sans-serif;color:#14283a;line-height:1.6}.wrap{max-width:720px;margin:0 auto;padding:16px}' +
    'h1{color:' + col.primary + ';font-size:22px;margin:8px 0}h2{font-size:17px;margin:0}.sub,.mute{color:#5b6b7a;font-size:13px}' +
    '.card{background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.07);padding:14px 16px;margin:12px 0}.row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}' +
    'select,input{font:inherit;padding:8px;border:1px solid #c9d6e2;border-radius:8px;box-sizing:border-box}select{flex:1 1 220px;min-width:0}input{flex:2 1 260px;min-width:0}' +
    '.bad{border-color:#b00020;background:#fff5f5}.btn{background:' + col.primary + ';color:#fff;border:0;border-radius:10px;padding:13px;font:inherit;font-weight:bold;width:100%;cursor:pointer}' +
    '.soft{background:none;color:' + col.primary + ';border:1px dashed #9fb6c8;border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer}.msg{padding:12px;border-radius:10px;background:#e8f5ec;margin:12px 0}' +
    '</style></head><body><div class="wrap" id="app"></div><script>var D=' + data + ';</script><script>' + LINKS_JS + '</script></body></html>';
}

var LINKS_JS = [
  'function T(k, v) { var s = D.s[k] || k; Object.keys(v || {}).forEach(function (x) { s = s.split("{" + x + "}").join(v[x]); }); return s; }',
  'function el(t, a, kids) { var e = document.createElement(t); Object.keys(a || {}).forEach(function (k) { if (k === "text") e.textContent = a[k]; else if (k === "cls") e.className = a[k]; else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), a[k]); else e.setAttribute(k, a[k]); });',
  '  (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }',
  'var app = document.getElementById("app");',
  'app.appendChild(el("div", { cls: "sub", text: D.org })); app.appendChild(el("h1", { text: T("links.title") })); app.appendChild(el("div", { cls: "mute", text: T("links.intro") }));',
  'var boxes = [];',
  'function addRow(box, m) { var s = el("select", {}, [el("option", { value: "", text: T("links.pick") })]); m.options.forEach(function (o) { s.appendChild(el("option", { value: o.key, text: o.label })); });',
  '  var r = el("input", { type: "text", maxlength: "200", placeholder: T("links.reason") }); box.appendChild(el("div", { cls: "row" }, [s, r])); }',
  'D.members.forEach(function (m) { var c = el("div", { cls: "card" }, [el("h2", { text: m.name }), m.sub ? el("div", { cls: "sub", text: m.sub }) : null]);',
  '  if (m.already.length) c.appendChild(el("div", { cls: "mute", text: T("links.already") + " " + m.already.join(" · ") }));',
  '  var box = el("div"); addRow(box, m); addRow(box, m); c.appendChild(box);',
  '  c.appendChild(el("button", { cls: "soft", type: "button", text: "+ " + T("links.add"), onclick: function () { addRow(box, m); } })); boxes.push({ m: m, box: box }); app.appendChild(c); });',
  'var out = el("div"); app.appendChild(out);',
  'var btn = el("button", { cls: "btn", text: T("links.send"), onclick: function () { var items = [], bad = false;',
  '  boxes.forEach(function (b) { [].forEach.call(b.box.querySelectorAll(".row"), function (row) { var s = row.querySelector("select"), r = row.querySelector("input"); r.classList.remove("bad");',
  '    if (!s.value) return; if (r.value.trim().length < 3) { r.classList.add("bad"); bad = true; return; } items.push({ member: b.m.key, colleague: s.value, reason: r.value.trim() }); }); });',
  '  if (bad) { out.innerHTML = ""; out.appendChild(el("div", { cls: "msg", style: "background:#fff5f5", text: T("links.needReason") })); return; }',
  '  if (!items.length) { out.innerHTML = ""; out.appendChild(el("div", { cls: "msg", style: "background:#fff5f5", text: T("links.none") })); return; }',
  '  btn.disabled = true; btn.textContent = T("links.sending");',
  '  google.script.run.withSuccessHandler(function (res) { btn.disabled = false; btn.textContent = T("links.send"); out.innerHTML = "";',
  '    out.appendChild(el("div", { cls: "msg", style: res && res.ok ? "" : "background:#fff5f5", text: res && res.ok ? T("links.sent", { n: res.added }) : (res && res.error) || T("links.error") }));',
  '    if (res && res.ok) boxes.forEach(function (b) { [].forEach.call(b.box.querySelectorAll("select"), function (s) { s.value = ""; }); [].forEach.call(b.box.querySelectorAll("input"), function (r) { r.value = ""; }); }); })',
  '  .withFailureHandler(function () { btn.disabled = false; btn.textContent = T("links.send"); out.innerHTML = ""; out.appendChild(el("div", { cls: "msg", style: "background:#fff5f5", text: T("links.error") })); }).submitLinks(items); } });',
  'app.appendChild(btn);'
].join('\n');

/**
 * Called by the manager's page. Only a manager, only for their own team, only real colleagues: anything else is refused.
 * Adds each new pair to «Work links» (both directions), marked with the manager's name; a pair already listed is skipped.
 */
function submitLinks(items) {
  var active = lower_(Session.getActiveUser().getEmail());
  var team = readTeam_(), byEmail = indexTeam_(team), me = byEmail[active];
  var mine = me && me.active !== false ? teamOf_(active, team).map(function (p) { return p.email; }) : [];
  if (!mine.length) return { ok: false, error: t_('links.notManager') };
  if (!Array.isArray(items) || items.length > 80) return { ok: false, error: t_('links.error') };
  var clean = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {}, m = lower_(it.member), c = lower_(it.colleague), reason = String(it.reason || '').trim().slice(0, 200);
    if (mine.indexOf(m) < 0 || !byEmail[c] || byEmail[c].active === false || c === m) return { ok: false, error: t_('links.error') };
    if (reason.length < 3) return { ok: false, error: t_('links.needReason') };
    clean.push({ m: m, c: c, reason: reason });
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var added = 0;
  try {
    var have = {};
    readLinks_(team).forEach(function (l) { have[l.rater + '>' + l.ratee] = 1; have[l.ratee + '>' + l.rater] = 1; });
    var show = function (e) { return isNoEmail_(e) ? byEmail[e].name : e; };
    var sh = sheet_('LINKS', true), rows = [];
    clean.forEach(function (x) {
      if (have[x.m + '>' + x.c]) return;
      have[x.m + '>' + x.c] = have[x.c + '>' + x.m] = 1;
      rows.push([show(x.m), show(x.c), x.reason, t_('word.yes'), t_('links.fromManager', { name: me.name })]);
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 5).setValues(safeRows_(rows));
    added = rows.length;
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return { ok: true, added: added };
}
