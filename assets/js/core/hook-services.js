// ══════════════════════════════════════════════════════
//   خدمات الجذب الفوري — Hook Services
//   1. ملخص المشروع التنفيذي (Executive Summary Bot)
//   2. مدقق الامتثال الحكومي (Gov-Compliance Checker)
//   3. رادار التمويل المبدئي (Funding Radar)
// ══════════════════════════════════════════════════════

const HOOKS_LEGAL = (typeof JENAN_CONFIG !== "undefined" && JENAN_CONFIG.legal?.pointsDisclaimer)
  || "جميع النقاط والمكافآت والتقديرات التمويلية هي خدمات استشارية تشجيعية، وتخضع لشروط المنصة، وتُقدَّم دون أدنى مسؤولية قانونية على جنان بيز.";

const HOOKS_API = (typeof JENAN_CONFIG !== "undefined" && JENAN_CONFIG.api?.baseUrl) || "/api";

// ─── حالة مشتركة ───────────────────────────────────
let _currentUser = null;

function _getSession() {
  try {
    const s = JSON.parse(localStorage.getItem("jenan_session") || "{}");
    _currentUser = s.user || null;
    return _currentUser;
  } catch { return null; }
}

function _isLoggedIn() { return !!_getSession()?.id; }

function _getToken() {
  try {
    const s = JSON.parse(localStorage.getItem("jenan_session") || "{}");
    return s.token || "";
  } catch { return ""; }
}

// ─── منح نقاط محلياً ───────────────────────────────
function _awardPoints(action) {
  const user = _getSession();
  if (!user) return;
  const cfg = typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.loyalty.actions : {};
  const pts = cfg[action]?.points || 0;
  if (!pts) return;
  try {
    if (typeof jenanLoyalty !== "undefined") {
      jenanLoyalty.award(user.id, action);
      _showPointsToast(`+${pts} نقطة — ${cfg[action]?.label || action}`);
    }
  } catch (e) { console.warn("hook-services award:", e); }
}

function _showPointsToast(msg) {
  const t = document.createElement("div");
  t.className = "hs-points-toast";
  t.textContent = "🏆 " + msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3000);
}

// ─── عنصر اللقفة القانونية ─────────────────────────
function _legalBadge(extra) {
  return `<div class="hs-legal-badge">
    ⚖️ ${extra ? extra + "<br>" : ""}${HOOKS_LEGAL}
  </div>`;
}

// ─── حاجز تسجيل الدخول ─────────────────────────────
function _loginWall(containerId, points) {
  return `<div class="hs-login-wall" id="${containerId}">
    <div class="hs-login-wall-icon">🔒</div>
    <div class="hs-login-wall-title">سجّل للحصول على الملخص كاملاً</div>
    <div class="hs-login-wall-desc">
      الانضمام مجاني ويمنحك <strong>50 نقطة ترحيبية</strong>
      ${points ? ` + <strong>${points} نقطة</strong> عند أول استخدام` : ''}
    </div>
    <div class="hs-login-wall-actions">
      <a href="../auth.html?action=register" class="hs-btn-primary">إنشاء حساب مجاني</a>
      <a href="../auth.html?action=login" class="hs-btn-secondary">تسجيل الدخول</a>
    </div>
    ${_legalBadge()}
  </div>`;
}

// ══════════════════════════════════════════════════════
//   الخدمة الأولى: ملخص المشروع التنفيذي
// ══════════════════════════════════════════════════════

function initExecSummary(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="hs-card">
      <div class="hs-card-header" style="--hs-accent:#4E73C2">
        <div class="hs-card-icon">⚡</div>
        <div>
          <div class="hs-card-title">مشروعك في دقيقة</div>
          <div class="hs-card-sub">Executive Summary Bot</div>
        </div>
        <div class="hs-badge free">مجاني</div>
      </div>
      <div class="hs-card-desc">
        أدخل اسم مشروعك وفكرته فقط — سيولّد الروبوت ملخصاً تنفيذياً يشمل الرؤية والفئة المستهدفة والميزة التنافسية.
      </div>
      <div class="hs-form" id="es-form">
        <div class="hs-field">
          <label class="hs-label">اسم المشروع *</label>
          <input id="es-name" class="hs-input" type="text" placeholder="مثال: مطعم البيت، منصة تعليمية، متجر إلكتروني" maxlength="120" />
        </div>
        <div class="hs-field">
          <label class="hs-label">فكرة المشروع *</label>
          <textarea id="es-idea" class="hs-input hs-textarea" rows="3"
            placeholder="اشرح بإيجاز: ماذا تقدم؟ لمن؟ وكيف يختلف مشروعك عن غيره؟"></textarea>
        </div>
        <button class="hs-btn-generate" onclick="runExecSummary('${containerId}')">
          ⚡ ولّد الملخص التنفيذي فوراً
        </button>
      </div>
      <div id="es-result-${containerId}" class="hs-result" style="display:none"></div>
      ${_legalBadge()}
    </div>`;
}

async function runExecSummary(containerId) {
  const name    = document.getElementById("es-name")?.value.trim();
  const idea    = document.getElementById("es-idea")?.value.trim();
  const result  = document.getElementById(`es-result-${containerId}`);

  if (!name || !idea) {
    _flashError("es-name", "يرجى إدخال اسم المشروع والفكرة");
    return;
  }

  result.style.display = "block";
  result.innerHTML = `<div class="hs-loading"><div class="hs-spinner"></div>جاري توليد الملخص...</div>`;

  const loggedIn = _isLoggedIn();
  const depth    = loggedIn ? "full" : "teaser";

  try {
    const resp = await fetch(`${HOOKS_API}/exec-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${_getToken()}` },
      body: JSON.stringify({ project_name: name, idea, depth }),
    });
    const data = await resp.json();

    if (data.locked) {
      // عرض أول 50 كلمة مع ضباب + حاجز التسجيل
      const words     = (data.teaser || idea).split(" ");
      const preview   = words.slice(0, 50).join(" ") + "...";
      result.innerHTML = `
        <div class="hs-teaser-wrap">
          <div class="hs-teaser-text">${preview}</div>
          <div class="hs-teaser-blur">الملخص الكامل + دراسة الجدوى المبسطة</div>
        </div>
        ${_loginWall("es-wall-" + containerId, 10)}`;
    } else {
      // عرض الملخص كاملاً
      result.innerHTML = `
        <div class="hs-summary-output">
          <div class="hs-summary-header">
            <span class="hs-summary-badge">✅ الملخص التنفيذي</span>
            <button class="hs-copy-btn" onclick="copyText('es-summary-text')">📋 نسخ</button>
          </div>
          <div id="es-summary-text" class="hs-summary-text">${(data.summary || "").replace(/\n/g, "<br>")}</div>
          <div class="hs-next-action">
            🎯 هل تريد دراسة جدوى مفصلة؟
            <a href="./project.html" class="hs-link">ابدأ إدارة مشروعك →</a>
          </div>
        </div>`;
      _awardPoints("exec_summary_use");
    }
  } catch (e) {
    result.innerHTML = `<div class="hs-error">⚠️ تعذّر الاتصال بالخادم. تأكد من تشغيل الـ API أو جرّب لاحقاً.</div>`;
    // fallback محلي
    _execSummaryFallback(containerId, name, idea);
  }
}

function _execSummaryFallback(containerId, name, idea) {
  const result = document.getElementById(`es-result-${containerId}`);
  const loggedIn = _isLoggedIn();

  const fullText = `
مشروع «${name}» هو ${idea}

الرؤية: تقديم حلول مبتكرة تلبّي احتياجات العملاء في السوق السعودي بأعلى معايير الجودة والكفاءة، مع السعي للريادة في القطاع خلال السنوات الخمس القادمة.

الفئة المستهدفة: تتنوع الشريحة المستهدفة لتشمل الأفراد والمنشآت الصغيرة والمتوسطة في المنطقة الجغرافية المستهدفة، مع التركيز على شريحة ذات الدخل المتوسط فما فوق.

الميزة التنافسية: يتميز هذا المشروع بتقديم قيمة مضافة واضحة للعميل من خلال الجودة والخدمة والسعر التنافسي مقارنةً بالبدائل الموجودة في السوق.

فرص السوق: يشهد القطاع نمواً ملحوظاً في ظل التحولات الاقتصادية ضمن رؤية 2030، مما يُتيح فرصاً واعدة للمشاريع الجديدة المبنية على أسس سليمة.
  `.trim();

  const words = fullText.split(" ");
  const preview = words.slice(0, 50).join(" ") + "...";

  if (loggedIn) {
    result.innerHTML = `
      <div class="hs-summary-output">
        <div class="hs-summary-header">
          <span class="hs-summary-badge">✅ الملخص التنفيذي</span>
          <button class="hs-copy-btn" onclick="copyText('es-summary-text')">📋 نسخ</button>
        </div>
        <div id="es-summary-text" class="hs-summary-text">${fullText.replace(/\n/g, "<br>")}</div>
      </div>`;
    _awardPoints("exec_summary_use");
  } else {
    result.innerHTML = `
      <div class="hs-teaser-wrap">
        <div class="hs-teaser-text">${preview}</div>
        <div class="hs-teaser-blur">الملخص الكامل + دراسة الجدوى المبسطة</div>
      </div>
      ${_loginWall("es-wall-" + containerId, 10)}`;
  }
}

// ══════════════════════════════════════════════════════
//   الخدمة الثانية: مدقق الامتثال الحكومي
// ══════════════════════════════════════════════════════

const SECTORS = [
  "مطعم وفود","مقهى","تجزئة ومحلات","خدمات شخصية","تقنية","تجارة إلكترونية",
  "مقاولات وبناء","صحة وعيادات","تعليم وتدريب","صناعة","استيراد وتصدير","خدمات إلكترونية","عمل حر",
];

function initGovCompliance(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="hs-card">
      <div class="hs-card-header" style="--hs-accent:#059669">
        <div class="hs-card-icon">🏛️</div>
        <div>
          <div class="hs-card-title">التدقيق الحكومي السريع</div>
          <div class="hs-card-sub">Gov-Compliance Checker — قوى / مدد</div>
        </div>
        <div class="hs-badge free">مجاني</div>
      </div>
      <div class="hs-card-desc">
        تحقق فورياً من امتثال منشأتك لاشتراطات منصتَي <strong>قوى</strong> و<strong>مدد</strong> — تقرير أخضر/أحمر خلال ثوانٍ.
      </div>
      <div class="hs-form">
        <div class="hs-field-row">
          <div class="hs-field">
            <label class="hs-label">نوع النشاط *</label>
            <select id="gc-sector" class="hs-input hs-select">
              <option value="">اختر النشاط</option>
              ${SECTORS.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
          <div class="hs-field">
            <label class="hs-label">عدد الموظفين *</label>
            <input id="gc-employees" class="hs-input" type="number" min="0" placeholder="0" />
          </div>
          <div class="hs-field">
            <label class="hs-label">نسبة السعوديين %</label>
            <input id="gc-saudi" class="hs-input" type="number" min="0" max="100" placeholder="0" />
          </div>
        </div>
        <div class="hs-checklist-title">الوضع الحالي:</div>
        <div class="hs-checklist">
          <label class="hs-check"><input type="checkbox" id="gc-cr" checked> سجل تجاري (CR)</label>
          <label class="hs-check"><input type="checkbox" id="gc-muni"> ترخيص بلدي</label>
          <label class="hs-check"><input type="checkbox" id="gc-gosi"> تأمينات اجتماعية (GOSI)</label>
          <label class="hs-check"><input type="checkbox" id="gc-iban"> IBAN مرتبط بمدد</label>
          <label class="hs-check"><input type="checkbox" id="gc-reg" checked> منشأة مسجّلة رسمياً</label>
        </div>
        <button class="hs-btn-generate" style="--hs-btn-bg:#059669" onclick="runGovCompliance('${containerId}')">
          🏛️ فحص الامتثال الآن
        </button>
      </div>
      <div id="gc-result-${containerId}" class="hs-result" style="display:none"></div>
      ${_legalBadge()}
    </div>`;
}

async function runGovCompliance(containerId) {
  const sector   = document.getElementById("gc-sector")?.value;
  const employees= parseInt(document.getElementById("gc-employees")?.value) || 0;
  const saudi    = parseFloat(document.getElementById("gc-saudi")?.value) || 0;
  const hasCR    = document.getElementById("gc-cr")?.checked    || false;
  const hasMuni  = document.getElementById("gc-muni")?.checked  || false;
  const hasGosi  = document.getElementById("gc-gosi")?.checked  || false;
  const hasIban  = document.getElementById("gc-iban")?.checked  || false;
  const isReg    = document.getElementById("gc-reg")?.checked   || false;
  const result   = document.getElementById(`gc-result-${containerId}`);

  if (!sector) { _flashError("gc-sector", "يرجى اختيار نوع النشاط"); return; }

  result.style.display = "block";
  result.innerHTML = `<div class="hs-loading"><div class="hs-spinner" style="border-top-color:#059669"></div>جاري الفحص...</div>`;

  const payload = {
    sector, employee_count: employees, is_registered: isReg,
    has_cr: hasCR, has_municipality: hasMuni, has_gosi: hasGosi,
    has_iban: hasIban, saudi_ratio: saudi,
  };

  try {
    const resp  = await fetch(`${HOOKS_API}/gov-compliance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${_getToken()}` },
      body: JSON.stringify(payload),
    });
    const data  = await resp.json();
    _renderComplianceReport(data, containerId);
    _awardPoints("gov_compliance_use");
  } catch (e) {
    // fallback محلي
    _govComplianceFallback(payload, containerId);
  }
}

function _govComplianceFallback(payload, containerId) {
  const issues = [], passing = [];

  if (payload.has_cr) passing.push({ platform: "السجل التجاري", status: "green", message: "السجل التجاري متاح ✅" });
  else issues.push({ platform: "عام", status: "red", message: "لا يوجد سجل تجاري. المنشأة غير نظامية.", action: "استخراج سجل تجاري عبر بوابة ناجز", academy_course: "gov_platforms" });

  if (payload.employee_count >= 1) {
    if (payload.has_gosi) passing.push({ platform: "قوى", status: "green", message: "التأمينات الاجتماعية مسجّلة ✅" });
    else issues.push({ platform: "قوى / التأمينات", status: "red", message: "لم يتم اشتراك الموظفين في التأمينات (GOSI).", action: "تسجيل في التأمينات عبر منصة قوى", academy_course: "gov_platforms" });

    if (payload.has_iban) passing.push({ platform: "مدد", status: "green", message: "IBAN مرتبط بمدد ✅" });
    else issues.push({ platform: "مدد", status: "red", message: "لا يوجد IBAN مرتبط بحساب الرواتب في مدد.", action: "ربط IBAN بمنصة مدد", academy_course: "gov_platforms" });

    if (payload.employee_count >= 6 && payload.saudi_ratio < 12.5)
      issues.push({ platform: "قوى — نطاقات", status: "red", message: `نسبة السعودة (${payload.saudi_ratio}%) أقل من الحد الأدنى (12.5%).`, action: "مراجعة خطة التوطين", academy_course: "hr" });
    else if (payload.employee_count >= 6)
      passing.push({ platform: "قوى — نطاقات", status: "green", message: `نسبة السعودة مقبولة ✅` });
  }

  if (payload.has_municipality) passing.push({ platform: "البلدية", status: "green", message: "الترخيص البلدي متاح ✅" });
  else if (!["تقنية","خدمات إلكترونية","عمل حر"].includes(payload.sector))
    issues.push({ platform: "البلدية", status: "yellow", message: "ترخيص البلدية غير موثق.", action: "التحقق من اشتراطات البلدية", academy_course: "gov_platforms" });

  const overall = issues.length === 0 ? "green" : (issues.every(i => i.status === "yellow") ? "yellow" : "red");
  _renderComplianceReport({ overall_status: overall, issues, passing, issues_count: issues.length, passing_count: passing.length, summary_ar: overall === "green" ? "✅ منشأتك ممتثلة." : `⚠️ يوجد ${issues.length} نواقص.` }, containerId);
  _awardPoints("gov_compliance_use");
}

function _renderComplianceReport(data, containerId) {
  const result = document.getElementById(`gc-result-${containerId}`);
  const colorMap = { green: "#059669", yellow: "#d97706", red: "#dc2626" };
  const labelMap = { green: "✅ ممتثل", yellow: "⚠️ تحذير", red: "❌ مخالفة" };
  const bgMap    = { green: "#f0fdf4", yellow: "#fffbeb", red: "#fef2f2" };

  const overallColor = colorMap[data.overall_status] || "#059669";
  const overallBg    = bgMap[data.overall_status]    || "#f0fdf4";

  const issuesHTML = (data.issues || []).map(i => `
    <div class="hs-compliance-item issue">
      <div class="hs-ci-badge" style="background:${bgMap[i.status]};color:${colorMap[i.status]}">${labelMap[i.status]}</div>
      <div class="hs-ci-body">
        <div class="hs-ci-platform">${i.platform}</div>
        <div class="hs-ci-msg">${i.message}</div>
        ${i.action ? `<div class="hs-ci-action">📌 الإجراء: ${i.action}</div>` : ""}
        ${i.academy_course ? `
          <a href="./knowledge.html?track=${i.academy_course}" class="hs-ci-course">
            🎓 احصل على دورة "${i.academy_course === "gov_platforms" ? "المنصات الحكومية" : "الموارد البشرية"}" في الأكاديمية
          </a>` : ""}
      </div>
    </div>`).join("");

  const passingHTML = (data.passing || []).map(p => `
    <div class="hs-compliance-item pass">
      <div class="hs-ci-badge" style="background:#f0fdf4;color:#059669">✅ ممتثل</div>
      <div class="hs-ci-body">
        <div class="hs-ci-platform">${p.platform}</div>
        <div class="hs-ci-msg">${p.message}</div>
      </div>
    </div>`).join("");

  result.innerHTML = `
    <div class="hs-compliance-report">
      <div class="hs-overall-banner" style="background:${overallBg};border-color:${overallColor}">
        <div class="hs-overall-icon" style="color:${overallColor}">${data.overall_status === "green" ? "✅" : data.overall_status === "yellow" ? "⚠️" : "🚨"}</div>
        <div>
          <div class="hs-overall-title" style="color:${overallColor}">${data.summary_ar}</div>
          <div class="hs-overall-counts">${data.passing_count || 0} عنصر ممتثل — ${data.issues_count || 0} نقص</div>
        </div>
      </div>
      ${(data.issues || []).length > 0 ? `<div class="hs-issues-title">النواقص التي تحتاج معالجة:</div>${issuesHTML}` : ""}
      ${(data.passing || []).length > 0 ? `<div class="hs-passing-title">العناصر المستوفاة:</div>${passingHTML}` : ""}
      ${_legalBadge("التقرير لأغراض إرشادية — يُرجى التحقق من الجهات الرسمية")}
    </div>`;
}

// ══════════════════════════════════════════════════════
//   الخدمة الثالثة: رادار التمويل المبدئي
// ══════════════════════════════════════════════════════

const REGIONS = [
  "الرياض","مكة المكرمة","المدينة المنورة","الشرقية",
  "القصيم","حائل","تبوك","عسير","الجوف","نجران","جازان","الحدود الشمالية","الباحة",
];

function initFundingRadar(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="hs-card">
      <div class="hs-card-header" style="--hs-accent:#d97706">
        <div class="hs-card-icon">📡</div>
        <div>
          <div class="hs-card-title">رادار التمويل المبدئي</div>
          <div class="hs-card-sub">Funding Radar</div>
        </div>
        <div class="hs-badge free">مجاني</div>
      </div>
      <div class="hs-card-desc">
        أدخل بيانات مشروعك البسيطة — سيحسب الرادار مبلغ التمويل الذي قد تكون مؤهلاً له ويُخبرك بالبرامج المناسبة.
      </div>
      <div class="hs-form">
        <div class="hs-field-row">
          <div class="hs-field">
            <label class="hs-label">رأس المال المتاح (ريال) *</label>
            <input id="fr-capital" class="hs-input" type="number" min="1000" placeholder="مثال: 100000" />
          </div>
          <div class="hs-field">
            <label class="hs-label">المنطقة *</label>
            <select id="fr-region" class="hs-input hs-select">
              <option value="">اختر المنطقة</option>
              ${REGIONS.map(r => `<option value="${r}">${r}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="hs-field-row">
          <div class="hs-field">
            <label class="hs-label">القطاع *</label>
            <select id="fr-sector" class="hs-input hs-select">
              <option value="">اختر القطاع</option>
              ${SECTORS.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
          <div class="hs-field">
            <label class="hs-label">الإيراد الشهري (ريال)</label>
            <input id="fr-revenue" class="hs-input" type="number" min="0" placeholder="0 إذا لم تبدأ بعد" />
          </div>
        </div>
        <div class="hs-field-row">
          <div class="hs-field">
            <label class="hs-label">عدد الموظفين</label>
            <input id="fr-employees" class="hs-input" type="number" min="0" placeholder="0" />
          </div>
          <div class="hs-field">
            <label class="hs-label">سنوات التشغيل</label>
            <select id="fr-years" class="hs-input hs-select">
              <option value="0">لم أبدأ بعد</option>
              <option value="1">أقل من سنة</option>
              <option value="2">1–3 سنوات</option>
              <option value="5">3–5 سنوات</option>
              <option value="7">أكثر من 5 سنوات</option>
            </select>
          </div>
        </div>
        <button class="hs-btn-generate" style="--hs-btn-bg:#d97706" onclick="runFundingRadar('${containerId}')">
          📡 ابدأ الفحص — اعرف تأهيلك للتمويل
        </button>
      </div>
      <div id="fr-result-${containerId}" class="hs-result" style="display:none"></div>
      ${_legalBadge()}
    </div>`;
}

async function runFundingRadar(containerId) {
  const capital   = parseFloat(document.getElementById("fr-capital")?.value) || 0;
  const region    = document.getElementById("fr-region")?.value;
  const sector    = document.getElementById("fr-sector")?.value;
  const revenue   = parseFloat(document.getElementById("fr-revenue")?.value) || 0;
  const employees = parseInt(document.getElementById("fr-employees")?.value) || 0;
  const years     = parseInt(document.getElementById("fr-years")?.value) || 0;
  const result    = document.getElementById(`fr-result-${containerId}`);

  if (!capital || capital < 1000) { _flashError("fr-capital", "يرجى إدخال رأس مال صحيح (1000 ريال فأكثر)"); return; }
  if (!region) { _flashError("fr-region", "يرجى اختيار المنطقة"); return; }
  if (!sector) { _flashError("fr-sector", "يرجى اختيار القطاع"); return; }

  result.style.display = "block";
  result.innerHTML = `<div class="hs-loading"><div class="hs-spinner" style="border-top-color:#d97706"></div>جاري تحليل بياناتك...</div>`;

  const payload = { capital, region, sector, monthly_revenue: revenue, num_employees: employees, years_active: years };

  try {
    const resp = await fetch(`${HOOKS_API}/funding-radar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${_getToken()}` },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    _renderFundingResult(data, containerId, capital);
    _awardPoints("funding_radar_use");
  } catch (e) {
    _fundingRadarFallback(payload, containerId);
  }
}

function _fundingRadarFallback(payload, containerId) {
  let mult = 0.5, program = "صغار المنشآت — كفالة";
  if (payload.capital <= 50_000)       { mult = 0.5; program = "صغار المنشآت — كفالة"; }
  else if (payload.capital <= 200_000) { mult = 1.0; program = "منشآت — برامج التمويل الأساسية"; }
  else if (payload.capital <= 1_000_000){ mult = 2.0; program = "منشآت — برنامج النمو"; }
  else                                  { mult = 3.0; program = "مساندة — برنامج التوسع"; }

  if (payload.years_active >= 2) mult *= 1.25;
  if (payload.monthly_revenue * 12 >= payload.capital * 0.5) mult *= 1.1;
  const est = Math.round(payload.capital * mult / 1000) * 1000;

  const regProgs = [];
  if (["الرياض","مكة المكرمة","المدينة المنورة"].includes(payload.region)) regProgs.push("صندوق المئوية — منح المنطقة");
  if (["الشرقية","الجبيل","ينبع"].includes(payload.region)) regProgs.push("صندوق التنمية الصناعية السعودي");
  if (["تقنية","برمجة","ذكاء اصطناعي"].includes(payload.sector)) { regProgs.push("STC Ventures"); regProgs.push("Flat6Labs"); }

  _renderFundingResult({
    estimated_funding: est, program,
    regional_programs: regProgs,
    teaser_message: `بناءً على بياناتك، أنت مؤهل مبدئياً لتمويل يصل إلى ${est.toLocaleString("ar-SA")} ريال عبر برنامج ${program}.`,
    next_step: "أكمل ملفك الشخصي وتواصل مع المساعد الذكي لبدء إجراءات التمويل الفعلية.",
    disclaimer: HOOKS_LEGAL,
  }, containerId, payload.capital);
  _awardPoints("funding_radar_use");
}

function _renderFundingResult(data, containerId, capital) {
  const result   = document.getElementById(`fr-result-${containerId}`);
  const amount   = (data.estimated_funding || 0).toLocaleString("ar-SA");
  const loggedIn = _isLoggedIn();

  const regsHTML = (data.regional_programs || []).length > 0 ? `
    <div class="hs-funding-programs">
      <div class="hs-fp-title">برامج إضافية قد تناسبك:</div>
      ${(data.regional_programs || []).map(p => `<div class="hs-fp-item">🏦 ${p}</div>`).join("")}
    </div>` : "";

  const ctaHTML = loggedIn ? `
    <div class="hs-funding-cta">
      <div class="hs-funding-cta-text">للمتابعة وبدء إجراءات التمويل الفعلية:</div>
      <a href="../dashboard.html" class="hs-btn-primary" style="background:#d97706">أكمل ملفك الشخصي ←</a>
    </div>` : `
    <div class="hs-funding-cta">
      <div class="hs-funding-cta-text">سجّل لحفظ نتيجتك والتواصل مع المساعد الذكي لتكملة الإجراءات:</div>
      <div style="display:flex;gap:.8rem;flex-wrap:wrap">
        <a href="../auth.html?action=register" class="hs-btn-primary" style="background:#d97706">إنشاء حساب مجاني</a>
        <a href="../auth.html?action=login" class="hs-btn-secondary">تسجيل الدخول</a>
      </div>
    </div>`;

  result.innerHTML = `
    <div class="hs-funding-result">
      <div class="hs-funding-banner">
        <div class="hs-funding-label">أنت مؤهل مبدئياً لتمويل يصل إلى</div>
        <div class="hs-funding-amount">${amount} <span>ريال</span></div>
        <div class="hs-funding-program">عبر: ${data.program || ""}</div>
      </div>
      <div class="hs-funding-msg">${data.teaser_message || ""}</div>
      ${regsHTML}
      ${ctaHTML}
      ${_legalBadge("التقدير مبدئي وغير ملزم")}
    </div>`;
}

// ══════════════════════════════════════════════════════
//   نظام النقاط — لوحة المركز
// ══════════════════════════════════════════════════════

function initPointsCenter(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const user = _getSession();
  const cfg  = typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG : null;

  if (!user) {
    el.innerHTML = `
      <div class="hs-points-hub">
        <div class="hs-points-hub-header">
          <div class="hs-ph-icon">🏆</div>
          <div class="hs-ph-title">مركز النقاط والمكافآت</div>
        </div>
        <div class="hs-earn-grid">
          ${_pointsRulesHTML()}
        </div>
        <div class="hs-redeem-section">
          <div class="hs-redeem-title">كيف تستهلك نقاطك؟</div>
          ${_redeemRulesHTML()}
        </div>
        <div class="hs-points-cta">
          <a href="../auth.html?action=register" class="hs-btn-primary">ابدأ واكسب 50 نقطة ترحيبية →</a>
        </div>
        ${_legalBadge()}
      </div>`;
    return;
  }

  let balance = 0, tier = "برونزي", badge = "🥉";
  try {
    if (typeof jenanLoyalty !== "undefined") {
      const b = jenanLoyalty.getBalance(user.id);
      balance = b.total  || 0;
      tier    = b.tier   || "برونزي";
      const t = (cfg?.loyalty.tiers || []).find(t => t.name === tier);
      badge   = t?.badge || "🥉";
    }
  } catch (e) {}

  el.innerHTML = `
    <div class="hs-points-hub">
      <div class="hs-points-hub-header">
        <div class="hs-ph-icon">🏆</div>
        <div class="hs-ph-title">مركز النقاط والمكافآت</div>
      </div>
      <div class="hs-my-balance">
        <div class="hs-mb-tier">${badge} ${tier}</div>
        <div class="hs-mb-points">${balance.toLocaleString("ar-SA")}</div>
        <div class="hs-mb-label">نقطة متاحة</div>
      </div>
      <div class="hs-earn-grid">
        ${_pointsRulesHTML()}
      </div>
      <div class="hs-redeem-section">
        <div class="hs-redeem-title">كيف تستهلك نقاطك؟</div>
        ${_redeemRulesHTML()}
      </div>
      ${_legalBadge()}
    </div>`;
}

function _pointsRulesHTML() {
  const rules = [
    { icon: "🎉", label: "التسجيل الجديد",           pts: 50,  note: "نقطة ترحيبية فور تفعيل الحساب" },
    { icon: "📖", label: "قراءة مقال كامل",           pts: 5,   note: "في قسم المعرفة" },
    { icon: "🎓", label: "إتمام درس في الأكاديمية",  pts: 20,  note: "مع كل درس مكتمل" },
    { icon: "🛠️", label: "استخدام الأدوات (أول مرة)",pts: 10,  note: "المحلل، المصمم، رادار التمويل..." },
    { icon: "📱", label: "مشاركة رابط أو شهادة",     pts: 15,  note: "على وسائل التواصل الاجتماعي" },
    { icon: "🤝", label: "دعوة عضو جديد",            pts: 100, note: "عند تسجيل شخص عبر رابطك" },
    { icon: "💎", label: "نقاط ذهبية — شراء المُحال",pts: 200, note: "عند شراء المُحال لخدمة أو دورة" },
  ];
  return rules.map(r => `
    <div class="hs-earn-card">
      <div class="hs-ec-icon">${r.icon}</div>
      <div class="hs-ec-body">
        <div class="hs-ec-label">${r.label}</div>
        <div class="hs-ec-note">${r.note}</div>
      </div>
      <div class="hs-ec-pts">+${r.pts}</div>
    </div>`).join("");
}

function _redeemRulesHTML() {
  const rules = [
    { icon: "📊", label: "فتح دراسة جدوى مفصلة",         cost: 200  },
    { icon: "🎨", label: "فتح تصميم هوية بصرية كاملة",   cost: 200  },
    { icon: "🌙", label: "رتبة رائد أعمال فضي (خصم 10%)",cost: 1000 },
    { icon: "💰", label: "تحويل النقاط لمبلغ مالي",       cost: 5000, note: "الحد الأدنى للتحويل" },
  ];
  return rules.map(r => `
    <div class="hs-redeem-card">
      <div class="hs-rc-icon">${r.icon}</div>
      <div class="hs-rc-label">${r.label}</div>
      <div class="hs-rc-cost">${r.cost.toLocaleString("ar-SA")} نقطة</div>
      ${r.note ? `<div class="hs-rc-note">${r.note}</div>` : ""}
    </div>`).join("");
}

// ══════════════════════════════════════════════════════
//   نظام الإحالات — بطاقة تفاعلية
// ══════════════════════════════════════════════════════

function initReferralCard(containerId) {
  const el   = document.getElementById(containerId);
  if (!el) return;
  const user = _getSession();

  if (!user) {
    el.innerHTML = `
      <div class="hs-ref-card">
        <div class="hs-ref-header">🤝 برنامج الإحالات</div>
        <div class="hs-ref-desc">شارك رابطك — المُحيل يكسب <strong>100 نقطة</strong>، والمُحال يكسب <strong>25 نقطة إضافية</strong></div>
        <div class="hs-ref-golden">💎 إذا اشترى المُحال خدمة أو دورة: تحصل على <strong>200 نقطة ذهبية</strong> قابلة للتحويل لكاش</div>
        <a href="../auth.html?action=register" class="hs-btn-primary">سجّل للحصول على رابط الإحالة</a>
        ${_legalBadge()}
      </div>`;
    return;
  }

  const code    = user.referralCode || "---";
  const refLink = (typeof jenanReferral !== "undefined")
    ? jenanReferral.getLink(code)
    : `${window.location.origin}?ref=${code}`;

  let stats = { total: 0, earnedPts: 0 };
  try {
    if (typeof jenanReferral !== "undefined") stats = jenanReferral.getStats(user.id);
  } catch (e) {}

  el.innerHTML = `
    <div class="hs-ref-card">
      <div class="hs-ref-header">🤝 رابط الإحالة الخاص بك</div>
      <div class="hs-ref-stats">
        <div class="hs-rs-item"><div class="hs-rs-num">${stats.total}</div><div class="hs-rs-lbl">أشخاص انضموا</div></div>
        <div class="hs-rs-item"><div class="hs-rs-num">${stats.earnedPts.toLocaleString("ar-SA")}</div><div class="hs-rs-lbl">نقطة مكتسبة</div></div>
      </div>
      <div class="hs-ref-link-box">
        <input id="ref-link-input-${containerId}" type="text" value="${refLink}" readonly class="hs-ref-input" />
        <button class="hs-ref-copy-btn" onclick="copyReferralLink('${containerId}')">📋 نسخ</button>
      </div>
      <div class="hs-ref-share">
        <button class="hs-share-btn wa" onclick="shareRefWhatsApp('${refLink}')">💬 واتساب</button>
        <button class="hs-share-btn tw" onclick="shareRefTwitter('${refLink}')">🐦 تويتر</button>
        <button class="hs-share-btn snap" onclick="shareRefSnap('${refLink}')">👻 سناب</button>
      </div>
      <div class="hs-ref-rules">
        <div class="hs-ref-rule">🤝 كل انضمام = <strong>+100 نقطة</strong> لك + <strong>+25 نقطة</strong> للمُحال</div>
        <div class="hs-ref-rule">💎 كل شراء أو دورة للمُحال = <strong>+200 نقطة ذهبية</strong> قابلة للتحويل لكاش</div>
      </div>
      ${_legalBadge()}
    </div>`;
}

function copyReferralLink(containerId) {
  const input = document.getElementById(`ref-link-input-${containerId}`);
  if (input) {
    navigator.clipboard.writeText(input.value).then(() => _showPointsToast("تم نسخ رابط الإحالة ✅"));
    _awardPoints("social_share");
  }
}

function shareRefWhatsApp(link) {
  window.open(`https://wa.me/?text=${encodeURIComponent("انضم لمنصة جنان بيز واكسب 25 نقطة ترحيبية: " + link)}`, "_blank");
  _awardPoints("social_share");
}

function shareRefTwitter(link) {
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent("جنان بيز — منصة الأعمال الذكية 🚀")} &url=${encodeURIComponent(link)}`, "_blank");
  _awardPoints("social_share");
}

function shareRefSnap(link) {
  window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(link)}`, "_blank");
  _awardPoints("social_share");
}

// ══════════════════════════════════════════════════════
//   أدوات مساعدة
// ══════════════════════════════════════════════════════

function copyText(elId) {
  const el = document.getElementById(elId);
  if (el) {
    const text = el.innerText || el.textContent;
    navigator.clipboard.writeText(text).then(() => _showPointsToast("تم النسخ ✅"));
  }
}

function _flashError(inputId, msg) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.style.borderColor = "#dc2626";
  inp.placeholder       = msg;
  inp.focus();
  setTimeout(() => { inp.style.borderColor = ""; }, 2500);
}

// ══════════════════════════════════════════════════════
//   تهيئة تلقائية بالـ data-attributes
// ══════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-hook]").forEach(el => {
    const hook = el.dataset.hook;
    const id   = el.id;
    switch (hook) {
      case "exec-summary":  initExecSummary(id);   break;
      case "gov-compliance":initGovCompliance(id);  break;
      case "funding-radar": initFundingRadar(id);   break;
      case "points-center": initPointsCenter(id);   break;
      case "referral-card": initReferralCard(id);   break;
    }
  });
});
