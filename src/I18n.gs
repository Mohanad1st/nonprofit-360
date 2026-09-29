/**
 * nonprofit-360 — translation helpers. The words themselves are in Strings.en.gs and Strings.ar.gs.
 * t_('key', { name: 'Sara' }) → the text in the organisation's language, with {name} filled in.
 * A key missing in Arabic falls back to English, so nothing ever shows an empty label.
 */
var __LANG_OVERRIDE = null; // used by the setup wizard before the language is saved
function tr_(L, key, vars) {
  var d = (L === 'ar' ? STR_AR : STR_EN), s = d[key];
  if (s == null) s = STR_EN[key];
  if (s == null) return key;
  if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? '' : String(vars[k]); });
  return s;
}
function t_(key, vars) { return tr_(__LANG_OVERRIDE || lang_(), key, vars); }
/** The strings the personal page needs (keys starting with "ui."), in the organisation's language. */
function clientStrings_() {
  var out = {}, L = __LANG_OVERRIDE || lang_();
  Object.keys(STR_EN).forEach(function (k) { if (k.indexOf('ui.') === 0 || k.indexOf('freq.') === 0 || k.indexOf('ans.') === 0 || k.indexOf('scale.') === 0 || k.indexOf('relFor.') === 0) out[k] = tr_(L, k); });
  return out;
}
function withLang_(L, fn) { var old = __LANG_OVERRIDE; __LANG_OVERRIDE = L; try { return fn(); } finally { __LANG_OVERRIDE = old; } }
