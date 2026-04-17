/**
 * api-client.js — طبقة التواصل مع الـ API
 * قابل للتوسع: أضف endpoint جديد بسطر واحد
 */

class ApiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "/api";
    this.timeout = config.timeout || 45000;
    this.headers = config.headers || { "Content-Type": "application/json" };
  }

  /* ---- طرق HTTP الأساسية ---- */

  get(path, params = {}) {
    const url = new URL(this.baseUrl + path, window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return this._fetch(url.toString(), { method: "GET" });
  }

  post(path, body = {}) {
    return this._fetch(this.baseUrl + path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put(path, body = {}) {
    return this._fetch(this.baseUrl + path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  delete(path) {
    return this._fetch(this.baseUrl + path, { method: "DELETE" });
  }

  /* ---- نقاط نهاية جنان بيز ---- */

  // ─── ذكاء اصطناعي ────────────────────────────────────────────
  analyzeProject(data)            { return this.post("/analyze-project",        data); }
  generateStudy(data)             { return this.post("/generate-study",         data); }
  generateDesign(data)            { return this.post("/generate-design",        data); }
  chatWithAI(messages)            { return this.post("/chat",                   { messages }); }
  execSummary(data)               { return this.post("/exec-summary",           data); }
  govCompliance(data)             { return this.post("/gov-compliance",         data); }
  fundingRadar(data)              { return this.post("/funding-radar",          data); }

  // ─── PDF (تنزيل ثنائي) ───────────────────────────────────────
  /**
   * يُنزّل ملف PDF ويُعيد Blob جاهزاً للتنزيل أو الفتح في نافذة جديدة
   * @param {string} path   — مسار الـ API
   * @param {object} body   — البيانات
   * @param {string} filename — اسم الملف المُنزَّل
   */
  async downloadPdf(path, body = {}, filename = "jenan-report.pdf") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const session = localStorage.getItem("jenan_session");
    const headers = { "Content-Type": "application/json" };
    if (session) {
      try { headers["Authorization"] = `Bearer ${JSON.parse(session).token}`; } catch { /* لا جلسة */ }
    }

    try {
      const res = await fetch(this.baseUrl + path, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || `فشل تنزيل PDF: ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { success: true, filename };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") throw new Error("انتهت مهلة تنزيل PDF.");
      throw err;
    }
  }

  analyzeProjectPdf(data)         { return this.downloadPdf("/analyze-project/pdf", data, `تقرير-جدوى-${Date.now()}.pdf`); }
  generateStudyPdf(data)          { return this.downloadPdf("/generate-study/pdf",  data, `دراسة-جدوى-${Date.now()}.pdf`); }

  // ─── المصادقة (OTP) ──────────────────────────────────────────
  sendOtp(email)                  { return this.post("/otp/send",   { email }); }
  verifyOtp(email, otp)           { return this.post("/otp/verify", { email, otp }); }

  // ─── الأكاديمية ───────────────────────────────────────────────
  generateArticle(data)           { return this.post("/academy/generate-article", data); }
  generateQuiz(data)              { return this.post("/academy/generate-quiz",    data); }

  // ─── الشهادات ─────────────────────────────────────────────────
  issueCertificate(data)          { return this.post("/certificates",             data); }
  verifyCertificate(certId)       { return this.get(`/certificates/${certId}`); }

  // ─── النشر الاجتماعي ──────────────────────────────────────────
  publishContent(payload)         { return this.post("/social/publish",            payload); }
  composePost(data)               { return this.post("/social/compose-post",       data); }

  // ─── متجر البرمجيات ───────────────────────────────────────────
  softwareInquire(data)           { return this.post("/software/inquire",          data); }

  // ─── بوابة الدفع ──────────────────────────────────────────────
  createOrder(data)               { return this.post("/payment/create-order",      data); }
  getOrderStatus(orderId)         { return this.get(`/payment/status/${orderId}`); }
  createTamaraSession(data)       { return this.post("/payment/tamara/create-session", data); }
  createTabbySession(data)        { return this.post("/payment/tabby/create-session",  data); }
  validateApplePayMerchant(data)  { return this.post("/payment/applepay/validate-merchant", data); }
  initStcPay(data)                { return this.post("/payment/stcpay/init",       data); }
  confirmStcPay(data)             { return this.post("/payment/stcpay/confirm",    data); }

  // ─── الصحة ────────────────────────────────────────────────────
  healthCheck()                   { return this.get("/../health"); }

  /* ---- منطق داخلي ---- */

  async _fetch(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const session = localStorage.getItem("jenan_session");
    const headers = { ...this.headers };
    if (session) {
      try {
        const { token } = JSON.parse(session);
        headers["Authorization"] = `Bearer ${token}`;
      } catch { /* لا جلسة */ }
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || `طلب فشل: ${res.status}`);
      }
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") throw new Error("انتهت مهلة الطلب.");
      throw err;
    }
  }
}

const jenanApi = new ApiClient(
  typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.api : {}
);

if (typeof module !== "undefined") module.exports = { ApiClient, jenanApi };
