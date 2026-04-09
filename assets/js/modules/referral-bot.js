/**
 * referral-bot.js — روبوت الإحالات والتحويل
 * يولد روابط فريدة ويتتبع التحويلات آلياً
 */

class ReferralBot {
  constructor(config = {}) {
    this.baseUrl    = config.baseUrl    || "/?ref=";
    this.cookieDays = config.cookieDays || 30;
    this.bonusRef   = config.bonusForReferrer || 100;
    this.bonusNew   = config.bonusForReferred  || 50;
    this._storageKey = "jenan_referrals";
  }

  /* ============= توليد الرابط ============= */

  /** الحصول على رابط الإحالة الخاص بمستخدم */
  getLink(referralCode) {
    return `${this.baseUrl}${encodeURIComponent(referralCode)}`;
  }

  /** نسخ الرابط للحافظة مع إشعار */
  async copyLink(referralCode) {
    const link = this.getLink(referralCode);
    await navigator.clipboard.writeText(link);
    return link;
  }

  /* ============= تتبع الإحالة ============= */

  /**
   * يستدعى عند تحميل الصفحة — يتحقق من وجود كود إحالة في URL
   * إذا وُجد: يحفظه في cookie/localStorage لربطه بالمستخدم الجديد
   */
  detectIncoming() {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("ref");
    if (!code) return null;

    localStorage.setItem("jenan_referrer_code", code);
    localStorage.setItem("jenan_referrer_ts",   Date.now().toString());
    return code;
  }

  /**
   * يُستدعى بعد التسجيل الناجح
   * يطابق المستخدم الجديد مع المُحيل ويمنح المكافآت
   */
  processSignup(newUserId, newUserReferralCode) {
    const referrerCode = localStorage.getItem("jenan_referrer_code");
    const ts           = parseInt(localStorage.getItem("jenan_referrer_ts") || "0");

    if (!referrerCode) return null;

    // التحقق من صلاحية الكوكي (cookieDays يوماً)
    const ageMs = Date.now() - ts;
    if (ageMs > this.cookieDays * 86_400_000) {
      localStorage.removeItem("jenan_referrer_code");
      return null;
    }

    // البحث عن المُحيل
    const users = JSON.parse(localStorage.getItem("jenan_users") || "[]");
    const referrer = users.find(u => u.referralCode === referrerCode);
    if (!referrer) return null;
    if (referrer.id === newUserId) return null; // لا يُحيل نفسه

    // تسجيل العلاقة
    const data = this._getData();
    data.push({
      referrerId:   referrer.id,
      referredId:   newUserId,
      referrerCode,
      ts:           Date.now(),
    });
    this._saveData(data);

    // منح النقاط عبر محرك الولاء
    if (typeof jenanLoyalty !== "undefined") {
      jenanLoyalty.award(referrer.id, "referral_signup", { referredId: newUserId });
    }

    // مكافأة المستخدم الجديد
    if (typeof jenanLoyalty !== "undefined") {
      // نضيف مكافأة خاصة بالانضمام عبر إحالة
      const state = jenanLoyalty._getState(newUserId);
      state.total    += this.bonusNew;
      state.lifetime += this.bonusNew;
      state.history.push({ action: "referral_welcome", points: this.bonusNew, label: "مكافأة الانضمام بإحالة", ts: Date.now() });
      jenanLoyalty._setState(newUserId, state);
    }

    localStorage.removeItem("jenan_referrer_code");
    localStorage.removeItem("jenan_referrer_ts");

    return { referrerId: referrer.id, bonusAwarded: this.bonusRef, newUserBonus: this.bonusNew };
  }

  /* ============= إحصاءات ============= */

  /** إجمالي إحالات مستخدم */
  getStats(userId) {
    const data       = this._getData();
    const myReferrals = data.filter(r => r.referrerId === userId);
    return {
      total:     myReferrals.length,
      earnedPts: myReferrals.length * this.bonusRef,
      list:      myReferrals,
    };
  }

  /* ============= منطق داخلي ============= */

  _getData()       { return JSON.parse(localStorage.getItem(this._storageKey) || "[]"); }
  _saveData(data)  { localStorage.setItem(this._storageKey, JSON.stringify(data)); }
}

const jenanReferral = new ReferralBot(
  typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.referral : {}
);

// تشغيل الكشف عند تحميل الصفحة
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => jenanReferral.detectIncoming());
}

if (typeof module !== "undefined") module.exports = { ReferralBot, jenanReferral };
