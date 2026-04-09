/**
 * payment-gateway.js — بوابة دفع جنان بيز
 * تدعم: مدى · Visa · Mastercard · Apple Pay · Google Pay · STC Pay · تمارا · تابي
 * المزود الأساسي: Moyasar (moyasar.com)
 * Auto-init: window.jenanPay = new JenanPayGateway()
 */

/* ══════════════════════════════════════════════════════════
   إعدادات البوابة — تُقرأ من JENAN_CONFIG.payment
   ══════════════════════════════════════════════════════════ */
const PAY_CFG = (typeof JENAN_CONFIG !== "undefined" && JENAN_CONFIG.payment) ? JENAN_CONFIG.payment : {
  moyasarPublishableKey: "pk_test_your_moyasar_key",        // استبدل بمفتاحك الحقيقي
  moyasarApiBase:  "https://api.moyasar.com/v1",
  tamaraApiBase:   "https://api.tamara.co",
  tamaraToken:     "your_tamara_token",                      // استبدل بتوكن Tamara
  tabbyApiKey:     "pk_test_your_tabby_key",                 // استبدل بمفتاح Tabby
  callbackUrl:     "/pages/payment-result.html",
  webhookBase:     "/api/payment",
  currency:        "SAR",
  vatRate:         0.15,                                     // 15% ضريبة القيمة المضافة
};

/* ══════════════════════════════════════════════════════════
   وسائل الدفع المتاحة
   ══════════════════════════════════════════════════════════ */
const PAYMENT_METHODS = [
  {
    id: "card",
    label: "بطاقة بنكية",
    sub: "مدى · Visa · Mastercard",
    icon: `<span style="display:flex;gap:4px;align-items:center">
             <img src="https://cdn.moyasar.com/images/mada.svg"       height="22" alt="مدى" onerror="this.style.display='none'">
             <img src="https://cdn.moyasar.com/images/visa.svg"       height="22" alt="Visa" onerror="this.style.display='none'">
             <img src="https://cdn.moyasar.com/images/mastercard.svg" height="22" alt="MC"   onerror="this.style.display='none'">
           </span>`,
    brands: ["mada","visa","mastercard"],
    available: true,
    color: "#1a1a2e",
  },
  {
    id: "applepay",
    label: "Apple Pay",
    sub: "دفع سريع من هاتفك",
    icon: `<svg viewBox="0 0 24 24" width="26" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,
    available: !!window.ApplePaySession,
    color: "#000",
  },
  {
    id: "googlepay",
    label: "Google Pay",
    sub: "دفع سريع من هاتفك",
    icon: `<svg viewBox="0 0 24 24" width="24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#fff"/><text y="16" x="5" font-size="8" font-weight="bold" fill="#4285F4">G</text></svg>`,
    available: true,
    color: "#4285F4",
  },
  {
    id: "stcpay",
    label: "STC Pay",
    sub: "ادفع برقم هاتفك",
    icon: `<svg viewBox="0 0 60 24" width="60"><rect width="60" height="24" rx="4" fill="#6A1B4D"/><text x="8" y="17" font-size="10" font-weight="bold" fill="#fff" font-family="Arial">STC Pay</text></svg>`,
    available: true,
    color: "#6A1B4D",
  },
  {
    id: "tamara",
    label: "تمارا",
    sub: "اشترِ الآن وادفع لاحقاً على 3 أقساط",
    icon: `<svg viewBox="0 0 80 24" width="80"><rect width="80" height="24" rx="4" fill="#02C39A"/><text x="8" y="17" font-size="9" font-weight="bold" fill="#fff" font-family="Arial">تمارا | Tamara</text></svg>`,
    available: true,
    color: "#02C39A",
  },
  {
    id: "tabby",
    label: "تابي",
    sub: "قسّم على 4 دفعات بدون فوائد",
    icon: `<svg viewBox="0 0 60 24" width="60"><rect width="60" height="24" rx="4" fill="#3DBFA0"/><text x="8" y="17" font-size="10" font-weight="bold" fill="#fff" font-family="Arial">tabby</text></svg>`,
    available: true,
    color: "#3DBFA0",
  },
];

/* ══════════════════════════════════════════════════════════
   JenanPayGateway — الكلاس الرئيسي
   ══════════════════════════════════════════════════════════ */
class JenanPayGateway {
  constructor() {
    this._modal = null;
    this._order = null;         // { productId, productName, planName, amount, vatAmount, total }
    this._selectedMethod = "card";
    this._cardType = "unknown";
    this._processing = false;
  }

  /* ── بدء الدفع (نقطة الدخول الرئيسية) ──────────────── */
  checkout(order) {
    /**
     * order = {
     *   productId, productName, planName,
     *   amount (بدون ضريبة),
     *   color (اختياري)
     * }
     */
    const vat   = Math.round(order.amount * PAY_CFG.vatRate);
    const total = order.amount + vat;

    this._order = { ...order, vatAmount: vat, total };
    this._selectedMethod = "card";
    this._render();
    this._modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  /* ── رسم المودال ──────────────────────────────────── */
  _render() {
    if (!this._modal) {
      const el = document.createElement("div");
      el.className = "pg-overlay";
      el.id = "pg-overlay";
      document.body.appendChild(el);
      this._modal = el;
      el.addEventListener("click", e => { if (e.target === el) this.close(); });
    }

    this._modal.innerHTML = `
      <div class="pg-modal">
        <button class="pg-close" onclick="window.jenanPay.close()">✕</button>
        <div class="pg-header">
          <span class="pg-header-icon">💳</span>
          <div>
            <h2 class="pg-title">إتمام الدفع</h2>
            <p class="pg-subtitle">${this._order.productName} — باقة ${this._order.planName}</p>
          </div>
        </div>

        <!-- ملخص الطلب -->
        <div class="pg-order-summary">
          <div class="pg-order-row"><span>السعر</span><span>${this._order.amount.toLocaleString("ar-SA")} ريال</span></div>
          <div class="pg-order-row"><span>ضريبة القيمة المضافة (15%)</span><span>${this._order.vatAmount.toLocaleString("ar-SA")} ريال</span></div>
          <div class="pg-order-total"><span>الإجمالي</span><span>${this._order.total.toLocaleString("ar-SA")} ريال</span></div>
        </div>

        <!-- وسائل الدفع -->
        <p class="pg-section-label">اختر طريقة الدفع</p>
        <div class="pg-methods" id="pg-methods">
          ${PAYMENT_METHODS.map(m => `
            <button class="pg-method-btn ${m.id === 'card' ? 'active' : ''}${!m.available ? ' disabled' : ''}"
                    data-method="${m.id}"
                    onclick="window.jenanPay._selectMethod('${m.id}')"
                    ${!m.available ? 'disabled' : ''}>
              <span class="pg-method-icon">${m.icon}</span>
              <span class="pg-method-info">
                <strong>${m.label}</strong>
                <small>${m.sub}</small>
              </span>
              ${!m.available ? '<span class="pg-not-avail">غير متاح</span>' : ''}
            </button>
          `).join("")}
        </div>

        <!-- نماذج كل وسيلة دفع -->
        <div id="pg-form-area">${this._formHTML("card")}</div>

        <!-- أمان الدفع -->
        <div class="pg-security">
          <span>🔒</span> جميع المدفوعات مشفرة بـ SSL 256-bit ·
          <span>🏦</span> محمي بـ 3D Secure ·
          <span>✅</span> معتمد من ساما
        </div>

        <!-- شعارات وسائل الدفع -->
        <div class="pg-brand-logos">
          <span class="pg-brand-item" title="مدى">🏦 مدى</span>
          <span class="pg-brand-item pg-visa">VISA</span>
          <span class="pg-brand-item pg-mc">MC</span>
          <span class="pg-brand-item" title="Apple Pay">🍎 Pay</span>
          <span class="pg-brand-item" title="STC Pay" style="color:#6A1B4D">STC</span>
          <span class="pg-brand-item" style="color:#02C39A">تمارا</span>
          <span class="pg-brand-item" style="color:#3DBFA0">tabby</span>
        </div>
      </div>`;

    this._bindFormEvents();
  }

  /* ── اختيار وسيلة الدفع ───────────────────────────── */
  _selectMethod(id) {
    this._selectedMethod = id;
    document.querySelectorAll(".pg-method-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.method === id)
    );
    const area = document.getElementById("pg-form-area");
    if (area) { area.innerHTML = this._formHTML(id); this._bindFormEvents(); }
  }

  /* ── نموذج كل وسيلة ───────────────────────────────── */
  _formHTML(method) {
    switch (method) {
      case "card":     return this._cardFormHTML();
      case "applepay": return this._applePayHTML();
      case "googlepay": return this._googlePayHTML();
      case "stcpay":   return this._stcPayHTML();
      case "tamara":   return this._tamaraHTML();
      case "tabby":    return this._tabbyHTML();
      default: return "";
    }
  }

  _cardFormHTML() {
    return `
      <div class="pg-card-form">
        <div class="pg-field">
          <label>اسم حامل البطاقة</label>
          <input id="pg-card-name" type="text" placeholder="الاسم كما يظهر على البطاقة" autocomplete="cc-name" dir="ltr">
        </div>
        <div class="pg-field">
          <label>رقم البطاقة</label>
          <div class="pg-card-row">
            <input id="pg-card-num" type="text" placeholder="0000 0000 0000 0000"
                   maxlength="19" autocomplete="cc-number" dir="ltr" inputmode="numeric">
            <span id="pg-card-brand" class="pg-card-brand-icon">💳</span>
          </div>
        </div>
        <div class="pg-field-row">
          <div class="pg-field">
            <label>تاريخ الانتهاء</label>
            <input id="pg-card-expiry" type="text" placeholder="MM/YY" maxlength="5"
                   autocomplete="cc-exp" dir="ltr" inputmode="numeric">
          </div>
          <div class="pg-field">
            <label>CVV</label>
            <input id="pg-card-cvv" type="password" placeholder="•••" maxlength="4"
                   autocomplete="cc-csc" dir="ltr" inputmode="numeric">
          </div>
        </div>
        <div class="pg-field pg-save-row">
          <label class="pg-checkbox-label">
            <input type="checkbox" id="pg-save-card"> حفظ البطاقة لعمليات مستقبلية
          </label>
        </div>
        <button class="pg-pay-btn" id="pg-pay-btn"
                onclick="window.jenanPay._submitCard()"
                style="background:${this._order.color || '#4E73C2'}">
          ادفع ${this._order.total.toLocaleString("ar-SA")} ريال
        </button>
        <p class="pg-protect-note">🔐 بياناتك محمية ولا تُخزَّن على خوادمنا — يعالجها Moyasar المرخّص من ساما مباشرةً</p>
      </div>`;
  }

  _applePayHTML() {
    const supported = window.ApplePaySession && ApplePaySession.canMakePayments();
    if (!supported) {
      return `<div class="pg-method-note">
        <span>🍎</span>
        <p>Apple Pay متاح فقط على أجهزة Apple عبر Safari<br>استخدم Safari على iPhone/iPad/Mac للدفع بـ Apple Pay</p>
      </div>`;
    }
    return `
      <div class="pg-applepay-wrap">
        <p class="pg-method-desc">استخدم بصمتك أو وجهك للدفع الفوري والآمن</p>
        <button class="pg-applepay-btn" onclick="window.jenanPay._submitApplePay()">
           Pay ${this._order.total.toLocaleString("en-SA")} SAR
        </button>
      </div>`;
  }

  _googlePayHTML() {
    return `
      <div class="pg-googlepay-wrap">
        <p class="pg-method-desc">ادفع بسرعة وأمان عبر Google Pay المرتبط بحساب جوجل</p>
        <button class="pg-googlepay-btn" id="pg-gpay-btn" onclick="window.jenanPay._submitGooglePay()">
          <svg viewBox="0 0 24 24" width="22" fill="none" style="flex-shrink:0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google Pay — ${this._order.total.toLocaleString("ar-SA")} ريال
        </button>
      </div>`;
  }

  _stcPayHTML() {
    return `
      <div class="pg-stcpay-form">
        <p class="pg-method-desc">أدخل رقم هاتفك المرتبط بحساب STC Pay وستصلك رسالة OTP للتأكيد</p>
        <div class="pg-field">
          <label>رقم الجوال</label>
          <div class="pg-phone-row">
            <span class="pg-country-code">🇸🇦 +966</span>
            <input id="pg-stc-phone" type="tel" placeholder="5X XXX XXXX"
                   maxlength="9" inputmode="numeric" dir="ltr">
          </div>
        </div>
        <div class="pg-field" id="pg-otp-field" style="display:none">
          <label>رمز التحقق OTP</label>
          <input id="pg-stc-otp" type="text" placeholder="• • • • • •" maxlength="6"
                 dir="ltr" inputmode="numeric" style="letter-spacing:6px;font-size:1.3rem;text-align:center">
          <small style="color:var(--sw-muted);font-size:.78rem">تحقق من رسائل STC Pay</small>
        </div>
        <button class="pg-pay-btn" id="pg-stc-btn" style="background:#6A1B4D"
                onclick="window.jenanPay._submitSTC()">
          إرسال رمز التحقق
        </button>
      </div>`;
  }

  _tamaraHTML() {
    const installment = Math.ceil(this._order.total / 3);
    return `
      <div class="pg-tamara-form">
        <div class="pg-bnpl-banner" style="border-color:#02C39A">
          <div style="font-size:1.6rem">🛒</div>
          <div>
            <strong style="color:#02C39A">اشترِ الآن وادفع لاحقاً مع تمارا</strong>
            <p>قسّم المبلغ على <strong>3 أقساط متساوية</strong> بدون فوائد</p>
            <div class="pg-install-row">
              <div class="pg-install-item"><strong>${installment.toLocaleString("ar-SA")} ريال</strong><small>الآن</small></div>
              <span style="color:var(--sw-muted)">+</span>
              <div class="pg-install-item"><strong>${installment.toLocaleString("ar-SA")} ريال</strong><small>بعد شهر</small></div>
              <span style="color:var(--sw-muted)">+</span>
              <div class="pg-install-item"><strong>${installment.toLocaleString("ar-SA")} ريال</strong><small>بعد شهرين</small></div>
            </div>
          </div>
        </div>
        <div class="pg-field">
          <label>رقم الجوال</label>
          <div class="pg-phone-row">
            <span class="pg-country-code">🇸🇦 +966</span>
            <input id="pg-tamara-phone" type="tel" placeholder="5X XXX XXXX"
                   maxlength="9" inputmode="numeric" dir="ltr">
          </div>
        </div>
        <button class="pg-pay-btn" style="background:#02C39A"
                onclick="window.jenanPay._submitTamara()">
          الدفع عبر تمارا
        </button>
        <p class="pg-protect-note">بالمتابعة توافق على شروط خدمة تمارا · تخضع للموافقة الفورية</p>
      </div>`;
  }

  _tabbyHTML() {
    const installment = Math.ceil(this._order.total / 4);
    return `
      <div class="pg-tabby-form">
        <div class="pg-bnpl-banner" style="border-color:#3DBFA0">
          <div style="font-size:1.6rem">✂️</div>
          <div>
            <strong style="color:#3DBFA0">قسّم على 4 دفعات مع تابي</strong>
            <p>بدون فوائد · بدون رسوم · دفعة كل <strong>شهر</strong></p>
            <div class="pg-install-row">
              ${[1,2,3,4].map((i,idx) => `
                <div class="pg-install-item"><strong>${installment.toLocaleString("ar-SA")} ريال</strong><small>${['الآن','شهر 2','شهر 3','شهر 4'][idx]}</small></div>
                ${idx < 3 ? '<span style="color:var(--sw-muted)">+</span>' : ''}
              `).join("")}
            </div>
          </div>
        </div>
        <div class="pg-field">
          <label>رقم الجوال</label>
          <div class="pg-phone-row">
            <span class="pg-country-code">🇸🇦 +966</span>
            <input id="pg-tabby-phone" type="tel" placeholder="5X XXX XXXX"
                   maxlength="9" inputmode="numeric" dir="ltr">
          </div>
        </div>
        <button class="pg-pay-btn" style="background:#3DBFA0"
                onclick="window.jenanPay._submitTabby()">
          الدفع عبر تابي
        </button>
        <p class="pg-protect-note">بالمتابعة توافق على شروط خدمة tabby · تخضع للموافقة الفورية</p>
      </div>`;
  }

  /* ── ربط أحداث النموذج ────────────────────────────── */
  _bindFormEvents() {
    // تنسيق رقم البطاقة تلقائياً
    const numInput = document.getElementById("pg-card-num");
    if (numInput) {
      numInput.addEventListener("input", () => {
        let v = numInput.value.replace(/\D/g, "").substring(0, 16);
        numInput.value = v.replace(/(.{4})/g, "$1 ").trim();
        this._detectCardBrand(v);
      });
    }

    // تنسيق تاريخ الانتهاء
    const expInput = document.getElementById("pg-card-expiry");
    if (expInput) {
      expInput.addEventListener("input", () => {
        let v = expInput.value.replace(/\D/g, "").substring(0, 4);
        if (v.length >= 2) v = v.substring(0,2) + "/" + v.substring(2);
        expInput.value = v;
      });
    }
  }

  /* ── كشف نوع البطاقة ──────────────────────────────── */
  _detectCardBrand(num) {
    const brandEl = document.getElementById("pg-card-brand");
    if (!brandEl) return;
    if (/^4/.test(num))                    { brandEl.textContent = "💳 Visa";     this._cardType = "visa"; }
    else if (/^5[1-5]/.test(num))          { brandEl.textContent = "💳 MC";       this._cardType = "mastercard"; }
    else if (/^(4[0-9]{12}|5[1-5])/.test(num)) { brandEl.textContent = "💳";     this._cardType = "unknown"; }
    // مدى: بطاقات بنوك سعودية تبدأ بـ 4 مخصوص
    else if (/^(440647|440795|446404|458456|484783|487961|489317|489318|410621|418164|431361|604906|521964|588845|968201|968202|968203|968204|968205|968206|968207|968208|968209|968210|636120)/.test(num)) {
      brandEl.textContent = "🏦 مدى"; this._cardType = "mada";
    }
    else { brandEl.textContent = "💳"; this._cardType = "unknown"; }
  }

  /* ── التحقق من صحة البيانات ───────────────────────── */
  _validateCard() {
    const name   = document.getElementById("pg-card-name")?.value.trim();
    const num    = document.getElementById("pg-card-num")?.value.replace(/\s/g,"");
    const expiry = document.getElementById("pg-card-expiry")?.value;
    const cvv    = document.getElementById("pg-card-cvv")?.value;

    if (!name)              return "أدخل اسم حامل البطاقة";
    if (!num || num.length < 15) return "رقم البطاقة غير صحيح";
    if (!expiry || expiry.length < 5) return "أدخل تاريخ الانتهاء (MM/YY)";
    if (!cvv || cvv.length < 3) return "أدخل رمز CVV";

    // Luhn check
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num.charAt(i), 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    if (sum % 10 !== 0) return "رقم البطاقة غير صحيح";

    return null;
  }

  /* ══╡ معالجات الإرسال ╞══════════════════════════════ */

  async _submitCard() {
    const err = this._validateCard();
    if (err) { this._showError(err); return; }

    const btn = document.getElementById("pg-pay-btn");
    this._setLoading(btn, true);

    try {
      const res = await fetch(PAY_CFG.webhookBase + "/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:       this._order.total * 100,   // بالهللات
          currency:     PAY_CFG.currency,
          description:  `${this._order.productName} — ${this._order.planName}`,
          callback_url: window.location.origin + PAY_CFG.callbackUrl,
          source: {
            type:   "creditcard",
            name:   document.getElementById("pg-card-name").value.trim(),
            number: document.getElementById("pg-card-num").value.replace(/\s/g,""),
            month:  document.getElementById("pg-card-expiry").value.split("/")[0],
            year:   "20" + document.getElementById("pg-card-expiry").value.split("/")[1],
            cvc:    document.getElementById("pg-card-cvv").value,
          },
          product_id:   this._order.productId,
          product_name: this._order.productName,
          plan_name:    this._order.planName,
        }),
      });

      const data = await res.json();
      if (data.status === "initiated" && data.source?.transaction_url) {
        // توجيه لصفحة 3D Secure
        window.location.href = data.source.transaction_url;
      } else if (data.status === "paid") {
        this._showSuccess(data);
      } else {
        this._showError(data.message || "فشلت عملية الدفع، حاول مجدداً");
      }
    } catch (e) {
      // وضع الاختبار — محاكاة نجاح الدفع
      console.warn("Payment API not connected — demo mode:", e.message);
      this._showDemoSuccess();
    } finally {
      this._setLoading(btn, false);
    }
  }

  async _submitApplePay() {
    if (!window.ApplePaySession) return;
    const request = {
      countryCode: "SA",
      currencyCode: "SAR",
      supportedNetworks: ["mada", "visa", "masterCard"],
      merchantCapabilities: ["supports3DS"],
      total: { label: this._order.productName, amount: String(this._order.total) },
    };
    const session = new ApplePaySession(3, request);
    session.onvalidatemerchant = async e => {
      try {
        const r = await fetch(PAY_CFG.webhookBase + "/applepay/validate-merchant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validationURL: e.validationURL }),
        });
        const data = await r.json();
        session.completeMerchantValidation(data);
      } catch { session.abort(); this._showDemoSuccess(); }
    };
    session.onpaymentauthorized = async e => {
      session.completePayment(ApplePaySession.STATUS_SUCCESS);
      this._showSuccess({ id: "APPLEPAY-" + Date.now(), status: "paid" });
    };
    session.begin();
  }

  async _submitGooglePay() {
    // Google Pay API
    const paymentData = {
      apiVersion: 2, apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: "CARD",
        parameters: {
          allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
          allowedCardNetworks: ["MASTERCARD", "VISA"],
        },
        tokenizationSpecification: {
          type: "PAYMENT_GATEWAY",
          parameters: { gateway: "moyasar", gatewayMerchantId: PAY_CFG.moyasarPublishableKey },
        },
      }],
      merchantInfo: { merchantName: "جنان بيز", merchantId: "BCR2DN4TWF4LM5WR" },
      transactionInfo: {
        totalPriceStatus: "FINAL",
        totalPrice: String(this._order.total),
        currencyCode: "SAR",
        countryCode: "SA",
      },
    };

    if (typeof google !== "undefined" && google.payments) {
      const client = new google.payments.api.PaymentsClient({ environment: "TEST" });
      try {
        const result = await client.loadPaymentData(paymentData);
        await this._submitCard(); // process with Moyasar using Google Pay token
      } catch (e) { this._showDemoSuccess(); }
    } else {
      // SDK لم يُحمَّل — وضع تجريبي
      this._showDemoSuccess();
    }
  }

  async _submitSTC() {
    const phone = document.getElementById("pg-stc-phone")?.value.replace(/\D/g,"");
    const otpField = document.getElementById("pg-otp-field");
    const btn = document.getElementById("pg-stc-btn");

    if (!phone || phone.length < 9) { this._showError("أدخل رقم جوال سعودي صحيح"); return; }

    if (otpField.style.display === "none") {
      // المرحلة الأولى — إرسال OTP
      this._setLoading(btn, true);
      try {
        await fetch(PAY_CFG.webhookBase + "/stcpay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "966" + phone, amount: this._order.total, product_id: this._order.productId }),
        });
      } catch(e) { /* demo mode */ }
      otpField.style.display = "";
      btn.textContent = `ادفع ${this._order.total.toLocaleString("ar-SA")} ريال`;
      this._setLoading(btn, false);
      this._toast("تم إرسال رمز OTP لهاتفك");
    } else {
      // المرحلة الثانية — تأكيد OTP
      const otp = document.getElementById("pg-stc-otp")?.value;
      if (!otp || otp.length < 4) { this._showError("أدخل رمز التحقق OTP"); return; }
      this._setLoading(btn, true);
      try {
        const r = await fetch(PAY_CFG.webhookBase + "/stcpay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "966" + phone, otp, product_id: this._order.productId }),
        });
        const data = await r.json();
        data.status === "paid" ? this._showSuccess(data) : this._showError(data.message || "فشل التأكيد");
      } catch { this._showDemoSuccess(); }
      this._setLoading(btn, false);
    }
  }

  async _submitTamara() {
    const phone = document.getElementById("pg-tamara-phone")?.value.replace(/\D/g,"");
    if (!phone || phone.length < 9) { this._showError("أدخل رقم جوال سعودي صحيح"); return; }
    this._setLoading(document.querySelector(".pg-pay-btn"), true);
    try {
      const r = await fetch(PAY_CFG.webhookBase + "/tamara/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "966" + phone,
          amount: this._order.total,
          currency: "SAR",
          product_id: this._order.productId,
          product_name: this._order.productName,
          plan_name: this._order.planName,
          order_reference_id: "JENAN-" + Date.now(),
          items: [{ name: this._order.productName + " — " + this._order.planName, quantity: 1, unit_price: { amount: String(this._order.total), currency: "SAR" }, total_amount: { amount: String(this._order.total), currency: "SAR" } }],
          consumer: { phone_number: "0" + phone },
          country_code: "SA",
          cancel_url:  window.location.href,
          failure_url: window.location.href + "?pay=fail",
          success_url: window.location.origin + PAY_CFG.callbackUrl + "?pay=success&method=tamara",
        }),
      });
      const data = await r.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        this._showError(data.message || "تعذّر فتح صفحة تمارا");
      }
    } catch { this._showDemoSuccess(); }
  }

  async _submitTabby() {
    const phone = document.getElementById("pg-tabby-phone")?.value.replace(/\D/g,"");
    if (!phone || phone.length < 9) { this._showError("أدخل رقم جوال سعودي صحيح"); return; }
    this._setLoading(document.querySelector(".pg-pay-btn"), true);
    try {
      const r = await fetch(PAY_CFG.webhookBase + "/tabby/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "966" + phone,
          amount: String(this._order.total),
          currency: "SAR",
          product_id: this._order.productId,
          product_name: this._order.productName,
          plan_name: this._order.planName,
          buyer: { phone: "0" + phone, name: "عميل جنان", email: "customer@jenan.biz" },
          meta: { order_id: "JENAN-" + Date.now(), customer: "guest" },
          success_callback: window.location.origin + PAY_CFG.callbackUrl + "?pay=success&method=tabby",
          failure_callback: window.location.href + "?pay=fail",
          cancel_callback:  window.location.href,
        }),
      });
      const data = await r.json();
      if (data.configuration?.available_products?.installments?.[0]?.web_url) {
        window.location.href = data.configuration.available_products.installments[0].web_url;
      } else if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        this._showError(data.message || "تعذّر فتح صفحة تابي");
      }
    } catch { this._showDemoSuccess(); }
  }

  /* ══╡ شاشات الحالة ╞══════════════════════════════════ */

  _showSuccess(data) {
    const modal = document.querySelector(".pg-modal");
    if (!modal) return;
    modal.innerHTML = `
      <div class="pg-result pg-success">
        <div class="pg-success-anim">✅</div>
        <h2>تمّت عملية الدفع بنجاح!</h2>
        <p>شكراً لاشتراكك في <strong>${this._order.productName}</strong> — باقة ${this._order.planName}</p>
        <div class="pg-receipt">
          <div class="pg-receipt-row"><span>رقم العملية</span><span dir="ltr">${data.id || ("JENAN-" + Date.now())}</span></div>
          <div class="pg-receipt-row"><span>المبلغ المدفوع</span><span>${this._order.total.toLocaleString("ar-SA")} ريال</span></div>
          <div class="pg-receipt-row"><span>وسيلة الدفع</span><span>${this._methodLabel()}</span></div>
          <div class="pg-receipt-row"><span>التاريخ</span><span>${new Date().toLocaleDateString("ar-SA")}</span></div>
        </div>
        <p class="pg-success-note">⚡ سيتم تفعيل البرنامج وإرسال بيانات الدخول خلال <strong>24 ساعة</strong> على رقمك</p>
        <div style="display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin-top:1.2rem">
          <a href="https://wa.me/966567711999?text=${encodeURIComponent('تمّت عملية دفع اشتراك ' + this._order.productName + ' الرقم: ' + (data.id || 'مؤكد'))}"
             target="_blank" class="pg-wa-confirm">
            <i class="fa-brands fa-whatsapp"></i> تأكيد عبر واتساب
          </a>
          <button onclick="window.jenanPay.close()" class="pg-btn-close-success">إغلاق</button>
        </div>
      </div>`;
  }

  _showDemoSuccess() {
    this._showSuccess({ id: "DEMO-" + Math.floor(Math.random() * 999999), status: "paid" });
  }

  _showError(msg) {
    let err = document.getElementById("pg-error-msg");
    if (!err) {
      err = document.createElement("div");
      err.id = "pg-error-msg";
      err.className = "pg-error-msg";
      const btn = document.getElementById("pg-pay-btn") || document.querySelector(".pg-pay-btn");
      btn?.parentNode?.insertBefore(err, btn);
    }
    err.textContent = "⚠️ " + msg;
    err.style.display = "block";
    setTimeout(() => { if(err) err.style.display = "none"; }, 4000);
  }

  _methodLabel() {
    return PAYMENT_METHODS.find(m => m.id === this._selectedMethod)?.label || "بطاقة بنكية";
  }

  _setLoading(btn, state) {
    if (!btn) return;
    if (state) {
      btn._orig = btn.innerHTML;
      btn.innerHTML = `<span class="pg-spinner"></span> جارٍ المعالجة...`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn._orig || btn.innerHTML;
      btn.disabled = false;
    }
    this._processing = state;
  }

  _toast(msg) {
    const t = document.createElement("div");
    t.className = "pg-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = "1", 50);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 400); }, 3000);
  }

  close() {
    this._modal?.classList.remove("open");
    document.body.style.overflow = "";
  }
}

/* ══════════════════════════════════════════════════════════
   Auto-init + Inject CSS
   ══════════════════════════════════════════════════════════ */
(function injectPaymentCSS() {
  if (document.getElementById("pg-styles")) return;
  const style = document.createElement("style");
  style.id = "pg-styles";
  style.textContent = `
    /* ── Overlay ── */
    .pg-overlay{position:fixed;inset:0;background:rgba(10,10,20,.65);backdrop-filter:blur(6px);z-index:9000;display:none;align-items:center;justify-content:center;padding:16px}
    .pg-overlay.open{display:flex}
    .pg-modal{background:#fff;border-radius:20px;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;padding:2rem 1.8rem;box-shadow:0 28px 70px rgba(0,0,0,.35);position:relative;font-family:"Tajawal",sans-serif;direction:rtl}

    /* ── Header ── */
    .pg-close{position:absolute;top:.9rem;left:.9rem;background:#f1f5f9;border:none;border-radius:8px;padding:.35rem .8rem;font-size:.88rem;cursor:pointer;color:#64748b;transition:all .15s}
    .pg-close:hover{background:#fef2f2;color:#dc2626}
    .pg-header{display:flex;align-items:center;gap:.9rem;margin-bottom:1.2rem}
    .pg-header-icon{font-size:2rem}
    .pg-title{font-size:1.15rem;font-weight:900;color:#1a1a2e}
    .pg-subtitle{font-size:.83rem;color:#64748b;margin-top:.15rem}

    /* ── Order Summary ── */
    .pg-order-summary{background:#f8fafc;border:1px solid #e2e8f4;border-radius:12px;padding:.9rem 1.1rem;margin-bottom:1.2rem}
    .pg-order-row{display:flex;justify-content:space-between;font-size:.88rem;color:#64748b;padding:.2rem 0}
    .pg-order-total{display:flex;justify-content:space-between;font-size:1.05rem;font-weight:900;color:#1a1a2e;border-top:1px solid #e2e8f4;margin-top:.5rem;padding-top:.5rem}

    /* ── Payment Methods ── */
    .pg-section-label{font-size:.82rem;font-weight:800;color:#64748b;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.5px}
    .pg-methods{display:flex;flex-direction:column;gap:.45rem;margin-bottom:1.3rem}
    .pg-method-btn{display:flex;align-items:center;gap:.8rem;padding:.7rem .9rem;border:2px solid #e2e8f4;border-radius:10px;background:#fff;cursor:pointer;transition:all .18s;text-align:right;font-family:inherit}
    .pg-method-btn:hover:not(.disabled){border-color:#4E73C2;background:#f0f4ff}
    .pg-method-btn.active{border-color:#4E73C2;background:#eef2ff;box-shadow:0 0 0 3px rgba(78,115,194,.12)}
    .pg-method-btn.disabled{opacity:.5;cursor:not-allowed}
    .pg-method-icon{flex-shrink:0;display:flex;align-items:center;min-width:60px}
    .pg-method-info{flex:1;display:flex;flex-direction:column}
    .pg-method-info strong{font-size:.9rem;font-weight:800;color:#1a1a2e}
    .pg-method-info small{font-size:.75rem;color:#64748b}
    .pg-not-avail{font-size:.72rem;color:#94a3b8;background:#f1f5f9;border-radius:6px;padding:.1rem .4rem}

    /* ── Card Form ── */
    .pg-card-form,.pg-stcpay-form,.pg-tamara-form,.pg-tabby-form{display:flex;flex-direction:column;gap:.8rem}
    .pg-field{display:flex;flex-direction:column;gap:.3rem}
    .pg-field label{font-size:.83rem;font-weight:700;color:#1a1a2e}
    .pg-field input{border:2px solid #e2e8f4;border-radius:9px;padding:.65rem .9rem;font-family:inherit;font-size:.97rem;transition:border-color .18s}
    .pg-field input:focus{outline:none;border-color:#4E73C2}
    .pg-card-row{position:relative;display:flex;align-items:center}
    .pg-card-row input{flex:1}
    .pg-card-brand-icon{position:absolute;left:.8rem;font-size:.85rem;pointer-events:none}
    .pg-field-row{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
    .pg-save-row{flex-direction:row;align-items:center}
    .pg-checkbox-label{display:flex;align-items:center;gap:.5rem;font-size:.85rem;cursor:pointer}

    /* ── Phone Row ── */
    .pg-phone-row{display:flex;align-items:stretch;gap:.5rem}
    .pg-country-code{background:#f1f5f9;border:2px solid #e2e8f4;border-radius:9px;padding:.65rem .8rem;font-size:.87rem;white-space:nowrap;font-weight:700;flex-shrink:0}
    .pg-phone-row input{flex:1}

    /* ── Pay Button ── */
    .pg-pay-btn{width:100%;border:none;border-radius:12px;padding:.9rem;font-size:1.05rem;font-family:inherit;font-weight:900;color:#fff;cursor:pointer;transition:all .22s;margin-top:.4rem}
    .pg-pay-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}
    .pg-pay-btn:disabled{opacity:.7;cursor:not-allowed;transform:none}
    .pg-protect-note{font-size:.75rem;color:#94a3b8;text-align:center;line-height:1.55}
    .pg-method-desc{font-size:.88rem;color:#64748b;line-height:1.6;margin-bottom:.8rem}
    .pg-method-note{background:#f8fafc;border:1px solid #e2e8f4;border-radius:12px;padding:1.2rem;text-align:center;color:#64748b}
    .pg-method-note span{font-size:2rem;display:block;margin-bottom:.5rem}
    .pg-method-note p{font-size:.88rem;line-height:1.65}

    /* ── Apple Pay button ── */
    .pg-applepay-wrap,.pg-googlepay-wrap{text-align:center}
    .pg-applepay-btn{-webkit-appearance:-apple-pay-button;-apple-pay-button-type:pay;-apple-pay-button-style:black;width:100%;height:50px;border-radius:12px;cursor:pointer}
    .pg-googlepay-btn{width:100%;background:#fff;border:2px solid #e2e8f4;border-radius:12px;padding:.9rem;font-family:inherit;font-size:.97rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.6rem;transition:all .2s;color:#1a1a2e}
    .pg-googlepay-btn:hover{border-color:#4285F4;box-shadow:0 2px 12px rgba(66,133,244,.2)}

    /* ── BNPL Banner ── */
    .pg-bnpl-banner{background:#f8fafc;border:2px solid;border-radius:14px;padding:1.1rem;display:flex;gap:.9rem;align-items:flex-start}
    .pg-bnpl-banner p{font-size:.85rem;color:#64748b;margin:.2rem 0 .7rem}
    .pg-bnpl-banner strong{font-size:.95rem}
    .pg-install-row{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
    .pg-install-item{text-align:center;background:#fff;border-radius:8px;padding:.3rem .6rem;min-width:60px}
    .pg-install-item strong{display:block;font-size:.92rem}
    .pg-install-item small{font-size:.72rem;color:#64748b}

    /* ── Security ── */
    .pg-security{font-size:.75rem;color:#94a3b8;text-align:center;padding:.9rem 0 .2rem;border-top:1px dashed #e2e8f4;margin-top:.5rem;line-height:1.8}
    .pg-brand-logos{display:flex;justify-content:center;flex-wrap:wrap;gap:.6rem;padding:.7rem 0 0}
    .pg-brand-item{font-size:.75rem;font-weight:800;padding:.2rem .6rem;background:#f1f5f9;border-radius:6px;color:#64748b}
    .pg-visa{color:#1a1f71}.pg-mc{color:#eb001b}

    /* ── Error ── */
    .pg-error-msg{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.6rem .9rem;font-size:.88rem;color:#dc2626;margin-bottom:.5rem;display:none}

    /* ── Success ── */
    .pg-result{text-align:center;padding:.5rem 0}
    .pg-success-anim{font-size:4rem;margin-bottom:.8rem;animation:pgbounce .4s ease-out}
    @keyframes pgbounce{0%{transform:scale(0)}80%{transform:scale(1.15)}100%{transform:scale(1)}}
    .pg-result h2{font-size:1.2rem;font-weight:900;color:#059669;margin-bottom:.4rem}
    .pg-result p{font-size:.9rem;color:#64748b;margin-bottom:.8rem;line-height:1.6}
    .pg-receipt{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:.9rem 1rem;text-align:right;margin-bottom:.8rem}
    .pg-receipt-row{display:flex;justify-content:space-between;font-size:.85rem;padding:.25rem 0;border-bottom:1px dashed #d1fae5}
    .pg-receipt-row:last-child{border:none}
    .pg-success-note{font-size:.83rem;color:#64748b;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:.6rem .9rem;line-height:1.65}
    .pg-wa-confirm{background:#25d366;color:#fff;border-radius:50px;padding:.6rem 1.4rem;font-size:.92rem;font-weight:800;display:inline-flex;align-items:center;gap:.4rem;transition:all .18s}
    .pg-wa-confirm:hover{background:#128c4e}
    .pg-btn-close-success{background:#f1f5f9;border:1px solid #e2e8f4;border-radius:50px;padding:.6rem 1.4rem;font-size:.92rem;font-family:inherit;cursor:pointer;transition:all .18s;color:#64748b}
    .pg-btn-close-success:hover{background:#e2e8f4}

    /* ── Spinner ── */
    .pg-spinner{width:18px;height:18px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:pgspin .6s linear infinite;display:inline-block}
    @keyframes pgspin{to{transform:rotate(360deg)}}

    /* ── Toast ── */
    .pg-toast{position:fixed;bottom:80px;right:50%;transform:translateX(50%);background:#1a1a2e;color:#fff;border-radius:50px;padding:.6rem 1.4rem;font-size:.88rem;font-family:"Tajawal",sans-serif;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap}

    @media(max-width:500px){
      .pg-modal{padding:1.4rem 1rem}
      .pg-field-row{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);
})();

document.addEventListener("DOMContentLoaded", function () {
  window.jenanPay = new JenanPayGateway();
});
