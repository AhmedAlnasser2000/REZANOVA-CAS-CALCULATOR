// Home page copy for the voyage sections, the rebuilt story and the status. English and Arabic are edited together.
import type { Locale } from './site';

export const workspacesOpen = ['equation', 'graphing', 'integration', 'notebook'] as const;
export const workspacesRebuilding = {
  en: ['Calculate', 'Table', 'Matrix', 'Vector', 'Calculus', 'Trigonometry', 'Geometry', 'Statistics', 'Labs'],
  ar: ['الحساب', 'الجداول', 'المصفوفات', 'المتجهات', 'التفاضل والتكامل', 'المثلثات', 'الهندسة', 'الإحصاء', 'المختبرات'],
};

export const home = {
  en: {
    voyage: 'The voyage',
    window: {
      minimize: 'Minimize',
      restore: 'Restore',
      maximize: 'Maximize',
      close: 'Close',
      reopen: 'Reopen',
      closed: 'closed',
      verified: 'Verified',
      proved: 'Proved',
      input: 'Problem',
      answer: 'Answer',
      where: 'where',
      how: 'How it was checked',
      checks: 'Checks passed',
      time: 'Computed in',
      inApp: 'In the app',
      source: 'Pre-computed by the real engine; the browser app gives the same answer.',
      headlines: { 'Verified exactly': 'Verified exactly', Certified: 'Certified' } as Record<string, string>,
      antiderivative: 'Verified antiderivative',
      nonElementary: 'No elementary antiderivative',
      english: '',
    },
    equation: {
      eyebrow: 'First stop · Equation',
      title: 'Every answer, checked before it is shown.',
      intro:
        'Equations, inequalities, systems and statements with ∀ and ∃, decided exactly over the real or complex numbers. When there is no formula, the roots are still exact — and when a problem cannot be decided yet, Equation says so instead of guessing.',
    },
    graphing: {
      eyebrow: 'Second stop · Graphing',
      title: 'See the shape of things.',
      intro:
        'Implicit curves, regions, complex functions and surfaces, drawn on the GPU and traced with readouts that are proved where possible.',
      shots: [
        { file: 'app-graphing-curve', title: 'y² = x³ − x', caption: 'An implicit curve, with both of its pieces.' },
        { file: 'app-graphing-complex', title: 'f(z) = (z³ − 1)/(z² + 1)', caption: 'Domain colouring: zeros and poles at a glance.' },
        { file: 'app-graphing-surface', title: 'z = sin x · cos y', caption: 'A surface you can turn and explore.' },
      ],
    },
    integration: {
      eyebrow: 'Third stop · Integration',
      title: 'An antiderivative — or a proof that none exists.',
      intro:
        'Integration does not try patterns. It decides, for the classes it covers so far: it returns an antiderivative checked by differentiation, or proves that no elementary one exists.',
    },
    notebook: {
      eyebrow: 'Harbour · Notebook',
      title: 'Somewhere to keep what you found.',
      intro:
        'Write with mathematics, images and pages, then publish to PDF, DOCX or an offline web page.',
      file: 'notebook',
      caption: 'A Notebook page.',
    },
    story: {
      eyebrow: 'Why REZANOVA was rebuilt',
      title: 'From stepping stones to the open sea.',
      old: 'The old way',
      new: 'The new way',
      paragraphs: [
        'The first engines grew one family at a time. Equation began with simple solving, then higher degrees behind caps, then complex numbers, then inequalities, then Cardano’s and Ferrari’s formulas for cubics and quartics. Each step was another special route, and the other workspaces grew the same way. It worked, but it could never become general: there are always more families than routes.',
        'That limitation saddened me, so instead of adding the next family I started over. The new Equation and Integration engines were built on general algorithms and decision procedures from day one. They handle whole classes of problems instead of lists of cases.',
      ],
      pillars: [
        {
          title: 'Equation',
          body: 'Exact algebra over the rationals and algebraic numbers, Gröbner bases, cylindrical algebraic decomposition, quantifier elimination and certified numerics — and every answer is checked before it is shown.',
        },
        {
          title: 'Integration',
          body: 'Risch-style decision procedures over differential fields. For the classes it covers so far, it decides whether an elementary antiderivative exists instead of trying patterns.',
        },
      ],
      oldIslands: ['Simple solving', 'Degree caps', 'Complex', 'Inequalities', 'Cardano · Ferrari'],
      oldCaption: 'One island per family, each reached by its own route. The sea between them stays out of reach.',
      newCaption: 'One chart for the whole sea. Every example on this page is a point on it.',
      chartLabels: ['Polynomials', 'Parameters', 'Regions', 'For all · exists', 'Systems', 'Periodic', 'Lambert W', 'Radicals', '∫ rational', '∫ exponential', 'No elementary ∫'],
    },
    status: {
      eyebrow: 'Where it stands',
      title: 'Far stronger — and resting for a while.',
      body: [
        'Equation, Graphing and Integration came out of this far stronger. The other workspaces will be rebuilt the same way and can’t be opened until then.',
        'Development is paused now so I can catch up on my studies. It will resume next year.',
      ],
      open: 'Open now',
      rebuilding: 'Being rebuilt',
      openNames: ['Equation', 'Graphing', 'Integration', 'Notebook', 'Settings', 'History', 'Guide'],
    },
  },
  ar: {
    voyage: 'الرحلة',
    window: {
      minimize: 'تصغير',
      restore: 'استعادة',
      maximize: 'تكبير',
      close: 'إغلاق',
      reopen: 'إعادة الفتح',
      closed: 'مغلقة',
      verified: 'تم التحقق',
      proved: 'مُثبت',
      input: 'المسألة',
      answer: 'الجواب',
      where: 'حيث',
      how: 'كيف تم التحقق',
      checks: 'الفحوص التي نجحت',
      time: 'زمن الحساب',
      inApp: 'في التطبيق',
      source: 'حُسبت مسبقًا بالمحرك الحقيقي، وتعطي نسخة المتصفح الجواب نفسه.',
      headlines: { 'Verified exactly': 'تم التحقق بدقة تامة', Certified: 'مُثبت' } as Record<string, string>,
      antiderivative: 'دالة أصلية مُتحقق منها',
      nonElementary: 'لا توجد دالة أصلية أولية',
      english: 'كما يعرضها التطبيق (بالإنجليزية):',
    },
    equation: {
      eyebrow: 'المحطة الأولى · المعادلات',
      title: 'كل جواب يُتحقق منه قبل أن يُعرض.',
      intro:
        'معادلات ومتباينات وأنظمة وعبارات بـ ∀ و∃، تُحسم بدقة تامة على الأعداد الحقيقية أو المركبة. وحين لا توجد صيغة تبقى الجذور دقيقة، وحين لا يمكن حسم مسألة بعد تقول المعادلات ذلك بدل التخمين.',
    },
    graphing: {
      eyebrow: 'المحطة الثانية · الرسم البياني',
      title: 'شاهد شكل الأشياء.',
      intro:
        'منحنيات ضمنية ومناطق ودوال مركبة وأسطح، تُرسم على معالج الرسوميات وتُتتبع بقراءات مُثبتة حيثما أمكن.',
      shots: [
        { file: 'app-graphing-curve', title: 'y² = x³ − x', caption: 'منحنى ضمني بجزأيه كليهما.' },
        { file: 'app-graphing-complex', title: 'f(z) = (z³ − 1)/(z² + 1)', caption: 'تلوين المجال: الأصفار والأقطاب بنظرة واحدة.' },
        { file: 'app-graphing-surface', title: 'z = sin x · cos y', caption: 'سطح يمكنك تدويره واستكشافه.' },
      ],
    },
    integration: {
      eyebrow: 'المحطة الثالثة · التكامل',
      title: 'دالة أصلية، أو برهان على أنها غير موجودة.',
      intro:
        'لا يجرّب التكامل أنماطًا، بل يحسم ضمن الأصناف التي يغطيها حتى الآن: يعطي دالة أصلية يُتحقق منها بالاشتقاق، أو يثبت أنه لا توجد دالة أصلية أولية.',
    },
    notebook: {
      eyebrow: 'المرفأ · الدفتر',
      title: 'مكان تحفظ فيه ما وجدته.',
      intro: 'اكتب بالرياضيات والصور والصفحات، ثم انشر بصيغة PDF أو DOCX أو صفحة ويب تعمل دون اتصال.',
      file: 'notebook',
      caption: 'صفحة من الدفتر.',
    },
    story: {
      eyebrow: 'لماذا أُعيد بناء REZANOVA',
      title: 'من حجارة العبور إلى البحر المفتوح.',
      old: 'الطريقة القديمة',
      new: 'الطريقة الجديدة',
      paragraphs: [
        'نمت المحركات الأولى عائلةً بعد عائلة. بدأت المعادلات بالحل البسيط، ثم الدرجات الأعلى ضمن سقوف، ثم الأعداد المركبة، ثم المتباينات، ثم صيغتي كاردانو وفيراري للمعادلات التكعيبية والرباعية. كانت كل خطوة مسارًا خاصًا آخر، ونمت مساحات العمل الأخرى بالطريقة نفسها. نجح ذلك، لكنه لم يكن ليصبح عامًا أبدًا: فالعائلات دائمًا أكثر من المسارات.',
        'أحزنني هذا القيد، فبدل أن أضيف العائلة التالية بدأت من جديد. بُني محركا المعادلات والتكامل الجديدان على خوارزميات عامة وإجراءات حسم منذ اليوم الأول، فهما يتعاملان مع أصناف كاملة من المسائل بدل قوائم من الحالات.',
      ],
      pillars: [
        {
          title: 'المعادلات',
          body: 'جبر دقيق على الأعداد النسبية والجبرية، وقواعد غروبنر، والتفكيك الجبري الأسطواني، وحذف المكمّمات، وحسابات عددية مُثبتة، ويُتحقق من كل جواب قبل عرضه.',
        },
        {
          title: 'التكامل',
          body: 'إجراءات حسم على طريقة ريش فوق الحقول التفاضلية. ضمن الأصناف التي يغطيها حتى الآن، يحسم وجود دالة أصلية أولية بدل تجربة الأنماط.',
        },
      ],
      oldIslands: ['الحل البسيط', 'سقوف الدرجة', 'المركبة', 'المتباينات', 'كاردانو · فيراري'],
      oldCaption: 'جزيرة لكل عائلة، يُوصل إليها بمسارها الخاص، ويبقى البحر بينها بعيد المنال.',
      newCaption: 'خريطة واحدة للبحر كله، وكل مثال في هذه الصفحة نقطة عليها.',
      chartLabels: ['كثيرات الحدود', 'الوسطاء', 'المناطق', 'لكل · يوجد', 'الأنظمة', 'الدورية', 'Lambert W', 'الجذور', '∫ كسري', '∫ أسي', 'لا ∫ أولي'],
    },
    status: {
      eyebrow: 'أين وصلنا',
      title: 'أقوى بكثير، وفي استراحة لبعض الوقت.',
      body: [
        'خرجت المعادلات والرسم البياني والتكامل من هذا العمل أقوى بكثير. ستُعاد كتابة مساحات العمل الأخرى بالطريقة نفسها، ولا يمكن فتحها حتى ذلك الحين.',
        'التطوير متوقف الآن لأتمكن من اللحاق بدراستي، وسيُستأنف العام القادم.',
      ],
      open: 'متاحة الآن',
      rebuilding: 'قيد إعادة البناء',
      openNames: ['المعادلات', 'الرسم البياني', 'التكامل', 'الدفتر', 'الإعدادات', 'السجل', 'الدليل'],
    },
  },
} satisfies Record<Locale, unknown>;
