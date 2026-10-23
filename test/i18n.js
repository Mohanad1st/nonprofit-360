// Language check: every word the tool shows exists in English AND Arabic, every key the code uses exists,
// and no Arabic text is typed directly into the code outside the word lists and the default question bank.
'use strict';
const fs = require('fs'), path = require('path');
const { load, ORDER, read } = require('../tools/lib');
let fails = 0;
function bad(msg) { fails++; console.log('FAIL ' + msg); }

const ctx = load();
const en = Object.keys(ctx.STR_EN), ar = Object.keys(ctx.STR_AR);
en.filter(k => !(k in ctx.STR_AR)).forEach(k => bad('missing in Arabic: ' + k));
ar.filter(k => !(k in ctx.STR_EN)).forEach(k => bad('missing in English: ' + k));
// the same {placeholders} in both languages
en.forEach(k => {
  if (!(k in ctx.STR_AR)) return;
  const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
  if (ph(ctx.STR_EN[k]) !== ph(ctx.STR_AR[k])) bad('placeholders differ for ' + k + ': ' + ph(ctx.STR_EN[k]) + ' vs ' + ph(ctx.STR_AR[k]));
});

// every key the code asks for exists
const used = new Set();
const dynamic = [/'tab\.'/, /'set\.'/, /'rel\.'/, /'flagName\.'/, /'sev\.'/, /'ans\.'/, /'freq\.'/, /'scale\.'/, /'section\.'/, /'relFor\.'/, /'group\.'/, /'col\./];
for (const f of ORDER) {
  const src = read(f);
  const re = /\b(?:t_|C|T|tr_\(\s*['"]\w+['"]\s*,)\s*\(?\s*['"]([a-zA-Z]+\.[\w.]+)['"]/g;
  let m; while ((m = re.exec(src))) used.add(m[1]);
  const re2 = /tr_\(\s*\w+\s*,\s*['"]([a-zA-Z]+\.[\w.]+)['"]/g; while ((m = re2.exec(src))) used.add(m[1]);
}
const isPrefix = k => en.some(x => x.indexOf(k) === 0 && x !== k);
[...used].filter(k => !(k in ctx.STR_EN) && !isPrefix(k)).forEach(k => bad('used but not defined: ' + k));
// keys built from pieces must exist for every piece
const need = [];
ctx.TABS.forEach(id => need.push('tab.' + id));
ctx.SETTINGS.forEach(s => { need.push('set.' + s[0]); need.push('set.' + s[0] + '.help'); });
['SELF', 'HEAD_TO_MEMBER', 'MEMBER_TO_HEAD', 'PEER_SAME', 'PEER_OTHER'].forEach(r => need.push('rel.' + r));
['HEAD_TO_MEMBER', 'MEMBER_TO_HEAD', 'PEER_SAME', 'PEER_OTHER'].forEach(r => need.push('relFor.' + r));
ctx.SECTIONS.forEach(s => need.push('section.' + s));
ctx.FREQ_CODES.forEach(f => need.push('freq.' + f));
[].concat(ctx.ANS.SET, ctx.ANS.DISC, ctx.ANS.TOLD).forEach(a => need.push('ans.' + a));
[1, 2, 3, 4, 5].forEach(v => need.push('scale.' + v));
['HIGH', 'MED', 'LOW'].forEach(s => need.push('sev.' + s));
['HEAD', 'TEAM', 'PEERS', 'ANY'].forEach(g => need.push('group.' + g));
// every flag type the analysis can raise has a name
const flagTypes = new Set(); let fm; const fre = /flag\('([A-Z_]+)'/g; const logic = read('Logic.gs');
while ((fm = fre.exec(logic))) flagTypes.add(fm[1]);
flagTypes.forEach(t => need.push('flagName.' + t));
// every column key used through cols_('tab', [...])
for (const f of ORDER) {
  const src = read(f), re = /cols_\('(\w+)',\s*(\w+|\[[^\]]*\])/g; let m;
  while ((m = re.exec(src))) {
    const list = m[2].startsWith('[') ? m[2] : (src.match(new RegExp('var ' + m[2] + ' = (\\[[^\\]]*\\])')) || [])[1] || '[]';
    (list.match(/'(\w+)'/g) || []).forEach(k => need.push('col.' + m[1] + '.' + k.replace(/'/g, '')));
  }
}
need.filter(k => !(k in ctx.STR_EN)).forEach(k => bad('needed but not defined: ' + k));

// no Arabic letters in the code outside the word list and the default bank
for (const f of ORDER) {
  if (f === 'Strings.ar.gs' || f === 'Bank.gs') continue;
  read(f).split('\n').forEach((line, i) => {
    if (/[؀-ۿ]/.test(line) && !/i18n-ok|split\(\/\[,،\]/.test(line)) bad(f + ':' + (i + 1) + ' has Arabic text outside the word list: ' + line.trim().slice(0, 80));
  });
}
// no hard-coded words shown on the personal page
const app = ctx.APP_JS;
(app.match(/text:\s*"[A-Za-z][^"]{3,}"/g) || []).forEach(s => bad('personal page has a hard-coded English label: ' + s));
(app.match(/toast\("[^"]+"\)/g) || []).forEach(s => bad('personal page has a hard-coded message: ' + s));

// both languages render every client key the page uses
const pageKeys = new Set(); let pm; const pre = /T\("([\w.]+)"/g; while ((pm = pre.exec(app))) pageKeys.add(pm[1]);
const dynClient = ['relFor.', 'scale.', 'freq.', 'ans.'];
[...pageKeys].filter(k => !(k in ctx.STR_EN) && !isPrefix(k)).forEach(k => bad('page uses an undefined key: ' + k));
[...pageKeys].filter(k => !/^(ui|freq|ans|scale|relFor)\./.test(k)).forEach(k => bad('page key is not sent to the browser (needs a ui. prefix): ' + k));

console.log(en.length + ' keys in each language · ' + used.size + ' used directly · ' + (fails ? fails + ' problem(s)' : 'all present in English and Arabic'));
process.exit(fails ? 1 : 0);
