/**
 * software-store.js — متجر برامج جنان بيز
 * يعرض كتالوج البرامج، الفلترة، التفاصيل، وطلبات الشراء
 * Auto-init: window.jenanSoftware = new SoftwareStore()
 */

/* ══════════════════════════════════════════════════════════
   كتالوج البرامج الكامل
   ══════════════════════════════════════════════════════════ */
const SOFTWARE_CATALOG = [
  {
    id: "accounting",
    category: "finance",
    emoji: "🧾",
    name: "برنامج المحاسبة الذكي",
    tagline: "محاسبة احترافية متوافقة مع متطلبات هيئة الزكاة والضريبة",
    desc: "نظام محاسبي متكامل مخصص للمنشآت السعودية — فواتير إلكترونية متوافقة مع زاتكا، حسابات ختامية، تقارير مالية آنية، وربط مباشر مع البنوك.",
    status: "available",
    badge: "الأكثر طلباً",
    badgeColor: "#10b981",
    color: "#0ea5e9",
    features: [
      "فواتير إلكترونية ZATCA متوافقة بالكامل",
      "تحليل الربح والخسارة بشكل آني",
      "ربط بنكي تلقائي (أكثر من 15 بنكاً سعودياً)",
      "حسابات الزكاة وضريبة القيمة المضافة",
      "ميزانية عمومية وقائمة دخل",
      "تسوية حسابات شهرية تلقائية",
      "تقارير قابلة للتصدير (PDF / Excel)",
      "نسخ احتياطي سحابي يومي",
    ],
    plans: [
      { name: "أساسية",       price: 150,  period: "شهرياً",  users: "حتى 2 مستخدم",  highlight: false, color: "#64748b" },
      { name: "احترافية",     price: 350,  period: "شهرياً",  users: "حتى 5 مستخدمين", highlight: true,  color: "#0ea5e9" },
      { name: "المؤسسات",     price: 750,  period: "شهرياً",  users: "غير محدود",       highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن برنامج المحاسبة الذكي من جنان بيز",
    demoAvailable: true,
  },
  {
    id: "pos",
    category: "sales",
    emoji: "🖥️",
    name: "نظام المبيعات ونقاط البيع",
    tagline: "POS سريع وذكي لمتاجرك وفروعك",
    desc: "نقطة بيع متكاملة للمتاجر والمطاعم والصيدليات — إدارة مبيعات، طباعة فواتير فورية، تقارير يومية وشهرية، ودعم لأكثر من فرع.",
    status: "available",
    badge: null,
    color: "#10b981",
    features: [
      "واجهة لمس سريعة وسهلة الاستخدام",
      "فاتورة ضريبية إلكترونية ZATCA",
      "تقارير مبيعات يومية / أسبوعية / شهرية",
      "إدارة المخزون المتصل بنقطة البيع",
      "دعم أكثر من فرع من شاشة واحدة",
      "خصومات وكوبونات ترويجية",
      "عميل مخصص وبرنامج ولاء",
      "طباعة إيصالات حرارية",
    ],
    plans: [
      { name: "أساسية",   price: 120, period: "شهرياً", users: "فرع واحد",     highlight: false, color: "#64748b" },
      { name: "احترافية", price: 299, period: "شهرياً", users: "حتى 3 فروع",   highlight: true,  color: "#10b981" },
      { name: "المؤسسات", price: 599, period: "شهرياً", users: "فروع غير محدودة", highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن نظام المبيعات ونقاط البيع من جنان بيز",
    demoAvailable: true,
  },
  {
    id: "hr",
    category: "hr",
    emoji: "👥",
    name: "برنامج الموارد البشرية والرواتب",
    tagline: "إدارة موارد بشرية متوافقة مع قوى ومدد",
    desc: "بناء ملفات الموظفين، صرف الرواتب، احتساب الإجازات والمكافآت والتأمينات الاجتماعية — مع رفع تقارير مدد وقوى بضغطة واحدة.",
    status: "available",
    badge: "جديد",
    badgeColor: "#f59e0b",
    color: "#6366f1",
    features: [
      "ملفات موظفين متكاملة (عقد، جنسية، مسمى وظيفي)",
      "صرف رواتب آلي مع احتساب الاستقطاعات",
      "حساب الإجازات والمكافآت بدقة",
      "ربط مباشر مع منصتَي قوى ومدد",
      "تقارير التأمينات الاجتماعية (GOSI)",
      "تتبع الحضور والغياب والانصراف",
      "إشعارات تلقائية لانتهاء العقود والتأشيرات",
      "تصدير كشوف الرواتب بصيغة بنكية",
    ],
    plans: [
      { name: "أساسية",   price: 200, period: "شهرياً", users: "حتى 10 موظفين", highlight: false, color: "#64748b" },
      { name: "احترافية", price: 450, period: "شهرياً", users: "حتى 50 موظفاً",  highlight: true,  color: "#6366f1" },
      { name: "المؤسسات", price: 900, period: "شهرياً", users: "غير محدود",       highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن برنامج الموارد البشرية والرواتب من جنان بيز",
    demoAvailable: true,
  },
  {
    id: "inventory",
    category: "operations",
    emoji: "📦",
    name: "برنامج المخازن والمخزون",
    tagline: "تحكم كامل في مخزونك وسلسلة التوريد",
    desc: "نظام ذكي لإدارة المخازن — استقبال بضاعة، صرف، جرد دوري، تنبيهات النفاذ، وتحليل حركة الأصناف مع دعم كامل للباركود وQR.",
    status: "available",
    badge: null,
    color: "#f97316",
    features: [
      "استقبال وصرف المخزون بالباركود وQR",
      "تنبيهات تلقائية عند نفاد المخزون",
      "طلبات الشراء والموردين",
      "جرد دوري ومطابقة الأصناف",
      "حركة كل صنف (وارد / صادر / رصيد)",
      "تقارير قيمة المخزون الآنية",
      "دعم أكثر من مستودع",
      "ربط مع نظام المبيعات والمحاسبة",
    ],
    plans: [
      { name: "أساسية",   price: 100, period: "شهرياً", users: "مستودع واحد",       highlight: false, color: "#64748b" },
      { name: "احترافية", price: 249, period: "شهرياً", users: "حتى 3 مستودعات",    highlight: true,  color: "#f97316" },
      { name: "المؤسسات", price: 499, period: "شهرياً", users: "مستودعات غير محدودة", highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن برنامج المخازن والمخزون من جنان بيز",
    demoAvailable: true,
  },
  {
    id: "crm",
    category: "sales",
    emoji: "🤝",
    name: "برنامج CRM إدارة العملاء",
    tagline: "حوّل كل عميل محتمل إلى عميل وفي",
    desc: "إدارة علاقات العملاء المؤسسية — تتبع الصفقات والفرص، أتمتة المتابعة، تحليل المبيعات، وبناء علاقات طويلة الأمد مع عملائك.",
    status: "coming_soon",
    badge: "قريباً",
    badgeColor: "#94a3b8",
    color: "#ec4899",
    features: [
      "خط أنابيب المبيعات المرئي",
      "إدارة جهات الاتصال والشركات",
      "أتمتة متابعة العملاء المحتملين",
      "تكامل مع البريد الإلكتروني والواتساب",
      "تقارير معدل تحول الصفقات",
      "إدارة المهام والمواعيد",
      "تسجيل سجل التواصل الكامل",
      "تحليل أداء فريق المبيعات",
    ],
    plans: [
      { name: "أساسية",   price: 180, period: "شهرياً", users: "حتى 3 مستخدمين", highlight: false, color: "#64748b" },
      { name: "احترافية", price: 399, period: "شهرياً", users: "حتى 10 مستخدمين", highlight: true,  color: "#ec4899" },
      { name: "المؤسسات", price: 799, period: "شهرياً", users: "غير محدود",        highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن برنامج CRM إدارة العملاء من جنان بيز",
    demoAvailable: false,
  },
  {
    id: "restaurant",
    category: "operations",
    emoji: "🍽️",
    name: "نظام إدارة المطاعم",
    tagline: "من الطلب للتسليم — كل شيء في شاشة واحدة",
    desc: "نظام كامل للمطاعم والكافيهات — إدارة الطاولات، قوائم الطعام، الطلبات الداخلية والخارجية، المطبخ الرقمي، وتقارير الإيرادات اليومية.",
    status: "coming_soon",
    badge: "قريباً",
    badgeColor: "#94a3b8",
    color: "#d97706",
    features: [
      "إدارة الطاولات وتخطيط القاعة",
      "قائمة طعام رقمية (QR Menu)",
      "طلبات المطبخ الرقمي (KDS)",
      "تكامل مع أجهزة التوصيل (جاهز / هنقرستيشن)",
      "إدارة تكاليف المطبخ والمكوّنات",
      "تقارير الأكثر مبيعاً وأوقات الذروة",
      "برنامج ولاء للعملاء المتكررين",
      "ربط مع المحاسبة والمخزون",
    ],
    plans: [
      { name: "أساسية",   price: 199, period: "شهرياً", users: "فرع واحد",  highlight: false, color: "#64748b" },
      { name: "احترافية", price: 449, period: "شهرياً", users: "حتى 3 فروع", highlight: true,  color: "#d97706" },
      { name: "المؤسسات", price: 849, period: "شهرياً", users: "فروع غير محدودة", highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن نظام إدارة المطاعم من جنان بيز",
    demoAvailable: false,
  },
  {
    id: "projects",
    category: "management",
    emoji: "📋",
    name: "برنامج إدارة المشاريع",
    tagline: "أنجز مشاريعك في الوقت والميزانية المحددة",
    desc: "إدارة المشاريع الاحترافية — مخططات جانت، لوحات كانبان، تتبع المهام والمهل، إدارة الموارد والميزانيات، وتقارير التقدم الفوري.",
    status: "coming_soon",
    badge: "قريباً",
    badgeColor: "#94a3b8",
    color: "#14b8a6",
    features: [
      "مخطط جانت التفاعلي",
      "لوحات كانبان قابلة للتخصيص",
      "تتبع المهام والمهل والأولويات",
      "إدارة ميزانية المشروع",
      "تقارير التقدم والأداء",
      "التعاون الفوري بين الفريق",
      "مرفقات وتعليقات متكاملة",
      "تكامل مع Google Calendar",
    ],
    plans: [
      { name: "أساسية",   price: 99,  period: "شهرياً", users: "حتى 5 مستخدمين",  highlight: false, color: "#64748b" },
      { name: "احترافية", price: 249, period: "شهرياً", users: "حتى 20 مستخدماً", highlight: true,  color: "#14b8a6" },
      { name: "المؤسسات", price: 549, period: "شهرياً", users: "غير محدود",        highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن برنامج إدارة المشاريع من جنان بيز",
    demoAvailable: false,
  },
  {
    id: "einvoice",
    category: "finance",
    emoji: "🔖",
    name: "نظام الفاتورة الإلكترونية ZATCA",
    tagline: "امتثل لمتطلبات هيئة الزكاة في دقائق",
    desc: "نظام متخصص لإصدار الفواتير الإلكترونية المتوافقة مع متطلبات الهيئة العامة للزكاة بالمرحلتين الأولى والثانية — مع رمز QR ورفع آلي للبوابة.",
    status: "available",
    badge: "متوافق مع ZATCA",
    badgeColor: "#059669",
    color: "#8b5cf6",
    features: [
      "فواتير متوافقة مع متطلبات ZATCA المرحلة 1 و2",
      "رمز QR مضمّن في كل فاتورة",
      "رفع آلي لبوابة هيئة الزكاة",
      "فواتير بسيطة وضريبية ومصاريف",
      "إدارة إشعارات الدائن والمدين",
      "أرشيف إلكتروني 10 سنوات",
      "دعم متعدد العملات",
      "ربط بسيط عبر API مع أي نظام",
    ],
    plans: [
      { name: "أساسية",   price: 80,  period: "شهرياً", users: "حتى 500 فاتورة",    highlight: false, color: "#64748b" },
      { name: "احترافية", price: 199, period: "شهرياً", users: "حتى 2000 فاتورة",   highlight: true,  color: "#8b5cf6" },
      { name: "المؤسسات", price: 450, period: "شهرياً", users: "فواتير غير محدودة", highlight: false, color: "#7c3aed" },
    ],
    whatsappText: "أرغب في الاستفسار عن نظام الفاتورة الإلكترونية ZATCA من جنان بيز",
    demoAvailable: true,
  },
];

const SW_CATEGORIES = [
  { id: "all",        label: "جميع البرامج",       icon: "🌟" },
  { id: "finance",    label: "المحاسبة والمالية",   icon: "🧾" },
  { id: "sales",      label: "المبيعات والعملاء",   icon: "📈" },
  { id: "hr",         label: "الموارد البشرية",     icon: "👥" },
  { id: "operations", label: "العمليات والمخازن",   icon: "📦" },
  { id: "management", label: "إدارة المشاريع",      icon: "📋" },
];

/* ══════════════════════════════════════════════════════════
   SoftwareStore — المحرك الكامل
   ══════════════════════════════════════════════════════════ */
class SoftwareStore {
  constructor() {
    this._root = null;
    this._activeCat = "all";
    this._searchVal = "";
    this._overlay = null;
  }

  init(rootId) {
    this._root = document.getElementById(rootId);
    if (!this._root) return;
    this._root.innerHTML = this._shellHTML();
    this._overlay = document.getElementById("sw-overlay");
    this._bindEvents();
    this._render();
  }

  // ── Shell HTML ──────────────────────────────────────────
  _shellHTML() {
    return `
      <!-- toolbar -->
      <div class="sw-toolbar">
        <div class="sw-search-wrap">
          <span class="sw-search-icon">🔍</span>
          <input class="sw-search" id="sw-search" type="text" placeholder="ابحث عن برنامج...">
        </div>
        <div class="sw-type-tabs" id="sw-type-tabs">
          ${SW_CATEGORIES.map(c =>
            `<button class="sw-cat-btn${c.id==='all'?' active':''}" data-cat="${c.id}">${c.icon} ${c.label}</button>`
          ).join('')}
        </div>
      </div>

      <!-- stats -->
      <div class="sw-stats-bar">
        <div class="sw-stat sw-stat-highlight">
          <span class="sw-stat-num">${SOFTWARE_CATALOG.filter(s=>s.status==='available').length}</span>
          <span class="sw-stat-lbl">برنامج متاح الآن</span>
        </div>
        <div class="sw-stat">
          <span class="sw-stat-num">${SOFTWARE_CATALOG.filter(s=>s.status==='coming_soon').length}</span>
          <span class="sw-stat-lbl">برنامج قريباً</span>
        </div>
        <div class="sw-stat">
          <span class="sw-stat-num">100%</span>
          <span class="sw-stat-lbl">سعودي الصنع</span>
        </div>
        <div class="sw-stat">
          <span class="sw-stat-num">دعم فوري</span>
          <span class="sw-stat-lbl">عبر الواتساب 24/7</span>
        </div>
      </div>

      <!-- content grid -->
      <div class="sw-grid" id="sw-grid"></div>

      <!-- compare banner -->
      <div class="sw-compare-banner" id="sw-compare-banner">
        <div class="sw-cb-inner">
          <span class="sw-cb-icon">💡</span>
          <div>
            <strong>هل تحتاج أكثر من برنامج؟</strong>
            <p>احصل على <strong>خصم 20%</strong> عند الاشتراك في برنامجين أو أكثر في وقت واحد</p>
          </div>
          <a href="https://wa.me/966567711999?text=${encodeURIComponent('أرغب في الاستفسار عن الباقة المجمّعة لبرامج جنان بيز')}"
             target="_blank" class="sw-cb-btn">احصل على الباقة المجمّعة 🚀</a>
        </div>
      </div>

      <!-- custom request -->
      <div class="sw-custom-section">
        <div class="sw-custom-inner">
          <div class="sw-custom-text">
            <span class="sw-custom-emoji">🛠️</span>
            <h3>تحتاج برنامجاً مخصصاً؟</h3>
            <p>نصمم لك برنامجاً كاملاً حسب متطلبات منشأتك — من الصفر وبالمواصفات التي تريدها تماماً</p>
          </div>
          <a href="https://wa.me/966567711999?text=${encodeURIComponent('أرغب في الاستفسار عن تصميم برنامج مخصص من جنان بيز')}"
             target="_blank" class="sw-btn-custom">تواصل معنا لبرنامجك المخصص</a>
        </div>
      </div>

      <!-- overlay -->
      <div class="sw-overlay" id="sw-overlay">
        <div class="sw-panel" id="sw-panel">
          <button class="sw-panel-close" id="sw-panel-close">✕ إغلاق</button>
          <div id="sw-panel-content"></div>
        </div>
      </div>
    `;
  }

  // ── Bind Events ─────────────────────────────────────────
  _bindEvents() {
    document.getElementById("sw-search")?.addEventListener("input", e => {
      this._searchVal = e.target.value.toLowerCase();
      this._render();
    });

    document.getElementById("sw-type-tabs")?.addEventListener("click", e => {
      const btn = e.target.closest(".sw-cat-btn");
      if (!btn) return;
      this._activeCat = btn.dataset.cat;
      document.querySelectorAll(".sw-cat-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.cat === this._activeCat)
      );
      this._render();
    });

    document.getElementById("sw-panel-close")?.addEventListener("click", () => this._closePanel());

    this._overlay?.addEventListener("click", e => {
      if (e.target === this._overlay) this._closePanel();
    });
  }

  // ── Render Grid ─────────────────────────────────────────
  _render() {
    const grid = document.getElementById("sw-grid");
    if (!grid) return;

    const filtered = SOFTWARE_CATALOG.filter(sw => {
      const catMatch = this._activeCat === "all" || sw.category === this._activeCat;
      const searchMatch = !this._searchVal ||
        sw.name.toLowerCase().includes(this._searchVal) ||
        sw.desc.toLowerCase().includes(this._searchVal);
      return catMatch && searchMatch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="sw-empty"><span>🔍</span><p>لا توجد برامج تطابق بحثك، جرّب بحثاً مختلفاً</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map(sw => this._cardHTML(sw)).join("");
  }

  // ── Card HTML ───────────────────────────────────────────
  _cardHTML(sw) {
    const isAvail = sw.status === "available";
    const minPrice = Math.min(...sw.plans.map(p => p.price));
    return `
    <div class="sw-card${isAvail ? "" : " sw-card-soon"}" onclick="window.jenanSoftware.openProduct('${sw.id}')">
      ${sw.badge ? `<span class="sw-badge" style="background:${sw.badgeColor || '#4E73C2'}">${sw.badge}</span>` : ''}
      <div class="sw-card-head" style="background:linear-gradient(135deg,${sw.color}18,${sw.color}08)">
        <span class="sw-card-emoji">${sw.emoji}</span>
        <span class="sw-status-pill ${isAvail ? 'sw-avail' : 'sw-soon'}">${isAvail ? '🟢 متاح' : '🔜 قريباً'}</span>
      </div>
      <div class="sw-card-body">
        <h3 class="sw-card-title">${sw.name}</h3>
        <p class="sw-card-tagline">${sw.tagline}</p>
        <ul class="sw-feat-list">
          ${sw.features.slice(0,3).map(f => `<li>✓ ${f}</li>`).join("")}
          <li class="sw-feat-more">+${sw.features.length - 3} ميزة أخرى</li>
        </ul>
        <div class="sw-card-footer">
          <div class="sw-price-from">
            ${isAvail
              ? `<span class="sw-from-label">يبدأ من</span><span class="sw-from-price" style="color:${sw.color}">${minPrice} ريال<small>/شهرياً</small></span>`
              : `<span class="sw-coming-label">قيد التطوير</span>`
            }
          </div>
          <button class="sw-card-btn" style="${isAvail ? `background:${sw.color}` : 'background:#94a3b8;cursor:not-allowed'}"
            ${!isAvail ? 'disabled' : ''}>
            ${isAvail ? 'عرض التفاصيل' : 'أُبلّغني عند الإطلاق'}
          </button>
        </div>
      </div>
    </div>`;
  }

  // ── Open Product Panel ───────────────────────────────────
  openProduct(id) {
    const sw = SOFTWARE_CATALOG.find(s => s.id === id);
    if (!sw) return;
    const content = document.getElementById("sw-panel-content");
    if (!content) return;

    const waUrl = `https://wa.me/966567711999?text=${encodeURIComponent(sw.whatsappText)}`;

    content.innerHTML = `
      <div class="sw-detail-header" style="background:linear-gradient(135deg,${sw.color}22,${sw.color}08);border-radius:14px;padding:1.6rem;margin-bottom:1.4rem;display:flex;align-items:flex-start;gap:1rem">
        <span style="font-size:3rem">${sw.emoji}</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.4rem">
            <h2 style="font-size:1.3rem;font-weight:900">${sw.name}</h2>
            ${sw.badge ? `<span class="sw-badge-lg" style="background:${sw.badgeColor||'#4E73C2'}">${sw.badge}</span>` : ''}
          </div>
          <p style="font-size:.95rem;color:#64748b;line-height:1.65">${sw.desc}</p>
        </div>
      </div>

      <!-- features -->
      <h3 style="font-size:1rem;font-weight:800;margin-bottom:.8rem">✨ الميزات الكاملة</h3>
      <div class="sw-feat-grid">
        ${sw.features.map(f => `<div class="sw-feat-item"><span style="color:#10b981;font-weight:700">✓</span> ${f}</div>`).join("")}
      </div>

      <!-- pricing -->
      <h3 style="font-size:1rem;font-weight:800;margin:1.4rem 0 .8rem">💰 خطط الأسعار</h3>
      <div class="sw-plans-row">
        ${sw.plans.map(p => `
          <div class="sw-plan ${p.highlight ? 'sw-plan-highlight' : ''}" style="${p.highlight ? `border-color:${sw.color};box-shadow:0 4px 20px ${sw.color}30` : ''}">
            ${p.highlight ? `<div class="sw-plan-top-badge" style="background:${sw.color}">الأكثر شيوعاً</div>` : ''}
            <div class="sw-plan-name" style="color:${p.color}">${p.name}</div>
            <div class="sw-plan-price">${p.price}<small> ريال</small></div>
            <div class="sw-plan-period">${p.period}</div>
            <div class="sw-plan-users">👤 ${p.users}</div>
            <button onclick="window.jenanPay && window.jenanPay.checkout({productId:'${sw.id}',productName:'${sw.name}',planName:'${p.name}',amount:${p.price},color:'${sw.color}'})"
               class="sw-plan-btn" style="background:${p.highlight ? sw.color : '#0f9d58'};color:#fff">
              💳 ادفع الآن
            </button>
            <a href="${waUrl}&text=${encodeURIComponent(sw.whatsappText + ' — الباقة ' + p.name)}"
               target="_blank" class="sw-plan-wa-btn">
              <svg viewBox="0 0 24 24" width="15" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2.001C6.477 2.001 2 6.477 2 12.001c0 1.872.518 3.624 1.42 5.119L2.007 22l4.989-1.396A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill-rule="evenodd" clip-rule="evenodd"/></svg>
              واتساب
            </a>
          </div>
        `).join("")}
      </div>

      ${sw.status === 'coming_soon' ? `
        <div class="sw-notify-box">
          <h4>🔔 أُبلّغني عند الإطلاق</h4>
          <p>يمكنك تسجيل اهتمامك وسنتواصل معك فور إطلاق البرنامج</p>
          <a href="${waUrl}" target="_blank" class="sw-notify-btn">تسجيل الاهتمام عبر واتساب</a>
        </div>
      ` : `
        <!-- CTA -->
        <div class="sw-detail-cta">
          ${sw.demoAvailable ? `
            <a href="https://wa.me/966567711999?text=${encodeURIComponent('أرغب في طلب عرض تجريبي لـ ' + sw.name + ' من جنان بيز')}"
               target="_blank" class="sw-btn-demo">🎬 جرّب النسخة التجريبية</a>
          ` : ''}
          <a href="${waUrl}" target="_blank" class="sw-btn-buy" style="background:${sw.color}">
            <i class="fa-brands fa-whatsapp"></i> اشترِ الآن عبر الواتساب
          </a>
        </div>
        <p class="sw-detail-note">⚡ بعد تأكيد الطلب يتم التفعيل خلال 24 ساعة · تدريب مجاني على الاستخدام · دعم يومي</p>
      `}
    `;

    this._overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  _closePanel() {
    this._overlay?.classList.remove("open");
    document.body.style.overflow = "";
  }
}

/* ══════════════════════════════════════════════════════════
   Auto-init
   ══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
  window.jenanSoftware = new SoftwareStore();
  window.jenanSoftware.init("software-root");
});
