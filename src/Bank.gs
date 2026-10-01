/**
 * nonprofit-360 — the default question bank (English and Arabic) and the made-up example team.
 * The setup copies the bank into the «Questions» tab, where the admin can reword, add or switch off questions.
 * Question codes (C1, L4, X1, H_SET…) are stable ids the analysis uses; change the wording, never the code.
 * All copy is AI-drafted and needs a native-speaker review before a real cycle.
 *
 * Sections:
 *   CORE        rated by everyone (self and others)          LEAD        leadership, only for people who manage a team
 *   DEPT        one department rating another                 HEAD_ITEMS  rated only by the direct manager
 *   SELF_OPEN   open questions of the self-evaluation         SELF_HEAD   extra open question for managers about themselves
 *   HEAD_OPEN   the manager's own part, when rating a member  MEMBER_OPEN the mirror questions, when a member rates the manager
 *   PERSON_OPEN open notes when rating anyone
 *   ROLE        rated only for people in the departments listed (off until the admin switches them on)
 * In the Questions tab: Required = yes / no / low (required only after a score of 1 or 2).
 * Departments (optional): limit a question to some departments, separated by commas.
 */
var SECTIONS = ['CORE', 'LEAD', 'DEPT', 'HEAD_ITEMS', 'ROLE', 'SELF_OPEN', 'SELF_HEAD', 'HEAD_OPEN', 'MEMBER_OPEN', 'PERSON_OPEN'];
var RATING_SECTIONS = ['CORE', 'LEAD', 'DEPT', 'HEAD_ITEMS', 'ROLE'];

var DEFAULT_BANK = {
  en: {
    CORE: [
      ['C1', 'Responsiveness', 'Replies to messages and requests within the agreed time.\nDoes not need repeated chasing before acting.\nIf late, warns in advance and gives a new date.'],
      ['C2', 'Communication and clarity', 'Shares important information early and clearly with the people who need it.\nRaises problems and delays as soon as they appear, and does not hide them.\nMessages are clear and respectful; the reader understands what is needed.'],
      ['C3', 'Delivering on time', 'Delivers what they committed to by the agreed date.\nOrganises priorities so tasks do not pile up.\nKeeps to meeting and reporting deadlines, where these are part of the job.'],
      ['C4', 'Taking responsibility', 'Owns their part when something goes wrong and does not blame others.\nFollows a task through to the end without being asked.\nBrings a suggested solution when raising a problem.'],
      ['C5', 'Quality and accuracy', 'Delivers correct work the first time, without repeated mistakes.\nChecks details, figures and documents before handing over.\nKeeps records of their work in a way others can understand.'],
      ['C6', 'Working with colleagues and other departments', 'Helps colleagues when needed, even outside their own tasks.\nCoordinates with other departments before acting, not after (where relevant).\nStays respectful even in disagreement.'],
      ['C7', 'Following the organisation\'s rules', 'Follows financial and administrative rules and approval steps.\nProtects confidential information and the organisation\'s money and property.\nDoes not skip any required step or document.'],
      ['C8', 'Learning, feedback and adapting to change', 'Accepts feedback and changes their approach because of it.\nAdapts when priorities or circumstances change.\nBuilds their skills and uses new tools to improve their work.']
    ],
    LEAD: [
      ['L1', 'Clear expectations and priorities', 'Makes clear to each team member what is expected, by when, and what success looks like.\nDoes not change priorities without explaining why.'],
      ['L2', 'Listening and being reachable', 'Can be reached when needed.\nListens to the team before judging, and takes their views into account.'],
      ['L3', 'Supporting and developing the team', 'Removes obstacles and provides what the team needs.\nCoaches, guides and gives regular feedback aimed at improvement.'],
      ['L4', 'Owning the team\'s results', 'Takes responsibility for the team\'s performance towards leadership.\nDoes not blame team members for failures, and deals with the causes personally.'],
      ['L5', 'Fairness within the team', 'Treats team members fairly, without favourites.\nBases decisions and ratings on facts, not impressions.'],
      ['L6', 'Giving credit where it is due', 'Recognises team members\' efforts and makes them visible to others.\nDoes not take sole credit for the team\'s achievements.'],
      ['L7', 'Solving problems and deciding', 'Makes decisions in time and does not postpone problems.\nSolves problems personally instead of passing them on or escalating without need.']
    ],
    DEPT: [
      ['D1', 'Responding to our requests', 'The department replies to our requests within the agreed time.'],
      ['D2', 'Sharing clear information', 'It shares important information and updates with us early and clearly.'],
      ['D3', 'Quality of what we receive', 'What we receive from it is complete, correct and does not need redoing.'],
      ['D4', 'Keeping agreed deadlines', 'It keeps the deadlines it promised us.'],
      ['D5', 'Agreeing before joint work', 'It agrees with us before starting any joint work, not after a problem appears.']
    ],
    HEAD_ITEMS: [
      ['X1', 'Achieving what was expected', 'Delivered what was expected since the start of the period, in the agreed quantity and quality.\nIf nothing clear was expected of them, choose "I don\'t know" — that is not their fault.']
    ],
    ROLE: [
      ['RF1', 'Respect for the people we serve', 'Treats community members and the people we serve with dignity and patience.\nListens before deciding, and keeps the promises made to them.', '', 'Field team', 'off'],
      ['RF2', 'Safety and care in the field', 'Follows the safety and safeguarding rules, and reports incidents and risks straight away.\nLooks after equipment, supplies and records in the field.', '', 'Field team', 'off'],
      ['RA1', 'Accurate, complete records', 'Financial and administrative records are correct, complete and on time.\nEvery payment and decision has the documents to support it.', '', 'Finance and admin', 'off'],
      ['RA2', 'Helpful service to colleagues', 'Explains procedures clearly and answers requests on time.\nHelps colleagues get it right, instead of only refusing what is wrong.', '', 'Finance and admin', 'off'],
      ['RM1', 'Planning and follow-through', 'Turns plans into clear steps, owners and dates.\nFollows up until the work is done, and adjusts when things change.', '', 'Management', 'off'],
      ['RM2', 'Responsible use of resources', 'Uses money, time and people wisely.\nDecisions weigh the cost against the benefit to the people we serve.', '', 'Management', 'off'],
      ['RV1', 'Reliability', 'Comes to agreed shifts and tasks on time, or warns early when they cannot.\nFinishes what they took on.', '', 'Volunteers', 'off'],
      ['RV2', 'Representing us well', 'Follows our code of conduct and safeguarding rules.\nSpeaks and acts in a way that builds trust in the organisation.', '', 'Volunteers', 'off']
    ],
    SELF_OPEN: [
      ['S_EXPECT', 'What was expected of you since the start of the period, as you understood it?', 'From your job description, what your manager asked, or your team plan. If nothing was written or clear, say so plainly.', 'yes'],
      ['S_ACH', 'Your 3 most important achievements against what was expected', 'One under the other. For each: what did you do? What was the result, in numbers if possible (for example, people served)? What proves it (photos, a file, a report, a date)?', 'yes'],
      ['S_CONTRIB', 'Your share of your team\'s targets (optional)', 'If your work has numbers, write what you delivered or took part in. {targets}', 'no'],
      ['S_FAIL', 'What did not happen as planned in your work?', 'Name honestly one task or goal that was not achieved as expected.', 'yes'],
      ['S_OWN', 'What was your own part in what was not achieved?', 'What could you have done differently?', 'yes'],
      ['S_EXT', 'Were there reasons outside your control? (optional)', 'Circumstances or other people that affected the result — with a specific example.', 'no'],
      ['S_LEARN', 'What have you learned since the start of the period?', 'A skill, a piece of knowledge or a new way of working, however small.', 'yes'],
      ['S_PLAN', 'Your development plan for the next six months', 'Two or three goals: what will you develop? How? By when?', 'yes'],
      ['S_SUP_HEAD', 'What support do you need from your manager? (optional)', 'For example: training, a tool, time, clearer tasks. Leave empty if you need nothing.', 'no'],
      ['S_SUP_DEPT', 'What support do you need from other departments? (optional)', 'Name the department and exactly what you need from it.', 'no']
    ],
    SELF_HEAD: [
      ['S_TEAMCH', 'What are the biggest challenges facing your team? And what is your own part in them as a manager?', 'Name the challenge, what you did as a manager to deal with it, and what you could have done better.', 'yes']
    ],
    HEAD_OPEN: [
      ['H_SET', 'Did you set out what was expected of them since the start of the period?', 'We ask because a person can only be rated on "achieving what was expected" if it was clear to them.', 'yes'],
      ['H_DISC', 'Did you talk with them about these points for improvement before this evaluation?', 'Everyone has the right to know what they need to improve before being rated on it.', 'yes'],
      ['H_DID', 'What support or guidance did you give them to improve these points?', 'When did you raise it? What training or tools did you provide? How did you follow up? If you have not done anything yet, say so. (Required if you chose 1 or 2 anywhere)', 'low'],
      ['H_MINE', 'What was your own part, as their manager, in how their performance turned out — success or struggle?', 'For example: clarity of tasks, support you gave, workload, resources, how quickly you decided. If nothing, say so.', 'yes']
    ],
    MEMBER_OPEN: [
      ['M_SET', 'Did your manager set out what was expected of you since the start of the period?', '', 'yes'],
      ['M_TOLD', 'How often did your manager tell you clearly what you need to improve and how?', '', 'yes'],
      ['M_HELP', 'Describe a difficult moment at work: how did your manager help, or what do you wish they had done? (optional)', 'One example is enough. Leave empty if it did not happen.', 'no']
    ],
    PERSON_OPEN: [
      ['O_START', 'One thing I suggest they start doing, or do more of', '', 'yes'],
      ['O_STOP', 'One thing I suggest they stop doing (optional)', '', 'no'],
      ['O_KEEP', 'One thing they do well and I hope they keep doing', '', 'yes'],
      ['O_EASIER', 'One thing that would make working with them easier (optional)', '', 'no']
    ]
  },
  ar: {
    CORE: [
      ['C1', 'سرعة الرد والتجاوب', 'يرد على الرسائل والطلبات في الوقت المتفق عليه.\nلا يحتاج إلى متابعة متكررة حتى يتحرك.\nإذا تأخر، يبلّغ مسبقًا ويحدد موعدًا بديلًا.'],
      ['C2', 'التواصل والوضوح', 'يشارك المعلومات المهمة مبكرًا وبوضوح مع من يحتاجها.\nيعلن المشكلات والتأخيرات فور ظهورها ولا يخفيها.\nرسائله واضحة ومحترمة، ويفهم منها من يقرؤها ما المطلوب.'],
      ['C3', 'إنجاز المهام في مواعيدها', 'يسلّم ما التزم به في الموعد المحدد.\nيرتّب أولوياته فلا تتراكم المهام.\nيلتزم بمواعيد الاجتماعات والتقارير، إن كانت من عمله.'],
      ['C4', 'تحمّل المسؤولية', 'يعترف بالجزء الخاص به عند حدوث خطأ ولا يلقي اللوم على غيره.\nيتابع المهمة حتى نهايتها دون أن يُطلب منه.\nيقترح حلًا عند عرض المشكلة.'],
      ['C5', 'جودة العمل ودقته', 'يسلّم عملًا صحيحًا من المرة الأولى دون أخطاء متكررة.\nيراجع التفاصيل والأرقام والمستندات قبل التسليم.\nيدوّن عمله ويحتفظ بأوراقه بطريقة يفهمها غيره.'],
      ['C6', 'التعاون مع الزملاء والإدارات الأخرى', 'يساعد الزملاء عند الحاجة حتى خارج مهامه المباشرة.\nينسّق مع الإدارات الأخرى قبل التنفيذ لا بعده (إن وُجد تعامل).\nيتعامل باحترام حتى عند الاختلاف.'],
      ['C7', 'الالتزام بقواعد المؤسسة', 'يلتزم بالقواعد المالية والإدارية وخطوات الموافقة.\nيحافظ على سرية المعلومات وعلى أموال المؤسسة وممتلكاتها.\nلا يتجاوز أي خطوة أو مستند مطلوب.'],
      ['C8', 'التعلم وتقبّل الملاحظات والتأقلم مع التغيير', 'يتقبل الملاحظات ويغيّر أسلوبه بناءً عليها.\nيتأقلم مع تغيّر الأولويات وظروف العمل.\nيطوّر مهاراته ويستخدم أدوات جديدة لتحسين عمله.']
    ],
    LEAD: [
      ['L1', 'وضوح المطلوب والأولويات', 'يوضح لكل فرد في فريقه المطلوب منه وموعده ومتى يُعتبر ناجحًا.\nلا يغيّر الأولويات دون شرح السبب.'],
      ['L2', 'الاستماع وسهولة الوصول', 'يمكن الوصول إليه عند الحاجة.\nيستمع للفريق قبل أن يحكم، ويأخذ آراءهم في الاعتبار.'],
      ['L3', 'دعم الفريق وتطويره', 'يزيل العوائق من أمام فريقه ويوفر ما يحتاجونه.\nيدرّب ويوجّه ويعطي ملاحظات هدفها التحسين بشكل منتظم.'],
      ['L4', 'تحمّل مسؤولية نتائج الفريق', 'يتحمل مسؤولية أداء فريقه أمام الإدارة.\nلا يلقي باللوم على أعضاء الفريق عند الإخفاق، ويعالج الأسباب بنفسه.'],
      ['L5', 'العدل بين أفراد الفريق', 'يعامل أعضاء فريقه بإنصاف ودون تفضيل لأحد.\nيبني قراراته وتقييماته على وقائع لا على انطباعات.'],
      ['L6', 'إعطاء كل صاحب جهد حقه من التقدير', 'يعترف بجهود أعضاء فريقه ويُظهرها أمام الآخرين.\nلا ينسب إنجازات الفريق لنفسه فقط.'],
      ['L7', 'حل المشكلات واتخاذ القرار', 'يتخذ القرار في الوقت المناسب ولا يؤجل المشكلات.\nيحل المشكلات بنفسه بدل تمريرها لغيره أو رفعها لمستوى أعلى دون داعٍ.']
    ],
    DEPT: [
      ['D1', 'سرعة الرد على طلباتنا', 'ترد الإدارة على طلباتنا في الوقت المتفق عليه.'],
      ['D2', 'وضوح المعلومات ومشاركتها', 'تشاركنا المعلومات والتحديثات المهمة مبكرًا وبوضوح.'],
      ['D3', 'جودة ما يصلنا منها', 'ما يصلنا منها مكتمل وصحيح ولا يحتاج إعادة.'],
      ['D4', 'الالتزام بالمواعيد المتفق عليها', 'تلتزم بالمواعيد التي تعهدت بها لنا.'],
      ['D5', 'الاتفاق المسبق قبل أي عمل مشترك', 'تتفق معنا قبل بدء أي عمل مشترك، لا بعد ظهور المشكلة.']
    ],
    HEAD_ITEMS: [
      ['X1', 'تحقيق المطلوب منه', 'سلّم ما طُلب منه منذ بداية الفترة بالكمية والجودة المتفق عليها.\nإن لم يكن له مطلوب واضح فاختر «لا أعرف»، فهذا ليس تقصيرًا منه.']
    ],
    ROLE: [
      ['RF1', 'احترام من نخدمهم', 'يعامل أفراد المجتمع ومن نخدمهم بكرامة وصبر.\nيستمع قبل أن يقرر، ويفي بما وعدهم به.', '', 'الفريق الميداني', 'off'],
      ['RF2', 'السلامة والعناية في الميدان', 'يلتزم بقواعد السلامة والحماية، ويبلّغ عن الحوادث والمخاطر فورًا.\nيعتني بالمعدات والمستلزمات والسجلات في الميدان.', '', 'الفريق الميداني', 'off'],
      ['RA1', 'دقة السجلات واكتمالها', 'السجلات المالية والإدارية صحيحة وكاملة وفي موعدها.\nلكل دفعة وكل قرار مستنداته.', '', 'المالية والإدارة', 'off'],
      ['RA2', 'خدمة الزملاء بروح المساعدة', 'يشرح الإجراءات بوضوح ويرد على الطلبات في موعدها.\nيساعد الزملاء على الوصول إلى الصواب، بدل الاكتفاء برفض الخطأ.', '', 'المالية والإدارة', 'off'],
      ['RM1', 'التخطيط والمتابعة حتى النهاية', 'يحوّل الخطط إلى خطوات واضحة، لكل منها مسؤول وموعد.\nيتابع حتى يكتمل العمل، ويعدّل حين تتغير الظروف.', '', 'الإدارة العليا', 'off'],
      ['RM2', 'حسن استخدام الموارد', 'يستخدم المال والوقت والناس بحكمة.\nتوازن قراراته بين التكلفة والنفع لمن نخدمهم.', '', 'الإدارة العليا', 'off'],
      ['RV1', 'الالتزام والاعتمادية', 'يحضر المناوبات والمهام المتفق عليها في موعدها، أو ينبّه مبكرًا إن تعذّر عليه ذلك.\nيُكمل ما التزم به.', '', 'المتطوعون', 'off'],
      ['RV2', 'تمثيلنا بصورة طيبة', 'يلتزم بمدونة السلوك وقواعد الحماية لدينا.\nيتكلم ويتصرف بطريقة تبني الثقة في المؤسسة.', '', 'المتطوعون', 'off']
    ],
    SELF_OPEN: [
      ['S_EXPECT', 'ما المطلوب منك منذ بداية الفترة كما فهمته؟', 'من الوصف الوظيفي، أو مما طلبه رئيسك، أو من خطة الفريق. إن لم يكن لديك مطلوب مكتوب أو واضح فاكتب ذلك بوضوح.', 'yes'],
      ['S_ACH', 'أهم 3 أشياء أنجزتها مما كان مطلوبًا منك', 'واحدًا تحت الآخر. لكل إنجاز: ماذا عملت؟ ما النتيجة بالأرقام إن أمكن (مثل عدد المستفيدين)؟ وما الذي يثبته (صور، ملف، تقرير، تاريخ)؟', 'yes'],
      ['S_CONTRIB', 'مساهمتك أنت في مستهدفات فريقك (اختياري)', 'إن كان لعملك أرقام، فاكتب ما نفذته أو شاركت فيه. {targets}', 'no'],
      ['S_FAIL', 'ما الذي لم يتحقق كما خُطط له في عملك؟', 'اذكر بصراحة مهمة أو هدفًا لم يتحقق كما كان مطلوبًا.', 'yes'],
      ['S_OWN', 'ما دورك أنت فيما لم يتحقق؟', 'ما الذي كان بإمكانك أن تفعله بشكل مختلف؟', 'yes'],
      ['S_EXT', 'هل كانت هناك أسباب خارجة عن إرادتك؟ (اختياري)', 'ظروف أو أطراف أخرى أثرت على النتيجة — مع مثال محدد.', 'no'],
      ['S_LEARN', 'ماذا تعلمت منذ بداية الفترة؟', 'مهارة أو معلومة أو طريقة عمل جديدة، ولو صغيرة.', 'yes'],
      ['S_PLAN', 'خطتك للتطوير خلال الأشهر الستة القادمة', 'حدد هدفين أو ثلاثة: ماذا ستطوّر؟ كيف؟ ومتى؟', 'yes'],
      ['S_SUP_HEAD', 'ما الدعم الذي تحتاجه من رئيسك المباشر؟ (اختياري)', 'مثل: تدريب، أداة، وقت، توضيح للمهام. اتركه فارغًا إن لم تحتج شيئًا.', 'no'],
      ['S_SUP_DEPT', 'ما الدعم الذي تحتاجه من الإدارات الأخرى؟ (اختياري)', 'اذكر الإدارة وما تحتاجه منها تحديدًا.', 'no']
    ],
    SELF_HEAD: [
      ['S_TEAMCH', 'ما أكبر التحديات التي تواجه فريقك؟ وما دورك أنت فيها كمدير؟', 'اذكر التحدي، وما قمت به أنت كمدير لمعالجته، وما كان بإمكانك فعله بشكل أفضل.', 'yes']
    ],
    HEAD_OPEN: [
      ['H_SET', 'هل حدّدت له المطلوب منه منذ بداية الفترة؟', 'نسأل لأن الموظف لا يُقيَّم على «تحقيق المطلوب» إلا إذا كان المطلوب واضحًا له.', 'yes'],
      ['H_DISC', 'هل تحدثت معه عن نقاط التحسين هذه قبل هذا التقييم؟', 'من حق الموظف أن يعرف ما يحتاج إلى تحسينه قبل أن يُقيَّم عليه.', 'yes'],
      ['H_DID', 'ما الدعم أو التوجيه الذي قدّمته له لتحسين هذه النقاط؟', 'متى نبّهته؟ ما التدريب أو الأدوات التي وفّرتها؟ كيف تابعت؟ إن لم تفعل شيئًا بعد فاكتب ذلك. (مطلوب إذا اخترت 1 أو 2 في أي بند)', 'low'],
      ['H_MINE', 'ما دورك أنت، كرئيسه، فيما وصل إليه أداؤه من نجاح أو تعثر؟', 'مثل: توضيح المهام، الدعم الذي قدّمته، ضغط العمل، الموارد، سرعة قراراتك. إن لم يوجد شيء فاكتب ذلك.', 'yes']
    ],
    MEMBER_OPEN: [
      ['M_SET', 'هل حدّد لك رئيسك المطلوب منك منذ بداية الفترة؟', '', 'yes'],
      ['M_TOLD', 'كم مرة أخبرك رئيسك بوضوح بما تحتاج إلى تحسينه في عملك وكيف تحسّنه؟', '', 'yes'],
      ['M_HELP', 'اذكر موقفًا صعبًا واجهته في عملك: كيف ساعدك رئيسك، أو ما الذي كنت تتمنى أن يفعله؟ (اختياري)', 'مثال واحد يكفي، واتركه فارغًا إن لم يحدث.', 'no']
    ],
    PERSON_OPEN: [
      ['O_START', 'شيء أنصحه أن يبدأ فعله أو يزيد منه', '', 'yes'],
      ['O_STOP', 'شيء أنصحه أن يتوقف عنه (اختياري)', '', 'no'],
      ['O_KEEP', 'شيء يفعله جيدًا وأرجو أن يستمر عليه', '', 'yes'],
      ['O_EASIER', 'شيء واحد يجعل العمل معه أسهل (اختياري)', '', 'no']
    ]
  }
};

/** Turns a raw question row [id, title, help, required, depts, 'off'] into a question object. */
function makeQuestion_(section, row) {
  var id = String(row[0]).trim(), req = String(row[3] == null ? '' : row[3]).trim();
  var q = { id: id, title: String(row[1] || '').trim(), help: String(row[2] || ''), section: section, off: row[5] === 'off',
    required: RATING_SECTIONS.indexOf(section) >= 0 || yes_(req), requiredIfLow: reqLow_(req),
    depts: String(row[4] || '').split(/[,،]/).map(function (s) { return s.trim(); }).filter(String) };
  q.kind = RATING_SECTIONS.indexOf(section) >= 0 ? 'rating' : CHOICE_OPTIONS[id] ? 'choice' : 'text';
  if (q.kind === 'choice') q.options = CHOICE_OPTIONS[id];
  return q;
}
/** withOff: also the ready-made questions that start switched off (the role questions), for writing the Questions tab. */
function defaultBank_(lang, withOff) {
  var src = DEFAULT_BANK[lang] || DEFAULT_BANK.en, out = {};
  SECTIONS.forEach(function (s) { out[s] = (src[s] || []).map(function (r) { return makeQuestion_(s, r); }).filter(function (q) { return withOff || !q.off; }); });
  return out;
}
/** The question bank in use: the «Questions» tab if it exists and is valid, else the default bank of the chosen language. */
var __BANK = null;
function Q_() {
  if (__BANK) return __BANK;
  var fromSheet = null;
  try { if (typeof readQuestionsTab_ === 'function') fromSheet = readQuestionsTab_(); } catch (e) { fromSheet = null; }
  __BANK = fromSheet || defaultBank_(lang_());
  var targets = String(setting_('ORG_TARGETS') || '').trim();
  SECTIONS.forEach(function (s) { __BANK[s].forEach(function (q) { q.help = q.help.replace('{targets}', targets); }); });
  return __BANK;
}
function resetBank_() { __BANK = null; }

/**
 * The made-up example team (for trying the tool, the built-in test, and the automatic checks).
 * Names are fictional; every email ends in @example.org, a domain reserved for examples.
 * [key, name, department, job title, manager key]
 */
var EXAMPLE_TEAM = {
  en: [
    ['nadia', 'Nadia Rahman', 'Leadership', 'Executive Director', ''],
    ['khaled', 'Khaled Nour', 'Finance', 'Finance Manager', 'nadia'],
    ['saeed', 'Saeed Amin', 'Finance', 'Accountant', 'khaled'],
    ['mona', 'Mona Fawzy', 'Finance', 'Accountant', 'khaled'],
    ['rami', 'Rami Wahba', 'Finance', 'Procurement Officer', 'khaled'],
    ['samir', 'Samir Lotfy', 'Finance', 'Office Assistant', 'khaled'],
    ['hala', 'Hala Kamel', 'Programs', 'Programs Manager', 'nadia'],
    ['karim', 'Karim Zaki', 'Programs', 'Program Coordinator', 'hala'],
    ['yasmin', 'Yasmin Farid', 'Programs', 'Program Coordinator', 'hala'],
    ['tarek', 'Tarek Salem', 'Programs', 'Field Officer', 'hala'],
    ['omar', 'Omar Haddad', 'Communications', 'Communications Lead', 'nadia'],
    ['laila', 'Laila Aziz', 'Communications', 'Content Officer', 'omar']
  ],
  ar: [
    ['nadia', 'نادية رحمن', 'القيادة', 'المديرة التنفيذية', ''],
    ['khaled', 'خالد نور', 'المالية', 'مدير المالية', 'nadia'],
    ['saeed', 'سعيد أمين', 'المالية', 'محاسب', 'khaled'],
    ['mona', 'منى فوزي', 'المالية', 'محاسبة', 'khaled'],
    ['rami', 'رامي وهبة', 'المالية', 'مسؤول المشتريات', 'khaled'],
    ['samir', 'سمير لطفي', 'المالية', 'مساعد إداري', 'khaled'],
    ['hala', 'هالة كامل', 'البرامج', 'مديرة البرامج', 'nadia'],
    ['karim', 'كريم زكي', 'البرامج', 'منسق برامج', 'hala'],
    ['yasmin', 'ياسمين فريد', 'البرامج', 'منسقة برامج', 'hala'],
    ['tarek', 'طارق سالم', 'البرامج', 'مسؤول ميداني', 'hala'],
    ['omar', 'عمر حداد', 'الاتصال', 'قائد فريق الاتصال', 'nadia'],
    ['laila', 'ليلى عزيز', 'الاتصال', 'مسؤولة المحتوى', 'omar']
  ]
};
/** Samir has no email: he is rated online and rates others on paper. */
var EXAMPLE_NO_EMAIL = ['samir'];
/** [rater key, ratee key, reason, both directions] */
var EXAMPLE_LINKS = {
  en: [
    ['karim', 'rami', 'Purchase requests for program supplies', true],
    ['yasmin', 'mona', 'Program payments and receipts', true],
    ['tarek', 'saeed', 'Field advances and settlements', true],
    ['saeed', 'mona', 'Same finance team: payments and records', true],
    ['karim', 'yasmin', 'Same programs team: shared activities', true],
    ['tarek', 'karim', 'Field activities and visits', true],
    ['laila', 'karim', 'Program photos and stories from the field', true],
    ['samir', 'saeed', 'Office petty cash and receipts', true],
    ['laila', 'yasmin', 'Program stories and photos', true],
    ['hala', 'khaled', 'Program budgets and payments', false],
    ['samir', 'rami', 'Same office: purchases and errands', true]
  ],
  ar: [
    ['karim', 'rami', 'طلبات شراء مستلزمات البرامج', true],
    ['yasmin', 'mona', 'مدفوعات البرامج وإيصالاتها', true],
    ['tarek', 'saeed', 'السلف الميدانية وتسويتها', true],
    ['saeed', 'mona', 'نفس فريق المالية: المدفوعات والسجلات', true],
    ['karim', 'yasmin', 'نفس فريق البرامج: أنشطة مشتركة', true],
    ['tarek', 'karim', 'الأنشطة والزيارات الميدانية', true],
    ['laila', 'karim', 'صور البرامج وقصصها من الميدان', true],
    ['samir', 'saeed', 'العهدة النثرية والإيصالات في المكتب', true],
    ['laila', 'yasmin', 'قصص البرامج وصورها', true],
    ['hala', 'khaled', 'موازنات البرامج ومدفوعاتها', false],
    ['samir', 'rami', 'نفس المكتب: المشتريات والمشاوير', true]
  ]
};
function exampleEmail_(key) { return EXAMPLE_NO_EMAIL.indexOf(key) >= 0 ? '' : key + '@example.org'; }
/** The example team as team objects, in the given language. */
function exampleTeam_(lang) {
  var rows = EXAMPLE_TEAM[lang] || EXAMPLE_TEAM.en;
  return rows.map(function (r) {
    return { name: r[1], email: exampleEmail_(r[0]) || noEmailId_(r[1]), dept: r[2], title: r[3],
      manager: r[4] ? exampleEmail_(r[4]) : '', active: true };
  });
}
function exampleLinks_(lang) {
  return (EXAMPLE_LINKS[lang] || EXAMPLE_LINKS.en).map(function (r) {
    var t = exampleTeam_(lang), by = {};
    (EXAMPLE_TEAM[lang] || EXAMPLE_TEAM.en).forEach(function (x, i) { by[x[0]] = t[i].email; });
    return { rater: by[r[0]], ratee: by[r[1]], reason: r[2], both: !!r[3] };
  });
}
