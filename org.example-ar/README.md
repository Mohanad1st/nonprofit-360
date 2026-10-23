<div dir="rtl">

# مجلد مؤسستك (مثال)

انسخ هذا المجلد باسم `org/` وعدّل الملفات، أو اكتب `/setup-360` في Claude Code ليقوم بذلك عنك.
المجلد `org/` خاص: مذكور في `.gitignore` فلا يُحفظ في git ولا يُرفع إلى GitHub أبدًا.

| الملف | ماذا يحتوي |
|---|---|
| `settings.json` | الاسم، اللغة (`ar`/`en`)، اسم الدورة، آخر موعد، بريد مسؤول التقييم، التوقيع، القيم، الألوان، رابط الشعار. ما يُترك فارغًا يأخذ قيمة افتراضية مناسبة. |
| `team.csv` | صف لكل شخص: `name,email,department,job_title,manager,included,note`. **manager** = بريد الرئيس المباشر أو اسمه كما هو مكتوب؛ فارغ لرأس المؤسسة فقط. **email** فارغ = بلا بريد عمل (يُقيَّم إلكترونيًا ويقيّم ورقيًا). **included** = نعم/لا. |
| `work-links.csv` | من يعملون معًا *خارج فريقهم*: `rater,ratee,reason,both_directions`. السبب يظهر للمقيّم. الرؤساء وفرقهم يُضافون تلقائيًا. |
| `never-pair.csv` | شخصان لا يقيّم أحدهما الآخر أبدًا: `person_a,person_b,note`. |
| `department-links.csv` | اختياري: `department,rates_these_departments` (مفصولة بفواصل). الإدارة التي ليس لها صف تقيّم كل الإدارات الأخرى. |
| `questions.csv` | اختياري: `code,section,question,help,required,departments` لاستبدال الأسئلة الافتراضية. |

بعد ذلك:
- `node tools/check-org.js` يفحص كل شيء ويكتب صفحة المراجعة `org/build/review.html`؛
- `node tools/build.js --org` ينشئ الملف `org/build/Code.gs`.

كل الأشخاص في هذا المثال وهميون.

> ملاحظة: هذا النص مسودة بمساعدة الذكاء الاصطناعي ويحتاج مراجعة من متحدث أصلي.

</div>
