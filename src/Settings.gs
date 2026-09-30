/**
 * nonprofit-360 — settings and sheet helpers.
 * Everything an organisation changes lives in the «Settings» tab of its own Google Sheet: no code edits.
 * Column A holds a stable id (do not edit it), B the setting's name, C its value, D what it means.
 */

/** [id, default, type]  type: text | lang | date | email | number | yesno | color */
var SETTINGS = [
  ['LANGUAGE', 'en', 'lang'],
  ['ORG_NAME', '', 'text'],
  ['CYCLE_NAME', '', 'text'],
  ['DEADLINE', '', 'date'],
  ['ADMIN_EMAIL', '', 'email'],
  ['SIGNATURE', '', 'text'],
  ['TIME_ZONE', '', 'text'],
  ['LOGO', '', 'text'],
  ['COLOR_PRIMARY', '#1f5f8b', 'color'],
  ['COLOR_ACCENT', '#35b0d8', 'color'],
  ['TAGLINE', '', 'text'],
  ['VALUE_1_NAME', '', 'text'], ['VALUE_1_TEXT', '', 'text'],
  ['VALUE_2_NAME', '', 'text'], ['VALUE_2_TEXT', '', 'text'],
  ['VALUE_3_NAME', '', 'text'], ['VALUE_3_TEXT', '', 'text'],
  ['VALUE_4_NAME', '', 'text'], ['VALUE_4_TEXT', '', 'text'],
  ['ORG_TARGETS', '', 'text'],
  ['PAGE_URL', '', 'text'],
  ['MIN_GROUP', 3, 'number'],
  ['EVIDENCE_MIN_CHARS', 30, 'number'],
  ['MANAGERS_RATE_EACH_OTHER', 'yes', 'yesno'],
  ['TOP_RATED_BY_DIRECTS_ONLY', 'yes', 'yesno'],
  ['DEPT_RATINGS', 'yes', 'yesno'],
  ['BLIND_SPOT', 1.0, 'number'],
  ['OUTLIER', 1.5, 'number'],
  ['MUTUAL_HIGH', 4.5, 'number'],
  ['BLAME_GAP', -0.75, 'number'],
  ['BLAME_UPWARD_MAX', 3.0, 'number'],
  ['WEAK_EVIDENCE_CHARS', 40, 'number']
];
/** Values that stay empty until the organisation fills them get a sensible default in its language. */
var SETTING_DEFAULT_KEY = { CYCLE_NAME: 'default.cycle', TAGLINE: 'default.tagline', SIGNATURE: 'default.signature',
  VALUE_1_NAME: 'default.value1.name', VALUE_1_TEXT: 'default.value1.text', VALUE_2_NAME: 'default.value2.name', VALUE_2_TEXT: 'default.value2.text',
  VALUE_3_NAME: 'default.value3.name', VALUE_3_TEXT: 'default.value3.text', VALUE_4_NAME: 'default.value4.name', VALUE_4_TEXT: 'default.value4.text' };

/** Tabs by stable id. Their shown names follow the language; the tool finds them by an internal id, so renaming a tab is safe. */
var TABS = ['GUIDE', 'SETTINGS', 'TEAM', 'LINKS', 'NEVER', 'DEPTLINKS', 'QUESTIONS', 'ASSIGN', 'DECISIONS', 'RESPONSES', 'DRAFTS',
  'COMPLETION', 'FLAGS', 'PEOPLE', 'HEAT', 'DEPTS', 'STARS', 'BLAME', 'ACCOUNT', 'SUMMARY', 'DASH'];

var __CFG = null;       // settings of this run (read once)
var __BOOK = null;      // the control spreadsheet
/**
 * The evaluation sheet. From the sheet's own menu it is the sheet the script lives in. From the personal page (which has
 * no "open sheet") it is the one remembered by the last admin action. If the sheet was copied (for example for next year),
 * the copy notices that the remembered sheet is a different file and forgets everything that belonged to the old one.
 */
function book_() {
  if (__BOOK) return __BOOK;
  var props = null, id = null, active = null;
  try { props = PropertiesService.getScriptProperties(); id = props.getProperty('CONTROL_SHEET_ID'); } catch (e) {}
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { active = null; }
  if (active) {
    if (props && id && id !== active.getId()) forgetOtherSheet_(props);
    __BOOK = active;
  } else __BOOK = SpreadsheetApp.openById(id);
  return __BOOK;
}
function forgetOtherSheet_(props) {
  Object.keys(props.getProperties()).forEach(function (k) {
    if (k === 'CONTROL_SHEET_ID' || k.indexOf('TAB_') === 0 || k.indexOf('REPORT_JOB') === 0 || k === 'INVITED') props.deleteProperty(k);
  });
}
/** A number typed in any common way: 3, "3", Arabic digits, "3,5", "3 people". null when there is none. */
function toNumber_(v) {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var s = String(v == null ? '' : v).replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); }).replace(',', '.'); // i18n-ok: Arabic digits
  var m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function rememberControlSheet_() {
  PropertiesService.getScriptProperties().setProperty('CONTROL_SHEET_ID', book_().getId());
}

/** All settings: defaults first, then the Settings tab (when running inside Google). */
function cfg_() {
  if (__CFG) return __CFG;
  var c = {};
  SETTINGS.forEach(function (s) { c[s[0]] = s[1]; });
  try {
    var sh = sheet_('SETTINGS');
    if (sh && sh.getLastRow() > 0) sh.getRange(1, 1, sh.getLastRow(), 3).getValues().forEach(function (r) {
      var id = String(r[0]).trim(); if (!(id in c)) return;
      var v = r[2];
      if (v === '' || v == null) return;
      var type = SETTINGS.filter(function (s) { return s[0] === id; })[0][2];
      if (type === 'number') { var num = toNumber_(v); if (num != null) c[id] = num; return; }
      c[id] = type === 'lang' ? (String(v).trim().toLowerCase().indexOf('ar') === 0 || String(v).indexOf('عرب') >= 0 ? 'ar' : 'en') : v; // i18n-ok: reads both languages
    });
  } catch (e) { /* outside Google (local tests): defaults only */ }
  __CFG = c;
  return c;
}
function resetCfg_() { __CFG = null; __BOOK = null; resetBank_(); }
/** For local checks and previews outside Google: use these settings instead of reading the Settings tab. */
function useSettings_(values) {
  var c = {};
  SETTINGS.forEach(function (s) { c[s[0]] = s[1]; });
  Object.keys(values || {}).forEach(function (k) { if (values[k] !== '' && values[k] != null) c[k] = values[k]; });
  c.LANGUAGE = c.LANGUAGE === 'ar' ? 'ar' : 'en';
  __CFG = c; resetBank_();
  return c;
}
/** One setting. Empty text settings fall back to a default in the organisation's language. */
function setting_(id) {
  var v = cfg_()[id];
  if ((v === '' || v == null) && SETTING_DEFAULT_KEY[id]) return t_(SETTING_DEFAULT_KEY[id]);
  return v;
}
function lang_() { return cfg_().LANGUAGE === 'ar' ? 'ar' : 'en'; }
function isRtl_() { return lang_() === 'ar'; }
function tz_() { var z = cfg_().TIME_ZONE; if (z) return String(z); try { return book_().getSpreadsheetTimeZone(); } catch (e) { return 'UTC'; } }
/** yes / no in either language (yes, y, true, نعم, ✓…). */ // i18n-ok: reads both languages
function yes_(v) { return /^(y|yes|true|1|✓|✔|نعم|اي|أيوه|ايوه)$/i.test(String(v == null ? '' : v).trim()); } // i18n-ok: reads both languages
function no_(v) { return /^(n|no|false|0|لا|✗)$/i.test(String(v == null ? '' : v).trim()); } // i18n-ok: reads both languages
/** "required only after a low score": low / if low / 1-2 / عند الضعف */ // i18n-ok: reads both languages
function reqLow_(v) { var s = String(v == null ? '' : v).trim().toLowerCase(); return s === 'low' || s.indexOf('if low') === 0 || s === '1-2' || s.indexOf('ضعف') >= 0 || s === 'منخفض'; } // i18n-ok: reads both languages
function settingYes_(id) { var v = cfg_()[id]; return v === true || yes_(v); }
/** Numbers the analysis uses, from the settings. */
function analysisCfg_() {
  var c = cfg_(), out = {};
  ['MIN_GROUP', 'BLIND_SPOT', 'OUTLIER', 'MUTUAL_HIGH', 'BLAME_GAP', 'BLAME_UPWARD_MAX', 'WEAK_EVIDENCE_CHARS'].forEach(function (k) { out[k] = Number(c[k]); });
  return out;
}
function deadlineText_() {
  var d = cfg_().DEADLINE;
  if (!d) return '';
  if (d instanceof Date) return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
  return String(d);
}
function orgName_() { return String(cfg_().ORG_NAME || t_('default.orgName')); }
function colors_() {
  var c = cfg_(), ok = function (x, d) { return /^#[0-9a-f]{6}$/i.test(String(x || '').trim()) ? String(x).trim() : d; };
  return { primary: ok(c.COLOR_PRIMARY, '#1f5f8b'), accent: ok(c.COLOR_ACCENT, '#35b0d8'), ink: '#14283a', mist: '#eef5fa' };
}
function values_() {
  var out = [];
  [1, 2, 3, 4].forEach(function (i) {
    var n = String(setting_('VALUE_' + i + '_NAME') || '').trim();
    if (n && n !== '-') out.push([n, String(setting_('VALUE_' + i + '_TEXT') || '').trim()]);
  });
  return out;
}

// ——— tabs ———
function tabName_(id) { return t_('tab.' + id); }
/** Finds a tab by its remembered id, then by its name in either language. */
function sheet_(id, create) {
  var ss = book_(), props = null, sh = null;
  try { props = PropertiesService.getScriptProperties(); } catch (e) {}
  var known = props ? props.getProperty('TAB_' + id) : null;
  if (known) {
    var all = ss.getSheets();
    for (var i = 0; i < all.length; i++) if (String(all[i].getSheetId()) === known) { sh = all[i]; break; }
  }
  if (!sh) ['en', 'ar'].forEach(function (L) { if (!sh) sh = ss.getSheetByName(tr_(L, 'tab.' + id)); });
  if (!sh) sh = ss.getSheetByName(tr_('ar', 'tab.' + id).replace(/ /g, '_')); // version 1.0.0 used underscores in Arabic tab names
  if (!sh && create) sh = ss.insertSheet(tabName_(id));
  if (sh && props && String(sh.getSheetId()) !== known) props.setProperty('TAB_' + id, String(sh.getSheetId()));
  if (sh && create) dirSheet_(sh);
  return sh;
}
function dirSheet_(sh) { try { sh.setRightToLeft(isRtl_()); } catch (e) {} return sh; }
function headerStyle_(range) { return range.setFontWeight('bold').setBackground(colors_().mist).setWrap(true).setVerticalAlignment('top'); }
function parentFolder_() {
  var parents = DriveApp.getFileById(book_().getId()).getParents();
  return parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
}

// ——— who may run admin commands ———
/**
 * The personal page runs with the owner's permissions, and Google lets a page call any public function.
 * So every admin command first checks that the person running it is the admin.
 * Before the admin is set (a fresh install), only the script's owner passes.
 */
function adminEmail_() {
  var a = lower_(cfg_().ADMIN_EMAIL);
  if (a) return a;
  try { return lower_(Session.getEffectiveUser().getEmail()); } catch (e) { return ''; }
}
function requireOwner_() {
  var u = lower_(Session.getActiveUser().getEmail());
  if (!u || u !== adminEmail_()) throw new Error(t_('err.adminOnly'));
}
