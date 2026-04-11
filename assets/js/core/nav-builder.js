/**
 * جنان بيز — nav-builder.js
 * يبني قائمة التنقل تلقائياً من JENAN_CONFIG.nav
 * لإضافة صفحة أو قسم جديد: عدّل config/app-config.js فقط
 *
 * الاستخدام في أي صفحة:
 *   <script src="/config/app-config.js"></script>
 *   <script src="/assets/js/core/nav-builder.js"></script>
 *   <div id="jb-nav-root"></div>   ← يُستبدل بالهيدر كاملاً
 *
 * أو لبناء الـ nav فقط داخل هيدر موجود:
 *   JBNav.build({ activeHref: 'feasibility.html' });
 */

const JBNav = (() => {
  /**
   * يحدد الرابط النشط تلقائياً من عنوان الصفحة الحالية
   */
  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  /**
   * يبني HTML الـ nav كاملاً
   * @param {string} [activeHref] - الرابط النشط (اختياري — يُكتشف تلقائياً)
   */
  function buildNav(activeHref) {
    if (!window.JENAN_CONFIG?.nav) return '';
    const { links, sections } = JENAN_CONFIG.nav;
    const page = activeHref || currentPage();

    // روابط رئيسية
    const mainLinks = links.map(l => {
      const isActive = l.href.endsWith(page) ? ' active' : '';
      return `<a href="${l.href}" class="${isActive.trim()}">${l.label}</a>`;
    }).join('');

    // القائمة المنسدلة للأقسام
    const dropItems = sections.map(s => {
      const isActive = s.href.endsWith(page) ? ' active' : '';
      return `<a href="${s.href}" class="${isActive.trim()}"><i class="fa-solid ${s.icon}"></i>${s.label}</a>`;
    }).join('');

    // أدخل الـ dropdown بعد الرئيسية
    return `
      <a href="/index.html"${page === 'index.html' ? ' class="active"' : ''}>الرئيسية</a>
      <div class="dropdown">
        <a href="#">أقسامنا <i class="fa-solid fa-chevron-down fa-xs"></i></a>
        <div class="dropdown-menu">${dropItems}</div>
      </div>
      ${links.filter(l => !l.href.endsWith('index.html')).map(l => {
        const isActive = l.href.endsWith(page) ? ' class="active"' : '';
        return `<a href="${l.href}"${isActive}>${l.label}</a>`;
      }).join('')}
    `;
  }

  /**
   * يحقن الـ nav في العنصر المحدد
   * @param {Object} opts
   * @param {string} [opts.navId='nav'] - id العنصر <nav>
   * @param {string} [opts.activeHref]  - الرابط النشط
   */
  function build(opts = {}) {
    const navEl = document.getElementById(opts.navId || 'nav');
    if (!navEl) return;
    navEl.innerHTML = buildNav(opts.activeHref);
  }

  /**
   * يبني هيدراً كاملاً ويحقنه في #jb-nav-root
   * مناسب للصفحات الجديدة التي لا تحتوي هيدراً بعد
   */
  function buildHeader(opts = {}) {
    const root = document.getElementById('jb-nav-root');
    if (!root || !window.JENAN_CONFIG) return;
    const cfg = JENAN_CONFIG.app;

    root.outerHTML = `
    <header id="header">
      <div class="container header-inner">
        <a href="/index.html" class="logo">
          <img src="${cfg.logo}" alt="${cfg.name}" onerror="this.style.display='none'" />
          <div>
            <span class="logo-text">${cfg.name}</span>
            <span class="logo-sub">${cfg.nameEn}</span>
          </div>
        </a>
        <nav class="nav" id="nav">${buildNav(opts.activeHref)}</nav>
        <div class="header-actions">
          <a href="/auth.html" class="btn btn-green" style="font-size:.85rem;padding:.45rem 1.1rem">دخول</a>
          <button id="theme-toggle"><i class="fa-solid fa-moon" id="th-ico"></i></button>
          <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>
        </div>
      </div>
    </header>`;

    // تفعيل الـ theme toggle
    _initTheme();
    // تفعيل الهامبرغر
    _initHamburger();
  }

  function _initTheme() {
    const html = document.documentElement;
    const saved = localStorage.getItem('jb-theme') || 'light';
    html.setAttribute('data-theme', saved);
    const btn = document.getElementById('theme-toggle');
    const ico = document.getElementById('th-ico');
    if (!btn || !ico) return;
    ico.className = saved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    btn.addEventListener('click', () => {
      const n = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', n);
      localStorage.setItem('jb-theme', n);
      ico.className = n === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
  }

  function _initHamburger() {
    const btn = document.getElementById('hamburger');
    const nav = document.getElementById('nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!btn.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }

  return { build, buildHeader, buildNav };
})();
