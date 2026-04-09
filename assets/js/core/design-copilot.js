// ══════════════════════════════════════════════════
//   روبوت التصميم الإبداعي — Design Copilot
//   خطوة بخطوة: من الفكرة إلى المخرج الجاهز
// ══════════════════════════════════════════════════

// ─── أنواع المستخدمين ───────────────────────────
const USER_TYPES = [
  { key: 'business', label: 'صاحب منشأة / مشروع', icon: '🏢', color: '#4E73C2' },
  { key: 'employee', label: 'موظف',                icon: '💼', color: '#0ea5e9' },
  { key: 'individual',label: 'فرد',               icon: '👤', color: '#a855f7' },
  { key: 'student',  label: 'طالب',               icon: '🎓', color: '#22c55e' },
];

// ─── كتالوج الخدمات ────────────────────────────
const DESIGN_SERVICES = {
  logo: {
    key: 'logo', label: 'تصميم شعار', icon: '✨', free: true,
    desc: 'شعار احترافي يعكس هوية منشأتك أو نشاطك بألوان وأشكال مُختارة.',
    for: ['business','individual','student','employee'],
    suggestAfter: ['letterhead','business_card','stamp'],
  },
  letterhead: {
    key: 'letterhead', label: 'ورق رسمي / ترويسة', icon: '📄', free: true,
    desc: 'ترويسة خطابات رسمية بهوية منشأتك جاهزة للطباعة.',
    for: ['business','employee'],
    suggestAfter: ['stamp','official_letter','company_profile'],
  },
  stamp: {
    key: 'stamp', label: 'ختم رسمي', icon: '🔖', free: true,
    desc: 'ختم دائري رسمي باسم منشأتك جاهز للطباعة والاستخدام.',
    for: ['business','employee'],
    suggestAfter: ['letterhead','official_letter'],
  },
  business_card: {
    key: 'business_card', label: 'بطاقة أعمال', icon: '🪪', free: true,
    desc: 'بطاقة أعمال أنيقة بكل بياناتك الاحترافية.',
    for: ['business','employee','individual'],
    suggestAfter: ['logo','social_post','profile'],
  },
  flyer: {
    key: 'flyer', label: 'إعلان / فلاير', icon: '📢', free: true,
    desc: 'تصميم إعلان جذاب للمنتجات أو الخدمات أو العروض الترويجية.',
    for: ['business','individual'],
    suggestAfter: ['social_post','logo'],
  },
  social_post: {
    key: 'social_post', label: 'منشور سوشيال ميديا', icon: '📱', free: true,
    desc: 'قالب منشور احترافي لانستقرام وسناب شات وغيرها.',
    for: ['business','individual','employee','student'],
    suggestAfter: ['flyer','logo','business_card'],
  },
  official_letter: {
    key: 'official_letter', label: 'خطاب رسمي', icon: '✉️', free: true,
    desc: 'هيكل خطاب رسمي متكامل (تكريم، توصية، طلب، إشعار).',
    for: ['business','employee','student'],
    suggestAfter: ['letterhead','stamp'],
  },
  cv: {
    key: 'cv', label: 'سيرة ذاتية', icon: '📋', free: true,
    desc: 'سيرة ذاتية احترافية مُهيأة لسوق العمل السعودي والخليجي.',
    for: ['individual','employee','student'],
    suggestAfter: ['cover_letter','business_card'],
  },
  cover_letter: {
    key: 'cover_letter', label: 'خطاب تقديم وظيفي', icon: '📝', free: true,
    desc: 'خطاب تقديمي مُقنع يرافق سيرتك الذاتية.',
    for: ['individual','employee','student'],
    suggestAfter: ['cv','business_card'],
  },
  research: {
    key: 'research', label: 'بحث / دراسة أكاديمية', icon: '🔬', free: true,
    desc: 'هيكل بحث أو دراسة أكاديمية مكتمل بالأقسام والمراجع.',
    for: ['student','employee'],
    suggestAfter: ['presentation','cv'],
  },
  certificate: {
    key: 'certificate', label: 'شهادة تقدير', icon: '🏆', free: true,
    desc: 'شهادة تقدير أو إنجاز أنيقة جاهزة للطباعة.',
    for: ['business','employee','student'],
    suggestAfter: ['logo','letterhead'],
  },
  menu: {
    key: 'menu', label: 'قائمة / منيو', icon: '🍽️', free: false,
    premiumNote: 'تصميم مميز مع ألوان متعددة وأيقونات',
    desc: 'تصميم قائمة مطعم أو مقهى أو خدمات بتصميم احترافي.',
    for: ['business'],
    suggestAfter: ['logo','flyer','social_post'],
  },
  presentation: {
    key: 'presentation', label: 'عرض تقديمي', icon: '🖥️', free: false,
    premiumNote: 'قوالب متعددة وتصميم بالهوية',
    desc: 'عرض تقديمي متكامل (بيتش ديك، تقرير، دراسة) بتصميم احترافي.',
    for: ['business','employee','student'],
    suggestAfter: ['logo','company_profile'],
  },
  company_profile: {
    key: 'company_profile', label: 'بروفايل الشركة', icon: '🏛️', free: false,
    premiumNote: 'تصميم كامل مع صفحات متعددة',
    desc: 'ملف تعريفي شامل للشركة أو المشروع يُقدَّم للعملاء والشركاء.',
    for: ['business'],
    suggestAfter: ['logo','letterhead','presentation'],
  },
  personal_brand: {
    key: 'personal_brand', label: 'هوية شخصية / براند', icon: '🌟', free: false,
    premiumNote: 'حزمة متكاملة: شعار + ألوان + خطوط',
    desc: 'حزمة هوية بصرية شخصية مُتكاملة تُميّزك في مجالك.',
    for: ['individual','employee'],
    suggestAfter: ['business_card','social_post','cv'],
  },
  visual_identity: {
    key: 'visual_identity', label: 'هوية بصرية كاملة', icon: '🎨', free: false,
    premiumNote: 'الأكثر شمولاً — شعار + ألوان + هدايا + منشورات',
    desc: 'حزمة هوية بصرية شاملة: شعار، ألوان، خطوط، ورق، بطاقة، ختم.',
    for: ['business'],
    suggestAfter: ['logo','letterhead','stamp','business_card','flyer'],
  },
};

// ─── تدفق الخطوات لكل خدمة ──────────────────────
const DESIGN_FLOWS = {
  logo: [
    { key: 'biz_name',   label: 'اسم المنشأة أو النشاط',  type: 'text',   placeholder: 'مثال: مطعم البيت، تقنية المستقبل' },
    { key: 'slogan',     label: 'شعار/تاغلاين (اختياري)', type: 'text',   placeholder: 'مثال: جودة بلا حدود' },
    { key: 'color',      label: 'اللون الرئيسي',           type: 'color_pick' },
    { key: 'logo_shape', label: 'شكل الشعار',              type: 'select', options: ['دائري','مربع','سداسي','نص فقط'] },
    { key: 'style',      label: 'طراز التصميم',            type: 'select', options: ['بسيط وعصري','تراثي وكلاسيكي','جريء وملوّن','تقني وحديث'] },
  ],
  letterhead: [
    { key: 'biz_name',  label: 'اسم المنشأة',             type: 'text',   placeholder: 'مثال: شركة الرياض للتجارة' },
    { key: 'sector',    label: 'النشاط التجاري',          type: 'text',   placeholder: 'مثال: استيراد وتصدير' },
    { key: 'phone',     label: 'رقم الجوال / الهاتف',     type: 'text',   placeholder: '05XXXXXXXX' },
    { key: 'email',     label: 'البريد الإلكتروني',        type: 'text',   placeholder: 'info@example.com' },
    { key: 'address',   label: 'العنوان',                  type: 'text',   placeholder: 'الرياض، حي العليا' },
    { key: 'color',     label: 'اللون الرئيسي',            type: 'color_pick' },
  ],
  stamp: [
    { key: 'biz_name',  label: 'اسم المنشأة',             type: 'text',   placeholder: 'مثال: مؤسسة نور التجارية' },
    { key: 'cr_number', label: 'رقم السجل التجاري (اختياري)', type: 'text', placeholder: '10XXXXXXXXXX' },
    { key: 'city',      label: 'المدينة',                  type: 'text',   placeholder: 'الرياض' },
    { key: 'color',     label: 'لون الختم',                type: 'color_pick' },
  ],
  business_card: [
    { key: 'full_name', label: 'الاسم الكامل',             type: 'text',   placeholder: 'محمد عبدالله الأحمد' },
    { key: 'job_title', label: 'المسمى الوظيفي',           type: 'text',   placeholder: 'مدير تنفيذي / محاسب' },
    { key: 'biz_name',  label: 'اسم المنشأة (اختياري)',   type: 'text',   placeholder: 'شركة الرياض' },
    { key: 'phone',     label: 'رقم الجوال',               type: 'text',   placeholder: '05XXXXXXXX' },
    { key: 'email',     label: 'البريد الإلكتروني',        type: 'text',   placeholder: 'name@example.com' },
    { key: 'website',   label: 'الموقع / الحساب (اختياري)', type: 'text', placeholder: 'www.example.com أو @myaccount' },
    { key: 'color',     label: 'اللون الرئيسي',            type: 'color_pick' },
  ],
  flyer: [
    { key: 'headline',  label: 'العنوان الرئيسي',          type: 'text',   placeholder: 'مثال: عرض لا يُفوَّت! خصم 50%' },
    { key: 'body',      label: 'تفاصيل العرض أو الرسالة', type: 'text',   placeholder: 'مثال: أفضل المنتجات بأقل الأسعار' },
    { key: 'cta',       label: 'عبارة الدعوة (CTA)',       type: 'text',   placeholder: 'تواصل الآن / اطلب الآن' },
    { key: 'phone',     label: 'رقم التواصل (اختياري)',    type: 'text',   placeholder: '05XXXXXXXX' },
    { key: 'color',     label: 'اللون الرئيسي',            type: 'color_pick' },
    { key: 'flyer_type',label: 'نوع الإعلان',              type: 'select', options: ['عرض وتخفيض','إطلاق منتج','حفل / فعالية','خدمة جديدة'] },
  ],
  social_post: [
    { key: 'headline',  label: 'العنوان أو الفكرة الرئيسية', type: 'text', placeholder: 'مثال: نحن الأفضل في طهي القهوة' },
    { key: 'body',      label: 'النص الداعم (اختياري)',     type: 'text',   placeholder: 'تفاصيل إضافية' },
    { key: 'hashtags',  label: 'الهاشتاقات (افصل بفاصلة)', type: 'text',  placeholder: 'قهوة، مقهى، سعودي' },
    { key: 'platform',  label: 'المنصة',                   type: 'select', options: ['انستقرام مربع','انستقرام ستوري','سناب شات','تويتر/X','لينكدإن'] },
    { key: 'color',     label: 'اللون الرئيسي',            type: 'color_pick' },
  ],
  official_letter: [
    { key: 'letter_type', label: 'نوع الخطاب',            type: 'select', options: ['خطاب تكريم','خطاب توصية','خطاب طلب','خطاب إشعار','خطاب رسمي عام'] },
    { key: 'from_name', label: 'اسم المُرسِل / المنشأة',  type: 'text',   placeholder: 'شركة نور لتقنية المعلومات' },
    { key: 'to_name',   label: 'اسم المُرسَل إليه',        type: 'text',   placeholder: 'معالي المدير العام' },
    { key: 'subject',   label: 'موضوع الخطاب',             type: 'text',   placeholder: 'طلب الحصول على معلومات' },
    { key: 'body',      label: 'نص الخطاب',                type: 'textarea', placeholder: 'اكتب محتوى الخطاب هنا...' },
    { key: 'city',      label: 'المدينة والتاريخ',         type: 'text',   placeholder: 'الرياض' },
  ],
  cv: [
    { key: 'full_name', label: 'الاسم الكامل',             type: 'text',   placeholder: 'فاطمة علي العمري' },
    { key: 'job_target',label: 'المسمى الوظيفي المستهدف', type: 'text',   placeholder: 'محاسب مالي / مصمم جرافيك' },
    { key: 'phone',     label: 'رقم الجوال',               type: 'text',   placeholder: '05XXXXXXXX' },
    { key: 'email',     label: 'البريد الإلكتروني',        type: 'text',   placeholder: 'name@gmail.com' },
    { key: 'city',      label: 'المدينة',                  type: 'text',   placeholder: 'جدة' },
    { key: 'summary',   label: 'ملخص مهني',                type: 'textarea', placeholder: 'أكثر من 5 سنوات خبرة في...' },
    { key: 'education', label: 'المؤهل الأكاديمي',         type: 'text',   placeholder: 'بكالوريوس محاسبة — جامعة الملك سعود' },
    { key: 'experience',label: 'آخر وظيفة / أبرز خبرة',  type: 'text',   placeholder: 'محاسب — شركة الخليج 2020-2024' },
    { key: 'skills',    label: 'المهارات الرئيسية',        type: 'text',   placeholder: 'Excel, SAP, التقارير المالية' },
    { key: 'color',     label: 'لون القالب',               type: 'color_pick' },
  ],
  cover_letter: [
    { key: 'full_name', label: 'اسمك الكامل',              type: 'text',   placeholder: 'فاطمة علي العمري' },
    { key: 'job_target',label: 'الوظيفة المتقدم إليها',   type: 'text',   placeholder: 'محاسب مالي' },
    { key: 'company',   label: 'اسم الشركة',               type: 'text',   placeholder: 'شركة الرياض للتطوير' },
    { key: 'why',       label: 'لماذا أنت الأنسب؟',        type: 'textarea', placeholder: 'اذكر أبرز مهاراتك وإنجازاتك...' },
    { key: 'phone',     label: 'رقم التواصل',               type: 'text',  placeholder: '05XXXXXXXX' },
    { key: 'email',     label: 'البريد الإلكتروني',        type: 'text',   placeholder: 'name@gmail.com' },
  ],
  research: [
    { key: 'title',     label: 'عنوان البحث / الدراسة',   type: 'text',   placeholder: 'مثال: أثر التحول الرقمي على قطاع التجزئة' },
    { key: 'author',    label: 'اسم الباحث',               type: 'text',   placeholder: 'اسمك الكامل' },
    { key: 'university',label: 'الجامعة / المؤسسة (اختياري)', type: 'text', placeholder: 'جامعة الملك عبدالعزيز' },
    { key: 'abstract',  label: 'ملخص البحث (مختصر)',       type: 'textarea', placeholder: 'يتناول هذا البحث...' },
    { key: 'sections',  label: 'عدد الفصول / الأقسام',    type: 'select', options: ['3 فصول','4 فصول','5 فصول','6 فصول'] },
  ],
  certificate: [
    { key: 'recipient', label: 'اسم المُكرَّم',            type: 'text',   placeholder: 'أحمد محمد الزهراني' },
    { key: 'reason',    label: 'سبب الشهادة',              type: 'text',   placeholder: 'إتمام دورة تدريبية / أفضل موظف' },
    { key: 'from_org',  label: 'اسم الجهة المانحة',        type: 'text',   placeholder: 'شركة جنان بيز' },
    { key: 'date_str',  label: 'التاريخ',                  type: 'text',   placeholder: 'فبراير 2026' },
    { key: 'color',     label: 'لون الشهادة',              type: 'color_pick' },
  ],
  menu: [
    { key: 'biz_name',  label: 'اسم المطعم / المقهى',     type: 'text',   placeholder: 'مقهى البيت' },
    { key: 'category1', label: 'قسم 1 + أصناف',           type: 'text',   placeholder: 'مشروبات ساخنة: قهوة عربية، لاتيه، كابتشينو' },
    { key: 'category2', label: 'قسم 2 + أصناف',           type: 'text',   placeholder: 'مشروبات باردة: موهيتو، عصائر طازجة' },
    { key: 'category3', label: 'قسم 3 + أصناف (اختياري)',type: 'text',   placeholder: 'حلويات: كيك، كروسان' },
    { key: 'color',     label: 'اللون الرئيسي للقائمة',   type: 'color_pick' },
  ],
  presentation: [
    { key: 'title',     label: 'عنوان العرض',              type: 'text',   placeholder: 'خطة عمل 2026' },
    { key: 'presenter', label: 'اسم المُقدِّم',             type: 'text',  placeholder: 'محمد عبدالله' },
    { key: 'org',       label: 'المنشأة / الجامعة',        type: 'text',   placeholder: 'شركة المستقبل' },
    { key: 'slides',    label: 'عدد الشرائح المقترح',      type: 'select', options: ['5 شرائح','10 شرائح','15 شرائح','20 شريحة'] },
    { key: 'topic_desc',label: 'وصف مختصر للمحتوى',       type: 'textarea', placeholder: 'يتضمن العرض: المقدمة، التحليل، التوصيات...' },
    { key: 'color',     label: 'اللون الرئيسي',            type: 'color_pick' },
  ],
  company_profile: [
    { key: 'biz_name',  label: 'اسم الشركة / المنشأة',    type: 'text',   placeholder: 'شركة الرياض للتقنية' },
    { key: 'vision',    label: 'رؤية الشركة',              type: 'text',   placeholder: 'أن نكون الرائدين في...' },
    { key: 'services',  label: 'أبرز الخدمات / المنتجات', type: 'text',   placeholder: 'تطوير البرمجيات، استشارات تقنية...' },
    { key: 'team_size', label: 'حجم الفريق / التأسيس',    type: 'text',   placeholder: 'تأسست 2020 — فريق 15 شخص' },
    { key: 'contact',   label: 'بيانات التواصل',           type: 'text',   placeholder: 'info@company.com | 05X' },
    { key: 'color',     label: 'اللون الرئيسي',            type: 'color_pick' },
  ],
  personal_brand: [
    { key: 'full_name', label: 'اسمك الكامل / البراند',   type: 'text',   placeholder: 'خالد التميمي | TechKhalid' },
    { key: 'specialty', label: 'تخصصك أو مجالك',          type: 'text',   placeholder: 'مصمم جرافيك / مطور ويب / مدرب' },
    { key: 'tagline',   label: 'جملة تعريفية',             type: 'text',   placeholder: 'أصنع تجارب بصرية لا تُنسى' },
    { key: 'color',     label: 'لونك المميز',              type: 'color_pick' },
    { key: 'shape',     label: 'شكل الشعار الشخصي',       type: 'select', options: ['دائري','مربع','مثلث','نص فقط'] },
  ],
  visual_identity: [
    { key: 'biz_name',  label: 'اسم المنشأة',             type: 'text',   placeholder: 'منشأتك الرائدة' },
    { key: 'sector',    label: 'القطاع',                   type: 'text',   placeholder: 'مطعم / تقنية / تجارة' },
    { key: 'values',    label: 'القيم التي تريد إيصالها', type: 'text',   placeholder: 'الثقة، الجودة، الابتكار' },
    { key: 'color',     label: 'اللون الرئيسي',            type: 'color_pick' },
    { key: 'color2',    label: 'اللون الثانوي',            type: 'color_pick' },
    { key: 'logo_shape',label: 'شكل الشعار',              type: 'select', options: ['دائري','مربع','سداسي','نص فقط'] },
  ],
};

// ─── الحالة ──────────────────────────────────────
let dcUserType    = null;
let dcService     = null;
let dcFlowStep    = 0;
let dcData        = {};
let dcCompleted   = [];

// ─── الألوان الجاهزة للاختيار ────────────────────
const COLOR_PALETTE = [
  { label: 'أزرق ملكي',  value: '#4E73C2' },
  { label: 'بنفسجي',     value: '#a855f7' },
  { label: 'أخضر زمردي', value: '#059669' },
  { label: 'أحمر عميق',  value: '#dc2626' },
  { label: 'برتقالي',    value: '#ea580c' },
  { label: 'ذهبي',       value: '#d97706' },
  { label: 'سماوي',      value: '#0284c7' },
  { label: 'وردي',       value: '#db2777' },
  { label: 'رمادي فحمي', value: '#374151' },
  { label: 'أسود لؤلؤي', value: '#1a1a2e' },
];

// ══════════════════════════════════════════════════
//   دوال التهيئة والتنقل
// ══════════════════════════════════════════════════

function initDesignCopilot() {
  const app = document.getElementById('dc-app');
  app.innerHTML = '';
  dcUserType = null; dcService = null; dcFlowStep = 0; dcData = {};
  app.appendChild(renderWelcome());
}

function renderWelcome() {
  const wrap = el('div', 'dc-welcome');
  wrap.innerHTML = `
    <div class="dc-hero">
      <div class="dc-hero-icon">🎨</div>
      <h1>استوديو التصميم الإبداعي</h1>
      <p>روبوتك الذكي للهوية البصرية والتصميم الاحترافي — خطوة بخطوة حتى المخرج الجاهز</p>
    </div>
    <div class="dc-section-title">أنت:</div>
    <div class="dc-user-grid">
      ${USER_TYPES.map(u => `
        <button class="dc-user-btn" onclick="selectUserType('${u.key}')" style="--ut-color:${u.color}">
          <span class="dc-user-icon">${u.icon}</span>
          <span class="dc-user-label">${u.label}</span>
        </button>
      `).join('')}
    </div>`;
  return wrap;
}

function selectUserType(type) {
  dcUserType = type;
  const app = document.getElementById('dc-app');
  app.innerHTML = '';
  app.appendChild(renderServiceGrid());
}

function renderServiceGrid() {
  const utype = dcUserType;
  const wrap = el('div', 'dc-service-section');
  const user = USER_TYPES.find(u => u.key === utype);
  const services = Object.values(DESIGN_SERVICES).filter(s => s.for.includes(utype));

  wrap.innerHTML = `
    <div class="dc-breadcrumb">
      <button onclick="initDesignCopilot()" class="dc-back-btn">← تغيير</button>
      <span>${user.icon} ${user.label}</span>
    </div>
    <div class="dc-section-title">اختر الخدمة التي تريدها:</div>
    ${dcCompleted.length > 0 ? `<div class="dc-completed-badge">✅ أنجزت ${dcCompleted.length} تصميم${dcCompleted.length > 1 ? 'ات' : ''} في هذه الجلسة</div>` : ''}
    <div class="dc-service-grid">
      ${services.map(s => `
        <div class="dc-service-card ${dcCompleted.includes(s.key) ? 'done' : ''}" onclick="startService('${s.key}')">
          <div class="dc-svc-icon">${s.icon}</div>
          <div class="dc-svc-name">${s.label}</div>
          <div class="dc-svc-desc">${s.desc}</div>
          <div class="dc-svc-badge ${s.free ? 'free' : 'premium'}">
            ${s.free ? '🆓 مجاني' : `⭐ مميز`}
          </div>
          ${dcCompleted.includes(s.key) ? '<div class="dc-svc-done-mark">✅ تم</div>' : ''}
        </div>
      `).join('')}
    </div>`;
  return wrap;
}

function startService(serviceKey) {
  dcService = serviceKey;
  dcFlowStep = 0;
  dcData = {};
  renderFlowUI();
}

function renderFlowUI() {
  const app = document.getElementById('dc-app');
  app.innerHTML = '';
  const svc = DESIGN_SERVICES[dcService];
  const flow = DESIGN_FLOWS[dcService] || [];
  const total = flow.length;
  const pct = total > 0 ? Math.round((dcFlowStep / total) * 100) : 0;

  const wrap = el('div', 'dc-flow-wrap');
  wrap.innerHTML = `
    <div class="dc-breadcrumb">
      <button onclick="renderServiceGridPage()" class="dc-back-btn">← الخدمات</button>
      <span>${svc.icon} ${svc.label}</span>
      ${!svc.free ? `<span class="dc-premium-tag">⭐ مميز</span>` : ''}
    </div>
    <div class="dc-flow-progress">
      <div class="dc-flow-progress-bar" style="width:${pct}%"></div>
    </div>
    <div class="dc-flow-counter">${dcFlowStep < total ? `الخطوة ${dcFlowStep + 1} من ${total}` : '✅ جاهز للتوليد'}</div>
    <div id="dc-flow-body"></div>`;
  app.appendChild(wrap);
  renderCurrentFlowStep();
}

function renderCurrentFlowStep() {
  const flow = DESIGN_FLOWS[dcService] || [];
  const body = document.getElementById('dc-flow-body');

  if (dcFlowStep >= flow.length) {
    body.innerHTML = renderGenerateReady();
    return;
  }

  const step = flow[dcFlowStep];
  let inputHTML = '';

  if (step.type === 'text') {
    inputHTML = `<input type="text" id="dc-input" placeholder="${step.placeholder || ''}" value="${dcData[step.key] || ''}" onkeydown="if(event.key==='Enter')dcNextStep()" class="dc-input" />`;
  } else if (step.type === 'textarea') {
    inputHTML = `<textarea id="dc-input" placeholder="${step.placeholder || ''}" class="dc-input dc-textarea" rows="4">${dcData[step.key] || ''}</textarea>`;
  } else if (step.type === 'select') {
    inputHTML = `<div class="dc-options-grid">${step.options.map(opt =>
      `<button class="dc-opt-btn ${dcData[step.key] === opt ? 'selected' : ''}" onclick="dcSelectOpt('${step.key}','${opt}')">${opt}</button>`
    ).join('')}</div>`;
  } else if (step.type === 'color_pick') {
    const current = dcData[step.key] || COLOR_PALETTE[0].value;
    inputHTML = `
      <div class="dc-color-grid">
        ${COLOR_PALETTE.map(c => `
          <button class="dc-color-swatch ${current === c.value ? 'selected' : ''}"
            style="background:${c.value}" title="${c.label}"
            onclick="dcSelectColor('${step.key}','${c.value}',this)">
            ${current === c.value ? '✓' : ''}
          </button>`).join('')}
      </div>
      <div style="margin-top:.8rem;display:flex;align-items:center;gap:.7rem">
        <label style="font-size:.9rem;color:#666">لون مخصص:</label>
        <input type="color" id="dc-custom-color" value="${current}"
          oninput="dcSelectColor('${step.key}',this.value,null,true)" class="dc-color-picker" />
      </div>`;
  }

  body.innerHTML = `
    <div class="dc-flow-step">
      <div class="dc-step-label">${step.label}</div>
      ${inputHTML}
      <div class="dc-step-actions">
        ${dcFlowStep > 0 ? `<button class="dc-btn-secondary" onclick="dcPrevStep()">← السابق</button>` : ''}
        ${step.type !== 'select' && step.type !== 'color_pick'
          ? `<button class="dc-btn-primary" onclick="dcNextStep()">التالي ←</button>`
          : `<button class="dc-btn-primary" onclick="dcNextStep()">التالي ←</button>`}
      </div>
    </div>`;
}

function dcNextStep() {
  const flow = DESIGN_FLOWS[dcService] || [];
  if (dcFlowStep >= flow.length) { generateOutput(); return; }
  const step = flow[dcFlowStep];

  if (step.type === 'text' || step.type === 'textarea') {
    const inp = document.getElementById('dc-input');
    const val = inp ? inp.value.trim() : '';
    // الحقول الاختيارية مسموح تخطيها
    dcData[step.key] = val;
  } else if (step.type === 'color_pick') {
    if (!dcData[step.key]) dcData[step.key] = COLOR_PALETTE[0].value;
  }

  dcFlowStep++;
  updateFlowProgress();
  renderCurrentFlowStep();
}

function dcPrevStep() {
  if (dcFlowStep > 0) { dcFlowStep--; updateFlowProgress(); renderCurrentFlowStep(); }
}

function dcSelectOpt(key, val) {
  dcData[key] = val;
  document.querySelectorAll('.dc-opt-btn').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
  setTimeout(dcNextStep, 300);
}

function dcSelectColor(key, val, btn, custom = false) {
  dcData[key] = val;
  if (!custom) {
    document.querySelectorAll('.dc-color-swatch').forEach(b => { b.classList.remove('selected'); b.textContent = ''; });
    if (btn) { btn.classList.add('selected'); btn.textContent = '✓'; }
  }
}

function updateFlowProgress() {
  const flow = DESIGN_FLOWS[dcService] || [];
  const pct = Math.round((dcFlowStep / flow.length) * 100);
  const bar = document.querySelector('.dc-flow-progress-bar');
  const counter = document.querySelector('.dc-flow-counter');
  if (bar) bar.style.width = pct + '%';
  if (counter) counter.textContent = dcFlowStep < flow.length ? `الخطوة ${dcFlowStep + 1} من ${flow.length}` : '✅ جاهز للتوليد';
}

function renderGenerateReady() {
  return `
    <div class="dc-ready-box">
      <div class="dc-ready-icon">✨</div>
      <div class="dc-ready-text">كل البيانات جاهزة! اضغط لتوليد التصميم فوراً</div>
      <button class="dc-btn-generate" onclick="generateOutput()">🎨 ولّد التصميم الآن</button>
    </div>`;
}

function renderServiceGridPage() {
  const app = document.getElementById('dc-app');
  app.innerHTML = '';
  app.appendChild(renderServiceGrid());
}

// ══════════════════════════════════════════════════
//   دوال توليد المخرجات
// ══════════════════════════════════════════════════

function generateOutput() {
  const svc = dcService;
  let result = null;

  switch (svc) {
    case 'logo':          result = genLogo(dcData);          break;
    case 'stamp':         result = genStamp(dcData);         break;
    case 'business_card': result = genBusinessCard(dcData);  break;
    case 'flyer':         result = genFlyer(dcData);         break;
    case 'social_post':   result = genSocialPost(dcData);    break;
    case 'certificate':   result = genCertificate(dcData);   break;
    case 'menu':          result = genMenu(dcData);          break;
    case 'personal_brand':result = genPersonalBrand(dcData); break;
    case 'letterhead':    result = { html: genLetterhead(dcData), type:'html', name:'letterhead' }; break;
    case 'official_letter':result= { html: genOfficialLetter(dcData), type:'html', name:'letter' }; break;
    case 'cv':            result = { html: genCV(dcData), type:'html', name:'cv' };                 break;
    case 'cover_letter':  result = { html: genCoverLetter(dcData), type:'html', name:'cover' };     break;
    case 'research':      result = { html: genResearch(dcData), type:'html', name:'research' };     break;
    case 'presentation':  result = { html: genPresentation(dcData), type:'html', name:'presentation' }; break;
    case 'company_profile':result= { html: genCompanyProfile(dcData), type:'html', name:'profile' }; break;
    case 'visual_identity':result= { html: genVisualIdentityPack(dcData), type:'html', name:'identity' }; break;
    default: result = null;
  }

  if (!result) return;

  dcCompleted.push(svc);
  renderResultPage(result);
}

// ─── شعار SVG ────────────────────────────────────
function genLogo({ biz_name = 'منشأة', slogan = '', color = '#4E73C2', logo_shape = 'دائري', style = '' }) {
  const p = color;
  const s = lighten(p);
  const initials = arabicInitials(biz_name);
  const shapeMap = {
    'دائري':   `<circle cx="100" cy="100" r="90" fill="${p}"/>`,
    'مربع':    `<rect x="10" y="10" width="180" height="180" rx="20" fill="${p}"/>`,
    'سداسي':   `<polygon points="100,10 182,55 182,145 100,190 18,145 18,55" fill="${p}"/>`,
    'نص فقط':  '',
  };
  const shape = shapeMap[logo_shape] || shapeMap['دائري'];
  const textY = logo_shape === 'نص فقط' ? 120 : 115;
  const circleStr = logo_shape === 'نص فقط'
    ? `<text x="100" y="90" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="72" fill="${p}" font-weight="bold">${initials}</text>`
    : `${shape}<text x="100" y="${textY}" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="64" fill="white" font-weight="bold">${initials}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230" width="200" height="230">
  ${circleStr}
  <text x="100" y="210" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="17" fill="${p}" font-weight="bold">${biz_name}</text>
  ${slogan ? `<text x="100" y="228" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="10" fill="${s}">${slogan}</text>` : ''}
</svg>`;
  return { svg, type: 'svg', name: 'logo', title: `شعار ${biz_name}` };
}

// ─── ختم SVG ─────────────────────────────────────
function genStamp({ biz_name = 'المنشأة', cr_number = '', city = 'الرياض', color = '#4E73C2' }) {
  const p = color;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="93" fill="none" stroke="${p}" stroke-width="7"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="${p}" stroke-width="2"/>
  <circle cx="100" cy="100" r="72" fill="${p}" fill-opacity=".07"/>
  <text x="100" y="88" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="17" fill="${p}" font-weight="bold">${biz_name}</text>
  ${cr_number ? `<text x="100" y="112" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="12" fill="${p}">س.ت: ${cr_number}</text>` : ''}
  <text x="100" y="132" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="12" fill="${p}">${city} — المملكة العربية السعودية</text>
  <line x1="30" y1="100" x2="75" y2="100" stroke="${p}" stroke-width="1.5"/>
  <line x1="125" y1="100" x2="170" y2="100" stroke="${p}" stroke-width="1.5"/>
</svg>`;
  return { svg, type: 'svg', name: 'stamp', title: `ختم ${biz_name}` };
}

// ─── بطاقة أعمال SVG ─────────────────────────────
function genBusinessCard({ full_name = '', job_title = '', biz_name = '', phone = '', email = '', website = '', color = '#4E73C2' }) {
  const p = color; const s = lighten(p);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240" width="420" height="240">
  <rect width="420" height="240" rx="14" fill="${p}"/>
  <rect x="0" y="0" width="10" height="240" rx="0" fill="${s}" fill-opacity=".5"/>
  <rect x="20" y="20" width="380" height="200" rx="8" fill="none" stroke="white" stroke-width=".8" stroke-opacity=".3"/>
  <text x="390" y="52" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="22" fill="white" font-weight="bold">${full_name}</text>
  <text x="390" y="76" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="13" fill="${s}">${job_title}</text>
  ${biz_name ? `<text x="390" y="96" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="11" fill="white" fill-opacity=".7">${biz_name}</text>` : ''}
  <line x1="30" y1="112" x2="390" y2="112" stroke="white" stroke-width=".6" stroke-opacity=".25"/>
  ${phone  ? `<text x="390" y="136" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="12" fill="white">📞 ${phone}</text>` : ''}
  ${email  ? `<text x="390" y="157" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="12" fill="white">✉️ ${email}</text>` : ''}
  ${website? `<text x="390" y="178" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="12" fill="${s}">🌐 ${website}</text>` : ''}
  <text x="30" y="222" font-family="Tajawal,Cairo,sans-serif" font-size="9" fill="white" fill-opacity=".4">Powered by جنان بيز</text>
</svg>`;
  return { svg, type: 'svg', name: 'business_card', title: `بطاقة ${full_name}` };
}

// ─── فلاير / إعلان SVG ────────────────────────────
function genFlyer({ headline = 'عرض رائع', body = '', cta = 'تواصل الآن', phone = '', color = '#4E73C2', flyer_type = '' }) {
  const p = color; const s = lighten(p);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="300" height="400">
  <defs>
    <linearGradient id="fg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${p};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${darken(p)};stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#fg)"/>
  <rect x="30" y="30" width="540" height="740" rx="16" fill="none" stroke="white" stroke-width="2" stroke-opacity=".3"/>
  <circle cx="300" cy="230" r="130" fill="white" fill-opacity=".06"/>
  <text x="300" y="120" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="18" fill="${s}" font-weight="bold">${flyer_type}</text>
  <text x="300" y="260" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="52" fill="white" font-weight="bold">${headline}</text>
  <line x1="100" y1="300" x2="500" y2="300" stroke="${s}" stroke-width="2" stroke-opacity=".5"/>
  <text x="300" y="370" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="22" fill="white" fill-opacity=".9">${body}</text>
  <rect x="140" y="640" width="320" height="64" rx="32" fill="white"/>
  <text x="300" y="681" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="22" fill="${p}" font-weight="bold">${cta}</text>
  ${phone ? `<text x="300" y="756" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="18" fill="${s}">📞 ${phone}</text>` : ''}
</svg>`;
  return { svg, type: 'svg', name: 'flyer', title: `إعلان: ${headline}` };
}

// ─── منشور سوشيال SVG ────────────────────────────
function genSocialPost({ headline = '', body = '', hashtags = '', platform = 'انستقرام مربع', color = '#4E73C2' }) {
  const p = color; const s = lighten(p);
  const tags = hashtags.split(',').map(h => `#${h.trim()}`).join('  ');
  const isStory = platform.includes('ستوري') || platform.includes('سناب');
  const [w, h] = isStory ? [630, 1120] : [630, 630];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${isStory ? 200 : 300}" height="${isStory ? 355 : 300}">
  <defs>
    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${p}"/>
      <stop offset="100%" style="stop-color:${darken(p)}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sg)"/>
  <rect x="24" y="24" width="${w-48}" height="${h-48}" rx="20" fill="none" stroke="white" stroke-opacity=".2" stroke-width="3"/>
  <circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)*0.38}" fill="white" fill-opacity=".04"/>
  <text x="${w/2}" y="${h*0.38}" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="${isStory?54:54}" fill="white" font-weight="bold">${headline}</text>
  <text x="${w/2}" y="${h*0.52}" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="${isStory?32:28}" fill="white" fill-opacity=".85">${body}</text>
  <text x="${w/2}" y="${h*0.88}" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="${isStory?24:20}" fill="${s}">${tags}</text>
  <text x="${w-40}" y="${h-20}" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="15" fill="white" fill-opacity=".35">جنان بيز</text>
</svg>`;
  return { svg, type: 'svg', name: 'social_post', title: `منشور: ${headline}` };
}

// ─── شهادة تقدير SVG ─────────────────────────────
function genCertificate({ recipient = '', reason = '', from_org = '', date_str = '', color = '#4E73C2' }) {
  const p = color; const s = lighten(p);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" width="500" height="350">
  <rect width="800" height="560" fill="#fefce8"/>
  <rect x="20" y="20" width="760" height="520" rx="0" fill="none" stroke="${p}" stroke-width="5"/>
  <rect x="30" y="30" width="740" height="500" rx="0" fill="none" stroke="${s}" stroke-width="1.5"/>
  <text x="400" y="100" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="36" fill="${p}" font-weight="bold">شهادة تقدير</text>
  <text x="400" y="145" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="15" fill="#666">تُقدِّم ${from_org}</text>
  <line x1="100" y1="165" x2="700" y2="165" stroke="${p}" stroke-width="1.5" stroke-opacity=".3"/>
  <text x="400" y="230" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="44" fill="${p}" font-weight="bold">${recipient}</text>
  <text x="400" y="290" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="17" fill="#444">تقديراً لـ</text>
  <text x="400" y="330" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="22" fill="${darken(p)}" font-weight="bold">${reason}</text>
  <line x1="100" y1="390" x2="700" y2="390" stroke="${p}" stroke-width="1" stroke-opacity=".2"/>
  <text x="700" y="450" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="14" fill="#888">${date_str}</text>
  <text x="100" y="450" font-family="Tajawal,Cairo,sans-serif" font-size="14" fill="#888">${from_org}</text>
  <rect x="320" y="460" width="160" height="2" fill="${p}"/>
  <text x="400" y="490" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="12" fill="#aaa">التوقيع</text>
</svg>`;
  return { svg, type: 'svg', name: 'certificate', title: `شهادة ${recipient}` };
}

// ─── منيو/قائمة SVG ───────────────────────────────
function genMenu({ biz_name = '', category1 = '', category2 = '', category3 = '', color = '#4E73C2' }) {
  const p = color; const s = lighten(p);
  const cats = [category1, category2, category3].filter(Boolean);
  const catBlocks = cats.map((cat, i) => {
    const [title, ...items] = cat.split(':');
    const itemsHTML = (items.join(':') || '').split('،').map(item =>
      `<text x="560" y="${240 + i * 240 + 60 + (items.indexOf(item.trim()) + 1) * 38}"
        text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="22" fill="#333">• ${item.trim()}</text>`
    ).join('');
    return `
      <rect x="40" y="${220 + i * 240}" width="520" height="210" rx="10" fill="${p}" fill-opacity=".06"/>
      <text x="540" y="${258 + i * 240}" text-anchor="end" font-family="Tajawal,Cairo,sans-serif" font-size="24" fill="${p}" font-weight="bold">${title?.trim()}</text>
      ${itemsHTML}`;
  }).join('');
  const totalH = 160 + cats.length * 250;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${totalH}" width="300" height="${totalH/2}">
  <rect width="600" height="${totalH}" fill="#fafafa"/>
  <rect x="10" y="10" width="580" height="${totalH-20}" rx="14" fill="none" stroke="${p}" stroke-width="3"/>
  <rect x="0" y="0" width="600" height="100" rx="14" fill="${p}"/>
  <rect x="0" y="60" width="600" height="40" fill="${p}"/>
  <text x="300" y="65" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="32" fill="white" font-weight="bold">${biz_name}</text>
  <text x="300" y="100" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-size="15" fill="${s}">قائمة الأصناف</text>
  ${catBlocks}
</svg>`;
  return { svg, type: 'svg', name: 'menu', title: `قائمة ${biz_name}` };
}

// ─── براند شخصي SVG ───────────────────────────────
function genPersonalBrand({ full_name = '', specialty = '', tagline = '', color = '#a855f7', shape = 'دائري' }) {
  return genLogo({ biz_name: full_name, slogan: tagline, color, logo_shape: shape, style: 'بسيط وعصري' });
}

// ─── ورق رسمي HTML ───────────────────────────────
function genLetterhead({ biz_name = '', sector = '', phone = '', email = '', address = '', color = '#4E73C2' }) {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Tajawal","Cairo",sans-serif;background:#fff}
.header{background:${color};color:#fff;padding:28px 40px;display:flex;justify-content:space-between;align-items:center}
.header .logo-text{font-size:28px;font-weight:800;letter-spacing:1px}
.header .sector{font-size:13px;opacity:.8;margin-top:4px}
.header .contacts{text-align:left;font-size:13px;line-height:2;opacity:.95}
.divider{height:6px;background:linear-gradient(90deg,${color},${lighten(color)})}
.content{min-height:600px;padding:50px 40px;font-size:15px;line-height:2;color:#333}
.footer{background:#f8f9fc;padding:18px 40px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#888;border-top:3px solid ${color}}
.watermark{position:fixed;bottom:200px;right:200px;font-size:80px;color:${color};opacity:.04;transform:rotate(-30deg);font-family:Tajawal;font-weight:900;pointer-events:none}
</style></head><body>
<div class="header">
  <div><div class="logo-text">${biz_name}</div><div class="sector">${sector}</div></div>
  <div class="contacts">📞 ${phone}<br>✉️ ${email}<br>📍 ${address}</div>
</div>
<div class="divider"></div>
<div class="content">
  <p>بسم الله الرحمن الرحيم</p><br>
  <p>..........................................................................................................................</p><br><br>
  <p>..........................................................................................................................</p>
</div>
<div class="watermark">${biz_name[0] || 'م'}</div>
<div class="footer">
  <span>${biz_name} © ${new Date().getFullYear()}</span>
  <span>${address}</span>
  <span>${phone}</span>
</div>
</body></html>`;
}

// ─── خطاب رسمي HTML ──────────────────────────────
function genOfficialLetter({ letter_type = 'خطاب رسمي', from_name = '', to_name = '', subject = '', body = '', city = 'الرياض' }) {
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
body{font-family:"Tajawal","Cairo",sans-serif;max-width:780px;margin:40px auto;padding:40px;background:#fff;color:#222;font-size:15px;line-height:2.2}
.top{display:flex;justify-content:space-between;margin-bottom:30px;font-size:13px;color:#666}
.title{text-align:center;font-size:20px;font-weight:800;color:#4E73C2;margin:30px 0;text-decoration:underline}
.subject{font-weight:700;margin:20px 0 10px}
.from-to{margin:20px 0;padding:12px 18px;background:#f8f9fc;border-right:4px solid #4E73C2;border-radius:0 8px 8px 0}
.body-text{text-indent:40px;text-align:justify}
.footer-sign{margin-top:60px;display:flex;justify-content:space-between}
.sign-box{text-align:center;width:200px;border-top:1px solid #ccc;padding-top:8px;font-size:13px;color:#666}
</style></head><body>
<div class="top"><span>من: ${from_name}</span><span>${city}، ${today}</span></div>
<div class="title">${letter_type}</div>
<div class="from-to">
  <div>السادة / ${to_name} — المحترمين</div>
  <div>تحية طيبة وبعد،</div>
</div>
<div class="subject">الموضوع: ${subject}</div>
<div class="body-text">${(body || '').replace(/\n/g, '<br>')}</div>
<br><p>وتفضلوا بقبول فائق الاحترام والتقدير،</p>
<div class="footer-sign">
  <div class="sign-box">اسم المُرسِل<br>${from_name}</div>
  <div class="sign-box">التوقيع</div>
</div>
</body></html>`;
}

// ─── سيرة ذاتية HTML ─────────────────────────────
function genCV({ full_name = '', job_target = '', phone = '', email = '', city = '', summary = '', education = '', experience = '', skills = '', color = '#4E73C2' }) {
  const skillsList = skills.split(',').map(s => s.trim()).filter(Boolean);
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Tajawal","Cairo",sans-serif;background:#fff;color:#222}
.sidebar{position:fixed;top:0;right:0;width:220px;height:100%;background:${color};padding:32px 18px;color:#fff}
.sidebar h2{font-size:20px;margin-bottom:8px;line-height:1.4}
.sidebar .title{font-size:12px;opacity:.8;margin-bottom:24px}
.sidebar .contact-item{font-size:12px;margin-bottom:10px;display:flex;gap:8px;align-items:center}
.sidebar .section-title{font-size:13px;font-weight:700;margin:20px 0 10px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.3)}
.skill-tag{background:rgba(255,255,255,.18);border-radius:12px;padding:3px 10px;font-size:11px;display:inline-block;margin:2px}
.main{margin-right:240px;padding:32px}
.section{margin-bottom:28px}
.section-head{font-size:16px;font-weight:800;color:${color};padding-bottom:6px;border-bottom:2px solid ${color};margin-bottom:12px}
.item-title{font-weight:700;font-size:14px}
.item-sub{font-size:12px;color:#888;margin-bottom:4px}
.item-body{font-size:13px;line-height:1.8;color:#444}
</style></head><body>
<div class="sidebar">
  <h2>${full_name}</h2>
  <div class="title">${job_target}</div>
  <div class="section-title">التواصل</div>
  <div class="contact-item">📞 ${phone}</div>
  <div class="contact-item">✉️ ${email}</div>
  <div class="contact-item">📍 ${city}</div>
  <div class="section-title">المهارات</div>
  ${skillsList.map(sk => `<span class="skill-tag">${sk}</span>`).join('')}
</div>
<div class="main">
  <div class="section">
    <div class="section-head">الملخص المهني</div>
    <div class="item-body">${summary}</div>
  </div>
  <div class="section">
    <div class="section-head">الخبرات العملية</div>
    <div class="item-title">${experience}</div>
  </div>
  <div class="section">
    <div class="section-head">المؤهل الأكاديمي</div>
    <div class="item-body">${education}</div>
  </div>
</div>
</body></html>`;
}

// ─── خطاب تقديم HTML ─────────────────────────────
function genCoverLetter({ full_name = '', job_target = '', company = '', why = '', phone = '', email = '' }) {
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
body{font-family:"Tajawal","Cairo",sans-serif;max-width:720px;margin:50px auto;padding:40px;background:#fff;font-size:15px;line-height:2.2;color:#222}
.date{text-align:left;color:#888;font-size:13px;margin-bottom:30px}
h2{color:#4E73C2;margin-bottom:24px}
p{text-indent:40px;text-align:justify;margin-bottom:16px}
.sig{margin-top:50px}
</style></head><body>
<div class="date">${today}</div>
<h2>إلى: ${company} — قسم الموارد البشرية</h2>
<p>أتقدم بطلبي للانضمام إلى فريقكم المتميز في وظيفة <strong>${job_target}</strong>، ويسعدني تقديم نفسي بإيجاز.</p>
<p>${why}</p>
<p>يُرفق مع هذا الخطاب سيرتي الذاتية للاطلاع على مؤهلاتي وخبراتي بالتفصيل، وأرجو أن تجدوا فيّ ما يلبي متطلبات الوظيفة.</p>
<p>وأنا رهن الإشارة لأي استفسار أو مقابلة عمل في أي وقت يناسبكم.</p>
<div class="sig">
  <p>مع خالص التحية والتقدير،</p>
  <strong>${full_name}</strong><br>
  <span style="font-size:13px;color:#888">📞 ${phone} | ✉️ ${email}</span>
</div>
</body></html>`;
}

// ─── هيكل بحث أكاديمي HTML ───────────────────────
function genResearch({ title = '', author = '', university = '', abstract = '', sections = '4 فصول' }) {
  const numSections = parseInt(sections) || 4;
  const sectionNames = ['الإطار النظري والأدبيات السابقة','منهجية البحث','النتائج والتحليل','المناقشة والتوصيات','الخلاصة','الملاحق'];
  const chaptersHTML = Array.from({ length: numSections }, (_, i) => `
    <div style="margin-bottom:30px">
      <h3 style="color:#4E73C2;margin-bottom:12px">الفصل ${i + 2}: ${sectionNames[i] || 'فصل ' + (i+2)}</h3>
      <p style="color:#999;font-style:italic">[ اكتب محتوى هذا الفصل هنا... ]</p>
      <p>.....................................................................</p><p>.....................................................................</p>
    </div>`).join('');
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
body{font-family:"Tajawal","Cairo",sans-serif;max-width:800px;margin:50px auto;padding:50px;background:#fff;font-size:15px;line-height:2.2;color:#222}
h1{text-align:center;font-size:24px;color:#4E73C2;margin:30px 0 12px}
.meta{text-align:center;color:#888;font-size:13px;margin-bottom:40px}
.abstract{background:#f8f9fc;border-right:4px solid #4E73C2;padding:18px 22px;margin-bottom:40px;border-radius:0 8px 8px 0}
h2{color:#4E73C2;border-bottom:2px solid #e0e7ef;padding-bottom:8px;margin:30px 0 16px}
h3{color:#374151;margin:20px 0 10px}
</style></head><body>
<h1>${title}</h1>
<div class="meta">${author}${university ? ' — ' + university : ''}<br>${new Date().getFullYear()}</div>
<h2>الملخص</h2>
<div class="abstract">${abstract}</div>
<h2>الفصل الأول: المقدمة</h2>
<p>يُعدّ هذا البحث محاولةً لدراسة ${title} من خلال مناهج علمية رصينة...</p>
<p>.....................................................................</p>
${chaptersHTML}
<h2>المراجع والمصادر</h2>
<p>[ يُرجى إضافة المراجع وفق نظام APA أو Harvard ]</p>
</body></html>`;
}

// ─── عرض تقديمي HTML ─────────────────────────────
function genPresentation({ title = '', presenter = '', org = '', slides = '10 شرائح', topic_desc = '', color = '#4E73C2' }) {
  const num = parseInt(slides) || 10;
  const slideTitles = ['المقدمة','نظرة عامة','التحليل','البيانات والأرقام','الفرص والتحديات','المقترحات','التوصيات','خطة التنفيذ','الميزانية','الخلاصة والإغلاق'];
  const slidesHTML = Array.from({ length: num }, (_, i) => `
    <div style="page-break-after:always;min-height:360px;background:${i%2===0?color+'11':'#f8f9fc'};border-radius:16px;padding:40px;margin-bottom:20px;position:relative">
      <div style="position:absolute;top:16px;right:16px;background:${color};color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:800">${i+1}</div>
      <h2 style="color:${color};font-size:22px;margin-bottom:20px">${slideTitles[i] || 'شريحة ' + (i+1)}</h2>
      <p style="color:#999;font-style:italic">[ أضف محتوى هذه الشريحة هنا ]</p>
    </div>`).join('');
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
body{font-family:"Tajawal","Cairo",sans-serif;max-width:900px;margin:30px auto;padding:30px;background:#fff;font-size:15px}
.cover{background:${color};color:#fff;border-radius:20px;padding:80px 60px;text-align:center;margin-bottom:30px}
.cover h1{font-size:36px;margin-bottom:16px}
.cover p{font-size:14px;opacity:.8}
</style></head><body>
<div class="cover">
  <h1>${title}</h1>
  <p>${presenter}${org ? ' — ' + org : ''}</p>
  <p style="margin-top:16px;font-size:12px">${new Date().toLocaleDateString('ar-SA')}</p>
</div>
${slidesHTML}
</body></html>`;
}

// ─── بروفايل شركة HTML ────────────────────────────
function genCompanyProfile({ biz_name = '', vision = '', services = '', team_size = '', contact = '', color = '#4E73C2' }) {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Tajawal","Cairo",sans-serif;background:#fff;color:#222}
.cover{background:${color};color:#fff;padding:80px 60px;text-align:center}
.cover h1{font-size:48px;font-weight:900;margin-bottom:16px}
.cover p{font-size:16px;opacity:.85}
.section{padding:60px;border-bottom:1px solid #eee}
.section h2{font-size:24px;color:${color};margin-bottom:20px;padding-bottom:10px;border-bottom:3px solid ${color}}
.section p{font-size:15px;line-height:2;color:#444}
.services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-top:20px}
.service-card{background:${color}11;border-radius:12px;padding:24px;border-right:4px solid ${color}}
.service-card p{font-size:14px;color:#555}
.stats{display:flex;gap:30px;flex-wrap:wrap;margin-top:24px}
.stat{text-align:center;background:${color};color:#fff;border-radius:12px;padding:24px 32px}
.stat .num{font-size:32px;font-weight:900}
.stat .lbl{font-size:13px;opacity:.85}
.footer-bar{background:${color};color:#fff;padding:24px 60px;display:flex;justify-content:space-between;align-items:center;font-size:13px}
</style></head><body>
<div class="cover">
  <h1>${biz_name}</h1>
  <p>${vision}</p>
</div>
<div class="section">
  <h2>عن الشركة</h2>
  <p>${vision}</p>
  <div class="stats">
    <div class="stat"><div class="num">🏆</div><div class="lbl">رائدون في مجالنا</div></div>
    <div class="stat"><div class="num">${team_size.replace(/[^0-9]/g,'') || '+'}</div><div class="lbl">${team_size || 'فريق متميز'}</div></div>
    <div class="stat"><div class="num">💎</div><div class="lbl">جودة بلا تنازل</div></div>
  </div>
</div>
<div class="section">
  <h2>خدماتنا ومنتجاتنا</h2>
  <div class="services-grid">
    ${services.split(/[،,\n]/).filter(Boolean).map(s => `<div class="service-card"><p>${s.trim()}</p></div>`).join('')}
  </div>
</div>
<div class="footer-bar">
  <span><strong>${biz_name}</strong></span>
  <span>${contact}</span>
</div>
</body></html>`;
}

// ─── حزمة هوية بصرية HTML (متكاملة) ──────────────
function genVisualIdentityPack(data) {
  const { biz_name = '', color = '#4E73C2', color2 = '#f4a623' } = data;
  const logoResult = genLogo({ ...data });
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<style>
body{font-family:"Tajawal","Cairo",sans-serif;background:#f8f9fc;padding:40px;color:#222}
h1{color:${color};text-align:center;margin-bottom:8px}
.subtitle{text-align:center;color:#888;margin-bottom:40px}
.pack-section{background:#fff;border-radius:16px;padding:32px;margin-bottom:24px;box-shadow:0 2px 12px #0001}
.pack-section h2{color:${color};margin-bottom:20px;border-bottom:2px solid ${color};padding-bottom:8px}
.color-swatches{display:flex;gap:16px;margin-top:12px}
.swatch{width:80px;height:80px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;text-align:center;padding:4px}
</style></head><body>
<h1>دليل الهوية البصرية</h1>
<div class="subtitle">${biz_name}</div>
<div class="pack-section">
  <h2>🖼 الشعار</h2>
  <div>${logoResult.svg}</div>
</div>
<div class="pack-section">
  <h2>🎨 الألوان الرسمية</h2>
  <div class="color-swatches">
    <div class="swatch" style="background:${color}">اللون الرئيسي<br>${color}</div>
    <div class="swatch" style="background:${color2}">اللون الثانوي<br>${color2}</div>
    <div class="swatch" style="background:#ffffff;color:#444;border:1px solid #eee">الأبيض<br>#FFFFFF</div>
    <div class="swatch" style="background:#1a1a2e">الأسود الفاتح<br>#1a1a2e</div>
  </div>
</div>
<div class="pack-section">
  <h2>🔤 الخطوط الرسمية</h2>
  <p style="font-size:28px;font-family:Tajawal;font-weight:800;color:${color}">Tajawal — خط للعناوين</p>
  <p style="font-size:18px;font-family:Cairo;color:#555">Cairo — خط للنصوص والتفاصيل</p>
</div>
<div class="pack-section">
  <h2>📐 مبادئ التصميم</h2>
  <ul style="padding-right:20px;line-height:2.4;color:#555">
    <li>يُستخدم اللون الرئيسي للعناوين والأزرار والعناصر البارزة</li>
    <li>اللون الثانوي للتفاصيل والتمييز والإيقونات</li>
    <li>الفراغات تحترم الـ 8px grid لتناسق بصري</li>
    <li>الحد الأدنى لحجم الشعار: 32px</li>
  </ul>
</div>
</body></html>`;
}

// ══════════════════════════════════════════════════
//   عرض النتيجة + الاقتراحات
// ══════════════════════════════════════════════════

function renderResultPage(result) {
  const app = document.getElementById('dc-app');
  app.innerHTML = '';
  const svc = DESIGN_SERVICES[dcService];

  const wrap = el('div', 'dc-result-wrap');
  const previewId = 'dc-preview-' + Date.now();

  let previewHTML = '';
  if (result.type === 'svg') {
    previewHTML = `<div class="dc-preview-svg">${result.svg}</div>`;
  } else {
    previewHTML = `<div class="dc-preview-html">
      <iframe id="${previewId}" style="width:100%;height:480px;border:none;border-radius:10px"></iframe>
    </div>`;
  }

  // اقتراحات الخطوة التالية
  const suggestions = (svc.suggestAfter || [])
    .filter(k => DESIGN_SERVICES[k] && DESIGN_SERVICES[k].for.includes(dcUserType) && !dcCompleted.includes(k))
    .slice(0, 3);

  const suggestHTML = suggestions.length > 0 ? `
    <div class="dc-suggest-section">
      <div class="dc-suggest-title">💡 لماذا لا تُكمل هويتك؟ جرّب:</div>
      <div class="dc-suggest-grid">
        ${suggestions.map(k => {
          const s = DESIGN_SERVICES[k];
          return `<button class="dc-suggest-btn" onclick="startService('${k}')">
            <span>${s.icon}</span> ${s.label}
            <span class="dc-svc-badge ${s.free ? 'free' : 'premium'}">${s.free ? '🆓' : '⭐'}</span>
          </button>`;
        }).join('')}
      </div>
    </div>` : '';

  wrap.innerHTML = `
    <div class="dc-breadcrumb">
      <button onclick="renderServiceGridPage()" class="dc-back-btn">← الخدمات</button>
      <span>${svc.icon} ${result.title || svc.label}</span>
    </div>
    <div class="dc-result-header">
      <div class="dc-result-title">✅ تم توليد التصميم</div>
      <div class="dc-result-subtitle">${result.title}</div>
    </div>
    ${previewHTML}
    <div class="dc-download-actions">
      ${result.type === 'svg'
        ? `<button class="dc-btn-dl" onclick="downloadSVGFile(this)" data-svg="${encodeURIComponent(result.svg)}" data-name="${result.name}">⬇️ تحميل SVG</button>
           <button class="dc-btn-dl secondary" onclick="downloadPNG('${previewId}',this)" data-svg="${encodeURIComponent(result.svg)}" data-name="${result.name}">🖼 تحميل PNG</button>`
        : `<button class="dc-btn-dl" onclick="downloadHTMLFile(document.getElementById('${previewId}').srcdoc,'${result.name}')">⬇️ تحميل HTML</button>`}
      <button class="dc-btn-dl secondary" onclick="startService('${dcService}')">🔄 تعديل</button>
    </div>
    ${suggestHTML}`;

  app.appendChild(wrap);

  // تحميل HTML في الـ iframe
  if (result.type === 'html') {
    requestAnimationFrame(() => {
      const iframe = document.getElementById(previewId);
      if (iframe) iframe.srcdoc = result.html;
    });
  }
}

// ══════════════════════════════════════════════════
//   دوال التحميل
// ══════════════════════════════════════════════════

function downloadSVGFile(btn) {
  const svgStr = decodeURIComponent(btn.dataset.svg);
  const name   = btn.dataset.name || 'design';
  const blob   = new Blob([svgStr], { type: 'image/svg+xml' });
  const a      = document.createElement('a');
  a.href       = URL.createObjectURL(blob);
  a.download   = `jenan-${name}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadPNG(iframeId, btn) {
  const svgStr  = decodeURIComponent(btn.dataset.svg);
  const name    = btn.dataset.name || 'design';
  const blob    = new Blob([svgStr], { type: 'image/svg+xml' });
  const url     = URL.createObjectURL(blob);
  const img     = new Image();
  img.onload    = () => {
    const canvas   = document.createElement('canvas');
    canvas.width   = img.naturalWidth  || 600;
    canvas.height  = img.naturalHeight || 600;
    const ctx      = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(b => {
      const a  = document.createElement('a');
      a.href   = URL.createObjectURL(b);
      a.download = `jenan-${name}.png`;
      a.click(); URL.revokeObjectURL(url);
    });
  };
  img.src = url;
}

function downloadHTMLFile(html, name) {
  if (!html) { alert('المعاينة لم تُحمَّل بعد، انتظر لحظة ثم حاول.'); return; }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `jenan-${name}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════════
//   دوال مساعدة
// ══════════════════════════════════════════════════

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function arabicInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('') || 'م';
}

function lighten(hex) {
  try {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = Math.min(255, parseInt(c.slice(0,2),16) + 60);
    const g = Math.min(255, parseInt(c.slice(2,4),16) + 60);
    const b = Math.min(255, parseInt(c.slice(4,6),16) + 60);
    return `rgb(${r},${g},${b})`;
  } catch { return '#a0b0d0'; }
}

function darken(hex) {
  try {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = Math.max(0, parseInt(c.slice(0,2),16) - 40);
    const g = Math.max(0, parseInt(c.slice(2,4),16) - 40);
    const b = Math.max(0, parseInt(c.slice(4,6),16) - 40);
    return `rgb(${r},${g},${b})`;
  } catch { return '#2a3a6a'; }
}

// ─── تهيئة تلقائية ────────────────────────────────
window.addEventListener('DOMContentLoaded', initDesignCopilot);
