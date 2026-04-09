/**
 * data-intelligence.js — استخبارات البيانات والتمويل
 * يصنّف المستخدمين آلياً ويربطهم بخدمات التمويل عند الحاجة
 */

class DataIntelligence {
  constructor(config = {}) {
    this.triggers  = config.triggers           || {};
    this.threshold = config.financeThreshold   || 500000;
    this._key      = "jenan_intel";
    this._listeners = {};
  }

  /* ============ تتبع السلوك ============ */

  /**
   * تسجيل حدث سلوكي
   * @param {string} userId
   * @param {string} eventType  — search|view|input|analyze
   * @param {object} meta       — { query, sector, capital, ... }
   */
  track(userId, eventType, meta = {}) {
    const profile = this._getProfile(userId);
    profile.events = profile.events || [];
    profile.events.push({ type: eventType, meta, ts: Date.now() });

    // تحديث التصنيف
    const classification = this._classify(profile.events, meta);
    if (classification && classification !== profile.segment) {
      profile.segment = classification;
      this._emit("segmentUpdated", { userId, segment: classification });
    }

    // كشف الحاجة للتمويل
    if (meta.capital && meta.capital >= this.threshold) {
      this._emit("financeNeeded", {
        userId,
        capital: meta.capital,
        sector:  meta.sector || profile.segment,
      });
    }

    this._saveProfile(userId, profile);
    return profile.segment;
  }

  /**
   * تسجيل عملية بحث أو كتابة في الـ input
   * يستخدم لتحليل الكلمات المفتاحية وتصنيف المستخدم
   */
  trackInput(userId, text) {
    const lower = text.toLowerCase();
    for (const [segment, keywords] of Object.entries(this.triggers)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return this.track(userId, "input", { text, matchedSegment: segment });
      }
    }
    return this.track(userId, "input", { text });
  }

  /* ============ ربط التمويل ============ */

  /**
   * يُستدعى عند اكتشاف حاجة للتمويل في "محلل المشاريع"
   * يعرض بطاقة التمويل للمستخدم آلياً
   */
  offerFinance(userId, capital, sector) {
    const profile = this._getProfile(userId);
    profile.financeOfferShown = true;
    profile.financeOfferTs    = Date.now();
    this._saveProfile(userId, profile);

    this._emit("financeOfferShown", { userId, capital, sector });

    return {
      title:   "هل تحتاج إلى تمويل لمشروعك؟",
      body:    `مشروعك يحتاج رأس مال ${capital.toLocaleString("ar-SA")} ريال. فريقنا متاح لمساعدتك في الحصول على تمويل مناسب.`,
      cta:     "تحدث مع فريق التمويل",
      ctaUrl:  typeof JENAN_CONFIG !== "undefined" ? `https://wa.me/${JENAN_CONFIG.app.whatsapp.replace(/\D/g, "")}` : "#",
    };
  }

  /* ============ استعلام البيانات ============ */

  getProfile(userId)   { return this._getProfile(userId); }

  /** تقرير موجز — يُستخدم في حملات التسويق */
  getSegmentReport() {
    const allKeys = Object.keys(localStorage)
      .filter(k => k.startsWith(this._key + "_"));
    const segments = {};
    allKeys.forEach(k => {
      const profile = JSON.parse(localStorage.getItem(k) || "{}");
      const seg = profile.segment || "unknown";
      segments[seg] = (segments[seg] || 0) + 1;
    });
    return segments;
  }

  /** مستمع أحداث */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  /* ============ منطق داخلي ============ */

  _classify(events, lastMeta) {
    const text = events.map(e => JSON.stringify(e.meta)).join(" ").toLowerCase();
    for (const [segment, keywords] of Object.entries(this.triggers)) {
      if (keywords.some(kw => text.includes(kw))) return segment;
    }
    return lastMeta.matchedSegment || null;
  }

  _getProfile(userId) {
    return JSON.parse(localStorage.getItem(`${this._key}_${userId}`) || "{}");
  }

  _saveProfile(userId, data) {
    localStorage.setItem(`${this._key}_${userId}`, JSON.stringify(data));
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }
}

const jenanIntel = new DataIntelligence(
  typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.userClassification : {}
);

// ربط التمويل تلقائياً عند اكتشاف الحاجة
jenanIntel.on("financeNeeded", ({ userId, capital, sector }) => {
  const offer = jenanIntel.offerFinance(userId, capital, sector);
  // إظهار modal في الواجهة
  if (typeof showFinanceOffer === "function") showFinanceOffer(offer);
});

if (typeof module !== "undefined") module.exports = { DataIntelligence, jenanIntel };
