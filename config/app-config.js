/**
 * جنان بيز - ملف الإعدادات المركزي
 * Central Configuration — Jenan Biz 2026
 * تعديل أي إعدادات من هنا دون المساس بالكود
 */

const JENAN_CONFIG = {
  app: {
    name: "جنان بيز",
    nameEn: "Jenan Biz",
    version: "2.0.0",
    domain: "https://rawad.jenan.biz", // غير هذا عند ربط الدومين
    logo: "/assets/images/logo.svg",
    supportEmail: "support@jenan.biz",
    whatsapp: "+966500000000",
  },

  // ---- قائمة التنقل الرئيسية (nav يُبنى تلقائياً منها) ----
  // لإضافة قسم جديد: أضف سطراً واحداً هنا فقط — يظهر في كل الصفحات
  nav: {
    links: [
      { label: "الرئيسية",      href: "/index.html",           icon: null },
      { label: "خدماتنا",       href: "/pages/services.html",  icon: null },
      { label: "مركز المعرفة",  href: "/pages/knowledge.html", icon: null },
      { label: "اتصل بنا",      href: "/pages/contact.html",   icon: null },
      { label: "لوحة التحكم",   href: "/dashboard.html",       icon: null },
    ],
    // الأقسام الأربعة — تظهر في قائمة "أقسامنا" المنسدلة
    sections: [
      { label: "دراسات الجدوى وتحليل المشاريع", href: "/pages/feasibility.html", icon: "fa-chart-pie"     },
      { label: "أكاديمية جنان — الدورات",        href: "/pages/courses.html",     icon: "fa-graduation-cap"},
      { label: "الأبحاث والدراسات والندوات",     href: "/pages/research.html",    icon: "fa-microscope"    },
      { label: "متجر البرامج",                   href: "/pages/software.html",    icon: "fa-box-open"      },
      // ← أضف قسماً جديداً هنا بسطر واحد فقط
    ],
  },

  // ---- طبقة الأداء والطوابير ----
  queue: {
    maxConcurrent: 10,       // أقصى عمليات متزامنة
    retryAttempts: 3,
    retryDelay: 1500,        // ms
    requestTimeout: 30000,   // 30 ثانية
    rateLimitPerUser: 60,    // طلب/دقيقة
  },

  // ---- المصادقة والهوية ----
  auth: {
    tokenExpiry: 86400,      // 24 ساعة بالثواني
    refreshWindow: 3600,     // تجديد قبل ساعة من الانتهاء
    sessionKey: "jenan_session",
    storage: "localStorage", // localStorage | sessionStorage
    providers: ["email", "google"], // مزودو الدخول المفعّلون
  },

  // ---- محرك النقاط والولاء ----
  loyalty: {
    currency: "نقطة",
    currencyEn: "point",
    actions: {
      /* ── كسب النقاط ── */
      register_welcome:   { points: 50,  label: "مكافأة التسجيل الترحيبية" },
      read_article:       { points: 5,   label: "قراءة مقال" },
      complete_lesson:    { points: 20,  label: "إتمام درس في الأكاديمية" },
      pass_quiz:          { points: 30,  label: "اجتياز اختبار" },
      use_analyzer:       { points: 10,  label: "استخدام المحلل (أول مرة)" },
      generate_design:    { points: 10,  label: "استخدام مصمم الشعارات (أول مرة)" },
      generate_study:     { points: 25,  label: "توليد دراسة جدوى" },
      social_share:       { points: 15,  label: "مشاركة المحتوى على السوشيال" },
      exec_summary_use:   { points: 10,  label: "استخدام ملخص المشروع السريع" },
      gov_compliance_use: { points: 10,  label: "استخدام مدقق الامتثال الحكومي" },
      funding_radar_use:  { points: 10,  label: "استخدام رادار التمويل" },
      referral_signup:    { points: 100, label: "دعوة عضو جديد (للمُحيل)" },
      referral_purchase:  { points: 200, label: "نقاط ذهبية — شراء المُحال لخدمة" },  // نقاط ذهبية قابلة للتحويل
      daily_login:        { points: 3,   label: "دخول يومي" },
      profile_complete:   { points: 50,  label: "إكمال الملف الشخصي" },
    },
    redemption: {
      cash_rate:              0.01,   // 1 ريال لكل 100 نقطة
      min_cash_redeem:        5000,   // حد أدنى لتحويل النقاط لمبلغ مالي
      open_feasibility_study: 200,    // 200 نقطة لفتح دراسة جدوى مفصلة
      open_full_identity:     200,    // 200 نقطة لفتح تصميم هوية كاملة
      silver_entrepreneur:    1000,   // 1000 نقطة = رتبة "رائد أعمال فضي" + خصم 10%
      upgrade_pro:            3000,
      upgrade_enterprise:     8000,
    },
    tiers: [
      { name: "برونزي",             minPoints: 0,     color: "#cd7f32", badge: "🥉", discount: 0 },
      { name: "فضي",                minPoints: 500,   color: "#c0c0c0", badge: "🥈", discount: 0 },
      { name: "رائد أعمال فضي",    minPoints: 1000,  color: "#94a3b8", badge: "🌙", discount: 10 },  // خصم 10%
      { name: "ذهبي",               minPoints: 2000,  color: "#ffd700", badge: "🥇", discount: 15 },
      { name: "بلاتيني",            minPoints: 5000,  color: "#e5e4e2", badge: "💎", discount: 20 },
      { name: "ماسي",               minPoints: 15000, color: "#b9f2ff", badge: "💠", discount: 30 },
    ],
  },

  // ---- نظام الإحالات ----
  referral: {
    baseUrl: "https://rawad.jenan.biz/join?ref=",
    cookieDays: 30,
    bonusForReferrer:      100,  // نقاط للمُحيل عند تسجيل شخص عبر رابطه
    bonusForReferred:       25,  // نقاط للمُحال عند التسجيل (إضافة على 50 الترحيبية)
    goldenBonusPurchase:   200,  // نقاط ذهبية لو المُحال أتم شراء أو دورة
    maxReferralsPerUser:  1000,
  },

  // ---- خدمات الجذب الفوري (Hook Services) ----
  hookServices: {
    execSummary: {
      freePreviewWords: 50,      // يُعرض مجاناً
      fullWordCount:    150,     // كامل الملخص بعد التسجيل
      pointsAwarded:    10,
    },
    govCompliance: {
      platforms: ["قوى", "مدد"],
      pointsAwarded: 10,
      academyCourseRedirect: "gov_platforms", // مسار الأكاديمية عند وجود نواقص
    },
    fundingRadar: {
      pointsAwarded: 10,
      // نسب التمويل المبدئي بحسب حجم رأس المال
      fundingMultipliers: [
        { maxCapital: 50000,   multiplier: 0.5,  program: "صغار المنشآت — كفالة" },
        { maxCapital: 200000,  multiplier: 1.0,  program: "منشآت — برامج التمويل الأساسية" },
        { maxCapital: 1000000, multiplier: 2.0,  program: "منشآت — برنامج النمو" },
        { maxCapital: Infinity,multiplier: 3.0,  program: "مساندة — برنامج التوسع" },
      ],
    },
  },

  // ---- الذكاء الاصطناعي والـ API ----
  api: {
    baseUrl: "/api",                         // يتغير حسب بيئة الاستضافة
    openaiEndpoint: "/api/openai-proxy",     // proxy للـ keys السرية
    timeout: 45000,
    headers: { "Content-Type": "application/json" },
  },

  // ---- أكاديمية جنان ----
  academy: {
    // المسارات التعليمية الكاملة — 8 تخصصات رئيسية
    tracks: [
      // ── تخصصات أصيلة من المنصة ──
      { id: "hr",           name: "الموارد البشرية",         icon: "👥", lessons: 12, category: "management",     color: "#6366f1", level: "intermediate" },
      { id: "accounting",   name: "المحاسبة والمالية",       icon: "🧾", lessons: 10, category: "finance",        color: "#0ea5e9", level: "intermediate" },
      { id: "zakat",        name: "الزكاة والضرائب",         icon: "🏛️", lessons: 8,  category: "legal",          color: "#8b5cf6", level: "advanced" },
      { id: "sales",        name: "المبيعات والتسويق",       icon: "📈", lessons: 15, category: "marketing",      color: "#ec4899", level: "beginner" },
      { id: "management",   name: "إدارة الفرق والمشاريع",   icon: "🎯", lessons: 10, category: "management",     color: "#f97316", level: "intermediate" },
      { id: "gov_platforms",name: "المنصات الحكومية",         icon: "🏢", lessons: 6,  category: "legal",          color: "#14b8a6", level: "beginner" },
      // ── مسارات الأكاديمية الموسّعة ──
      { id: "finance_basic",name: "أساسيات التمويل والاستثمار",icon: "💰", lessons: 10, category: "finance",        color: "#10b981", level: "beginner" },
      { id: "startup",      name: "تأسيس وإطلاق المشاريع",    icon: "🚀", lessons: 12, category: "entrepreneurship",color: "#3b82f6", level: "beginner" },
      { id: "markets",      name: "الأسواق المالية والبورصة", icon: "📊", lessons: 10, category: "markets",        color: "#f59e0b", level: "intermediate" },
      { id: "ecommerce",    name: "التجارة الإلكترونية",      icon: "🛒", lessons: 12, category: "ecommerce",      color: "#6366f1", level: "beginner" },
      { id: "digital_mkt",  name: "التسويق الرقمي",           icon: "📣", lessons: 15, category: "marketing",      color: "#ec4899", level: "beginner" },
      { id: "cashflow",     name: "إدارة التدفق النقدي",      icon: "💸", lessons: 8,  category: "finance",        color: "#0ea5e9", level: "intermediate" },
      { id: "branding",     name: "بناء العلامة التجارية",    icon: "✨", lessons: 10, category: "marketing",      color: "#d946ef", level: "intermediate" },
      { id: "legal_biz",    name: "القانون التجاري للمبتدئين", icon: "⚖️", lessons: 8,  category: "legal",          color: "#8b5cf6", level: "beginner" },
      { id: "leadership",   name: "القيادة وخطوات النجاح",    icon: "🏆", lessons: 10, category: "success",        color: "#f97316", level: "advanced" },
      { id: "seo_content",  name: "تحسين المحتوى والـ SEO",   icon: "🔍", lessons: 8,  category: "marketing",      color: "#14b8a6", level: "intermediate" },
      { id: "logistics",    name: "اللوجستيات والشحن",        icon: "📦", lessons: 6,  category: "ecommerce",      color: "#f59e0b", level: "beginner" },
      { id: "data_analysis",name: "تحليل البيانات للأعمال",   icon: "🔢", lessons: 8,  category: "markets",        color: "#6366f1", level: "advanced" },
    ],
    // تصنيفات الأكاديمية
    categories: [
      { id: "all",            label: "الكل",                  icon: "🌟" },
      { id: "finance",        label: "المال والاستثمار",      icon: "💰" },
      { id: "entrepreneurship",label: "ريادة الأعمال",        icon: "🚀" },
      { id: "markets",        label: "الأسواق المالية",       icon: "📊" },
      { id: "ecommerce",      label: "التجارة الإلكترونية",   icon: "🛒" },
      { id: "marketing",      label: "التسويق الرقمي",        icon: "📣" },
      { id: "management",     label: "إدارة الأعمال",         icon: "📋" },
      { id: "legal",          label: "القانون والامتثال",     icon: "⚖️" },
      { id: "success",        label: "خطوات النجاح",          icon: "✨" },
    ],
    levels: [
      { id: "beginner",     label: "مبتدئ",   color: "#10b981" },
      { id: "intermediate", label: "متوسط",   color: "#f59e0b" },
      { id: "advanced",     label: "متقدم",   color: "#ef4444" },
    ],
    certificate: {
      issuer: "أكاديمية جنان",
      qrBaseUrl: "https://rawad.jenan.biz/verify/",
      validityYears: 3,
    },
    // نقاط الأكاديمية لكل فعالية نشر
    socialAutoPost: {
      newContentTrigger: true,        // نشر تلقائي عند إضافة محتوى جديد
      promoIfSilentDays: 7,           // نشر ترويجي إذا لم يكن هناك محتوى جديد خلال هذه الأيام
      platforms: ["twitter", "whatsapp", "instagram", "tiktok"],
    },
  },

  // ---- متجر البرامج الجاهزة ----
  software: {
    whatsapp: "https://wa.me/966567711999",
    products: [
      { id: "accounting", name: "برنامج المحاسبة الذكي",            category: "finance",    status: "available",   minPrice: 150 },
      { id: "pos",        name: "نظام المبيعات ونقاط البيع",          category: "sales",      status: "available",   minPrice: 120 },
      { id: "hr",         name: "برنامج الموارد البشرية والرواتب",    category: "hr",         status: "available",   minPrice: 200 },
      { id: "inventory",  name: "برنامج المخازن والمخزون",            category: "operations", status: "available",   minPrice: 100 },
      { id: "einvoice",   name: "نظام الفاتورة الإلكترونية ZATCA",   category: "finance",    status: "available",   minPrice: 80  },
      { id: "crm",        name: "برنامج CRM إدارة العملاء",           category: "sales",      status: "coming_soon", minPrice: 180 },
      { id: "restaurant", name: "نظام إدارة المطاعم",                 category: "operations", status: "coming_soon", minPrice: 199 },
      { id: "projects",   name: "برنامج إدارة المشاريع",              category: "management", status: "coming_soon", minPrice: 99  },
    ],
    bundleDiscount: 0.20,        // خصم 20% عند الاشتراك في برنامجين أو أكثر
    trialDays: 14,               // فترة تجريبية مجانية
    activationHours: 24,         // تفعيل خلال 24 ساعة
    supportChannel: "whatsapp",  // قناة الدعم الرئيسية
    loyaltyAction: { points: 50, label: "اشتراك في برنامج جنان" },
  },

  // ---- استوديو التصميم ----
  design: {
    fonts: ["Tajawal", "Cairo", "IBM Plex Arabic"],
    defaultPrimary: "#4E73C2",    /* أزرق BIZ */
    defaultSecondary: "#1a1a2e",  /* أسود Jenan */
    templates: ["logo", "letterhead", "business_card", "social_post"],
  },

  // ---- النشر الاجتماعي التلقائي ----
  social: {
    // حسابات جنان بيز الرسمية
    handles: {
      whatsapp:  "https://wa.me/966567711999",
      twitter:   "https://x.com/jenanstar11",
      instagram: "https://instagram.com/jenanstar11",
      tiktok:    "https://tiktok.com/@jenan.star11",
    },
    // إعدادات النشر
    autoPublish:    true,            // مفعّل — يضيف المحتوى الجديد تلقائياً للكيو
    webhookUrl:     "/api/social/publish",
    composeUrl:     "/api/social/compose-post",
    // قواعد النشر التلقائي
    promoIfSilentDays: 7,            // نشر ترويجي إذا مرت 7 أيام بدون محتوى جديد
    storageKey:     "jenan_social_queue",
    lastPublishKey: "jenan_last_publish",
    // قوالب الترويج لكل خدمة
    promoTemplates: [
      { service: "exec-summary",    text: "⚡ احصل على ملخص تنفيذي لمشروعك في 30 ثانية — مجاناً على جنان بيز!",                    url: "/pages/hook-services.html#sec-exec",    hashtags: ["جنان_بيز", "ريادة_أعمال", "مشاريع"] },
      { service: "gov-compliance",  text: "🏛️ تحقق من امتثال منشأتك للأنظمة الحكومية بضغطة واحدة — جرّب الآن على جنان بيز!",       url: "/pages/hook-services.html#sec-gov",     hashtags: ["جنان_بيز", "امتثال", "قوى", "مدد"] },
      { service: "funding-radar",   text: "📡 اعرف قدرتك التمويلية المبدئية مجاناً — رادار التمويل على جنان بيز!",                  url: "/pages/hook-services.html#sec-funding", hashtags: ["جنان_بيز", "تمويل", "منشآت"] },
      { service: "academy",         text: "🎓 تعلّم أساسيات المال والأعمال والتجارة الإلكترونية — أكاديمية جنان بيز مجاناً!",        url: "/pages/knowledge.html",                hashtags: ["جنان_بيز", "تعلم", "ريادة_أعمال", "أكاديمية"] },
      { service: "design",          text: "🎨 صمّم هوية منشأتك كاملة — شعار وبطاقة وختم وأكثر — مجاناً على جنان بيز!",             url: "/pages/design.html",                   hashtags: ["جنان_بيز", "تصميم", "هوية_تجارية"] },
      { service: "projects",        text: "📋 حلل مشروعك وأنشئ دراسة جدوى كاملة بمساعدة الذكاء الاصطناعي — جنان بيز!",           url: "/pages/project.html",                  hashtags: ["جنان_بيز", "دراسة_جدوى", "مشاريع"] },
      { service: "referral",        text: "🤝 ادعُ أصحابك واكسب نقاطاً وخصومات — برنامج الإحالات على جنان بيز!",                 url: "/pages/hook-services.html#sec-referral", hashtags: ["جنان_بيز", "نقاط", "إحالات"] },
      { service: "software",         text: "💻 برامج محاسبة ومبيعات وموارد بشرية متوافقة مع ZATCA — جاهزة وبتبدأ خلال 24 ساعة على جنان بيز!", url: "/pages/software.html",              hashtags: ["جنان_بيز", "برامج", "محاسبة", "ZATCA"] },
    ],
    // إعدادات كل منصة
    platformConfig: {
      twitter:   { maxChars: 280,  hashtagInText: true,  urlShorten: true },
      whatsapp:  { maxChars: 1000, hashtagInText: false, urlShorten: false },
      instagram: { maxChars: 2200, hashtagInText: true,  urlShorten: false },
      tiktok:    { maxChars: 150,  hashtagInText: true,  urlShorten: true  },
    },
  },

  // ---- تصنيف المستخدمين (استخبارات البيانات) ----
  userClassification: {
    triggers: {
      enterprise: ["مشروع كبير", "شركة", "منشأة", "موظفين"],
      sme: ["محل", "مطعم", "مقهى", "صالون", "متجر"],
      investor: ["استثمار", "عائد", "ربح", "محفظة"],
      freelancer: ["حر", "مستقل", "عن بعد"],
    },
    financeThreshold: 500000,  // ريال — يُرسل عرض التمويل تلقائياً
  },

  // ---- إعدادات SEO ----
  seo: {
    defaultTitle: "جنان بيز | منصة الأعمال الذكية",
    defaultDesc: "أتمتة الأعمال، دراسات الجدوى، وتطوير الكفاءات لأصحاب المنشآت السعودية.",
    keywords: ["دراسة جدوى", "تحليل مشاريع", "جنان بيز", "موارد بشرية", "أعمال السعودية"],
    ogImage: "./assets/images/og-cover.jpg",
  },

  // ---- إعدادات بوابة الدفع ----
  payment: {
    provider:            "moyasar",
    moyasarPublishableKey: "pk_test_YOUR_MOYASAR_KEY",   // 🔑 استبدل بمفتاحك
    moyasarApiBase:      "https://api.moyasar.com/v1",
    tamaraToken:         "YOUR_TAMARA_TOKEN",            // 🔑 استبدل بتوكن تمارا
    tabbyApiKey:         "pk_test_YOUR_TABBY_KEY",       // 🔑 استبدل بمفتاح تابي
    currency:            "SAR",
    vatRate:             0.15,
    callbackUrl:         "/pages/payment-result.html",
    webhookBase:         "/api/payment",
    methods: ["card", "applepay", "googlepay", "stcpay", "tamara", "tabby"],
    brands:  ["mada", "visa", "mastercard"],
    liveMode:            false,                          // غيّر لـ true في الإنتاج
  },

  // ---- إخلاء المسؤولية القانوني ----
  legal: {
    disclaimer: "جميع التحليلات والدراسات المقدمة من جنان بيز هي لأغراض إرشادية فحسب، دون أدنى مسؤولية قانونية أو مالية على المنصة أو القائمين عليها. يتحمل المستخدم كامل المسؤولية عن قراراته.",
    pointsDisclaimer: "جميع النقاط والمكافآت والتقديرات التمويلية هي خدمات استشارية تشجيعية، وتخضع لشروط المنصة، وتقدم دون أدنى مسؤولية قانونية على جنان بيز.",
    privacyUrl: "/pages/privacy.html",
    termsUrl: "/pages/terms.html",
  },
};

// تجميد الكونفيج ضد التعديل العرضي
Object.freeze(JENAN_CONFIG);
Object.freeze(JENAN_CONFIG.queue);
Object.freeze(JENAN_CONFIG.loyalty);
Object.freeze(JENAN_CONFIG.api);
Object.freeze(JENAN_CONFIG.referral);
Object.freeze(JENAN_CONFIG.hookServices);
Object.freeze(JENAN_CONFIG.legal);
Object.freeze(JENAN_CONFIG.academy);
Object.freeze(JENAN_CONFIG.social);
Object.freeze(JENAN_CONFIG.software);
Object.freeze(JENAN_CONFIG.payment);

// تصدير
if (typeof module !== "undefined") module.exports = JENAN_CONFIG;
