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

  // ذكاء اصطناعي
  analyzeProject(data)      { return this.post("/analyze-project", data); }
  generateStudy(data)       { return this.post("/generate-study",  data); }
  generateDesign(data)      { return this.post("/generate-design", data); }
  chatWithAI(messages)      { return this.post("/chat",            { messages }); }

  // المستخدمون
  syncUser(userId, data)    { return this.put(`/users/${userId}`,  data); }
  getUserStats(userId)      { return this.get(`/users/${userId}/stats`); }

  // النشر الاجتماعي
  publishContent(payload)   { return this.post("/social/publish",  payload); }

  // الشهادات
  issueCertificate(data)    { return this.post("/certificates",    data); }
  verifyCertificate(qrCode) { return this.get(`/certificates/${qrCode}`); }

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
