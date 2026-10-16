export type Locale = 'en' | 'ar';
export const repository = 'https://github.com/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR';
export const links = {
  repository,
  documentation: `${repository}#readme`,
  releases: `${repository}/releases`,
  issues: `${repository}/issues`,
  license: `${repository}/blob/main/LICENSE`,
};
export const calculatorUrl = import.meta.env.PUBLIC_CALCULATOR_URL || 'https://rezanova-cas.com';
export const calculatorReady = import.meta.env.PUBLIC_CALCULATOR_READY !== 'false';
export const content = {
  en: {
    title: 'REZANOVA — A world of mathematics',
    description:
      'An open-source mathematics workspace: exact equation solving, graphing and integration, with every answer checked before it is shown.',
    navLabel: 'Main navigation',
    skip: 'Skip to content',
    explore: 'Explore',
    docs: 'Documentation',
    otherLanguage: 'العربية',
    eyebrow: 'Open-source mathematics',
    headline: ['A little curiosity.', 'A world of mathematics.'],
    introduction:
      'Solve equations, draw graphs and find integrals exactly — every answer checked before it is shown.',
    open: 'Open in browser',
    preview: 'Preview software',
    issues: 'Known limits',
    scroll: 'Set sail',
    waveLabel: 'The waves, as a graph',
    footerLicense: 'Open source · MIT',
    motto: 'Curiosity computes.',
    close: 'Close',
    launchTitle: 'Open REZANOVA in your browser',
    launchBody:
      'REZANOVA is designed around desktop workspaces. Narrow screens and touch input still have rough edges. Your browser work stays in this browser and does not sync with the desktop app.',
    launchPending:
      'The browser address is not configured for this build of the website. Follow the project on GitHub in the meantime.',
    launchContinue: 'Continue to REZANOVA',
    back: 'Back to the coast',
    detailsLink: 'Capabilities and known limits',
    detailsTitle: 'A little clarity, too.',
    detailsIntro: 'What REZANOVA can do today, and where its boundaries are.',
    limitsTitle: 'Know the boundaries',
    limits: [
      [
        'Preview, not a completeness claim',
        'REZANOVA is evolving software. Its engines decide whole classes of problems, but not every problem; anything outside them ends with a stated reason rather than a guess. Check important results independently.',
      ],
      [
        'Desktop-first application',
        'REZANOVA works best with a spacious desktop layout. Small text, narrow layouts and touch-keyboard behaviour are known usability concerns. A responsive website does not fix those app limitations.',
      ],
      [
        'Browser first, for now',
        'The browser version runs the current engines. The last downloadable Linux packages (v0.3.0) still contain the old engines, so this site points to the browser until the next release.',
      ],
      [
        'Browser storage',
        'Browser work is stored locally in that browser. Clearing site data can remove it. There is no automatic desktop-to-browser sync.',
      ],
      [
        'Workspaces being rebuilt',
        'Calculate, Table, Matrix, Vector, Calculus, Trigonometry, Geometry, Statistics and Labs stay visible in the app but cannot be opened until each is rebuilt on a new engine.',
      ],
    ],
    roadmapTitle: 'Resting, then onward',
    roadmapBody:
      'Development is paused so I can catch up on my studies. It will resume next year, with the remaining workspaces rebuilt the same way. No date is promised here.',
    sourceNote:
      'Capability descriptions are based on the project repository. See its documentation and issue tracker for technical details.',
    report: 'View or report an issue',
    releases: 'Release notes',
  },
  ar: {
    title: 'REZANOVA — عالم من الرياضيات',
    description:
      'مساحة عمل رياضية مفتوحة المصدر: حل دقيق للمعادلات ورسم بياني وتكامل، مع التحقق من كل جواب قبل عرضه.',
    navLabel: 'التنقل الرئيسي',
    skip: 'انتقل إلى المحتوى',
    explore: 'استكشف',
    docs: 'التوثيق',
    otherLanguage: 'English',
    eyebrow: 'رياضيات مفتوحة المصدر',
    headline: ['قليل من الفضول.', 'عالم من الرياضيات.'],
    introduction: 'حُلّ المعادلات وارسم الدوال وأوجد التكاملات بدقة تامة، مع التحقق من كل جواب قبل عرضه.',
    open: 'افتح في المتصفح',
    preview: 'نسخة تجريبية',
    issues: 'الحدود المعروفة',
    scroll: 'أبحِر',
    waveLabel: 'الأمواج على هيئة رسم بياني',
    footerLicense: 'مفتوح المصدر · MIT',
    motto: 'الفضول يفتح الآفاق.',
    close: 'إغلاق',
    launchTitle: 'افتح REZANOVA في متصفحك',
    launchBody:
      'صُممت REZANOVA حول مساحات عمل للحاسوب. ما زالت الشاشات الضيقة والإدخال باللمس بحاجة إلى تحسينات. تُحفظ أعمال المتصفح في هذا المتصفح، ولا تتزامن مع تطبيق الحاسوب.',
    launchPending: 'لم يُضبط عنوان المتصفح في هذه النسخة من الموقع. يمكنك في هذه الأثناء متابعة المشروع على GitHub.',
    launchContinue: 'متابعة إلى REZANOVA',
    back: 'العودة إلى الساحل',
    detailsLink: 'الإمكانات والحدود المعروفة',
    detailsTitle: 'وقليل من الوضوح أيضًا.',
    detailsIntro: 'ما تقدمه REZANOVA اليوم، وأين تقع حدودها.',
    limitsTitle: 'تعرّف على الحدود',
    limits: [
      [
        'نسخة تجريبية بتغطية محدودة',
        'REZANOVA برنامج يتطور باستمرار. تحسم محركاته أصنافًا كاملة من المسائل، لا كل المسائل؛ وما يقع خارجها ينتهي بسبب مذكور لا بتخمين. تحقّق من النتائج المهمة بصورة مستقلة.',
      ],
      [
        'تطبيق موجّه للحاسوب أولًا',
        'تعمل REZANOVA بصورة أفضل في مساحة عرض واسعة. صغر النصوص والتخطيطات الضيقة وسلوك لوحة المفاتيح باللمس مشكلات استخدام معروفة. تجاوب الموقع مع الشاشات لا يعالج قيود التطبيق نفسه.',
      ],
      [
        'المتصفح أولًا في الوقت الحالي',
        'تعمل نسخة المتصفح بالمحركات الحالية. أما آخر حزم لينكس القابلة للتنزيل (v0.3.0) فما زالت تحتوي المحركات القديمة، لذلك يشير هذا الموقع إلى المتصفح حتى الإصدار القادم.',
      ],
      [
        'الحفظ في المتصفح',
        'تُحفظ الأعمال محليًا في المتصفح المستخدم، وقد يؤدي مسح بيانات الموقع إلى حذفها. لا توجد مزامنة تلقائية مع تطبيق الحاسوب.',
      ],
      [
        'مساحات عمل قيد إعادة البناء',
        'تبقى مساحات الحساب والجداول والمصفوفات والمتجهات والتفاضل والتكامل والمثلثات والهندسة والإحصاء والمختبرات ظاهرة في التطبيق، لكن لا يمكن فتحها حتى يُعاد بناء كل منها على محرك جديد.',
      ],
    ],
    roadmapTitle: 'استراحة، ثم إلى الأمام',
    roadmapBody:
      'التطوير متوقف لأتمكن من اللحاق بدراستي، وسيُستأنف العام القادم مع إعادة بناء مساحات العمل المتبقية بالطريقة نفسها. لا نعد هنا بموعد محدد.',
    sourceNote: 'تستند أوصاف الإمكانات إلى مستودع المشروع. راجع التوثيق وسجل المشكلات للاطلاع على التفاصيل التقنية.',
    report: 'عرض مشكلة أو الإبلاغ عنها',
    releases: 'ملاحظات الإصدارات',
  },
};
