/**
 * loyalty-engine.js — محرك النقاط والولاء
 * يمنح نقاطاً فورية مقابل كل عملية + إدارة الدرجات والصرف
 */

class LoyaltyEngine {
  constructor(config = {}) {
    this.cfg      = config;
    this.actions  = config.actions   || {};
    this.tiers    = config.tiers     || [];
    this.redeem   = config.redemption || {};
    this._listeners = {};
    this._storageKey = "jenan_loyalty";
  }

  /* ============= منح النقاط ============= */

  /**
   * منح نقاط لمستخدم مقابل إجراء محدد
   * @param {string} userId
   * @param {string} action   — مفتاح من JENAN_CONFIG.loyalty.actions
   * @param {object} meta     — بيانات إضافية اختيارية
   */
  award(userId, action, meta = {}) {
    const actionCfg = this.actions[action];
    if (!actionCfg) throw new Error(`إجراء غير معروف: ${action}`);

    const pts   = actionCfg.points;
    const state = this._getState(userId);

    state.total    += pts;
    state.lifetime += pts;
    state.history.push({
      action,
      points: pts,
      label:  actionCfg.label,
      ts:     Date.now(),
      meta,
    });

    const newTier = this._calcTier(state.lifetime);
    const tierChanged = newTier !== state.tier;
    state.tier = newTier;

    this._setState(userId, state);
    this._emit("pointsAwarded", { userId, action, points: pts, total: state.total, tier: state.tier });

    if (tierChanged) {
      this._emit("tierUpgraded", { userId, tier: state.tier });
    }

    return { points: pts, total: state.total, tier: state.tier };
  }

  /** تسجيل الدخول اليومي */
  dailyLogin(userId) {
    const state = this._getState(userId);
    const today = new Date().toDateString();
    if (state.lastLoginDate === today) return null; // سبق المطالبة اليوم

    state.lastLoginDate = today;
    state.streak = (state.streak || 0) + 1;
    this._setState(userId, state);

    const bonus = state.streak % 7 === 0 ? 20 : 0; // مكافأة أسبوعية
    const result = this.award(userId, "daily_login");
    if (bonus > 0) {
      const s = this._getState(userId);
      s.total    += bonus;
      s.lifetime += bonus;
      s.history.push({ action: "streak_bonus", points: bonus, label: "مكافأة التتابع الأسبوعي", ts: Date.now() });
      this._setState(userId, s);
    }
    return { ...result, streak: state.streak, bonusAwarded: bonus };
  }

  /* ============= الصرف ============= */

  /**
   * استبدال النقاط
   * @param {string} userId
   * @param {string} type    — "cash" | "upgrade_basic" | "upgrade_pro" | "upgrade_enterprise"
   */
  redeem(userId, type) {
    const state = this._getState(userId);
    const costs = {
      cash:               this.redeem.min_redeem,
      upgrade_basic:      this.redeem.upgrade_basic,
      upgrade_pro:        this.redeem.upgrade_pro,
      upgrade_enterprise: this.redeem.upgrade_enterprise,
    };

    const cost = costs[type];
    if (!cost) throw new Error(`نوع صرف غير معروف: ${type}`);
    if (state.total < cost) throw new Error(`نقاطك غير كافية. تحتاج ${cost} وعندك ${state.total}.`);

    let cashValue = 0;
    if (type === "cash") {
      cashValue = (cost * this.redeem.cash_rate).toFixed(2);
    }

    state.total       -= cost;
    state.redeemHistory = state.redeemHistory || [];
    state.redeemHistory.push({ type, cost, cashValue, ts: Date.now() });

    this._setState(userId, state);
    this._emit("pointsRedeemed", { userId, type, cost, cashValue, remaining: state.total });
    return { type, cost, cashValue, remaining: state.total };
  }

  /* ============= استعلام ============= */

  getBalance(userId) {
    const s = this._getState(userId);
    return { total: s.total, lifetime: s.lifetime, tier: s.tier, streak: s.streak || 0 };
  }

  getHistory(userId, limit = 20) {
    return (this._getState(userId).history || []).slice(-limit).reverse();
  }

  getLeaderboard(topN = 10) {
    const all = JSON.parse(localStorage.getItem("jenan_loyalty_all") || "{}");
    return Object.entries(all)
      .map(([uid, s]) => ({ userId: uid, lifetime: s.lifetime, tier: s.tier }))
      .sort((a, b) => b.lifetime - a.lifetime)
      .slice(0, topN);
  }

  /** مستمع أحداث */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  /* ============= منطق داخلي ============= */

  _calcTier(lifetime) {
    const ranked = [...this.tiers].sort((a, b) => b.minPoints - a.minPoints);
    return (ranked.find(t => lifetime >= t.minPoints) || this.tiers[0]).name;
  }

  _getState(userId) {
    const all = JSON.parse(localStorage.getItem("jenan_loyalty_all") || "{}");
    return all[userId] || { total: 0, lifetime: 0, tier: this.tiers[0]?.name || "برونزي", history: [], streak: 0 };
  }

  _setState(userId, state) {
    const all = JSON.parse(localStorage.getItem("jenan_loyalty_all") || "{}");
    all[userId] = state;
    localStorage.setItem("jenan_loyalty_all", JSON.stringify(all));
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }
}

const jenanLoyalty = new LoyaltyEngine(
  typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.loyalty : {}
);

if (typeof module !== "undefined") module.exports = { LoyaltyEngine, jenanLoyalty };
