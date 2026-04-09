/**
 * auth-manager.js — إدارة المصادقة والجلسات
 * روبوت الهوية: تسجيل، دخول، استعادة حساب، تجديد Token
 */

class AuthManager {
  constructor(config = {}) {
    this.tokenExpiry   = config.tokenExpiry  || 86400;
    this.refreshWindow = config.refreshWindow || 3600;
    this.sessionKey    = config.sessionKey   || "jenan_session";
    this.storage       = config.storage === "sessionStorage" ? sessionStorage : localStorage;
    this._listeners    = {};
  }

  /* ===================== واجهة عامة ===================== */

  /** تسجيل مستخدم جديد */
  async register(userData) {
    this._validate(userData, ["name", "email", "password"]);
    const user = {
      id:         this._generateId(),
      name:       userData.name.trim(),
      email:      userData.email.toLowerCase().trim(),
      phone:      userData.phone || "",
      role:       "member",
      tier:       "برونزي",
      points:     0,
      referralCode: this._generateReferralCode(userData.name),
      referredBy:  userData.refCode || null,
      joinedAt:   new Date().toISOString(),
      lastLogin:  new Date().toISOString(),
      profileComplete: false,
    };

    // في بيئة حقيقية: إرسال لـ API — هنا نحاكي localStorage
    const existing = this._getAllUsers();
    if (existing.find(u => u.email === user.email)) {
      throw new Error("البريد الإلكتروني مسجل مسبقاً.");
    }

    user.passwordHash = this._hashPassword(userData.password);
    existing.push(user);
    this._saveAllUsers(existing);

    const token = this._createToken(user);
    this._saveSession({ user: this._sanitize(user), token });
    this._emit("registered", user);
    this._emit("loggedIn",   user);
    return { user: this._sanitize(user), token };
  }

  /** تسجيل الدخول */
  async login(email, password) {
    const users = this._getAllUsers();
    const user  = users.find(u => u.email === email.toLowerCase().trim());
    if (!user || user.passwordHash !== this._hashPassword(password)) {
      throw new Error("البريد أو كلمة المرور غير صحيحة.");
    }

    user.lastLogin = new Date().toISOString();
    this._saveAllUsers(users);

    const token = this._createToken(user);
    this._saveSession({ user: this._sanitize(user), token });
    this._emit("loggedIn", user);
    return { user: this._sanitize(user), token };
  }

  /** تسجيل الخروج */
  logout() {
    const session = this.getSession();
    this.storage.removeItem(this.sessionKey);
    this._emit("loggedOut", session?.user);
  }

  /** استعادة كلمة المرور (إرسال رابط على البريد) */
  async requestPasswordReset(email) {
    const users = this._getAllUsers();
    const user  = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) throw new Error("البريد غير مسجل.");

    const resetToken = this._generateId();
    user.resetToken  = resetToken;
    user.resetExpiry = Date.now() + 3600_000; // ساعة
    this._saveAllUsers(users);

    // في الإنتاج: استدعاء API لإرسال الإيميل
    console.info(`[Auth] Reset token for ${email}: ${resetToken}`);
    return { message: "تم إرسال رابط الاستعادة على بريدك الإلكتروني." };
  }

  /** تعيين كلمة مرور جديدة */
  async resetPassword(email, resetToken, newPassword) {
    const users = this._getAllUsers();
    const user  = users.find(u => u.email === email.toLowerCase().trim());
    if (!user || user.resetToken !== resetToken || Date.now() > user.resetExpiry) {
      throw new Error("رابط الاستعادة غير صالح أو منتهي.");
    }
    user.passwordHash = this._hashPassword(newPassword);
    delete user.resetToken;
    delete user.resetExpiry;
    this._saveAllUsers(users);
    return { message: "تم تغيير كلمة المرور بنجاح." };
  }

  /** الجلسة الحالية */
  getSession() {
    try {
      const raw = this.storage.getItem(this.sessionKey);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!this._isTokenValid(session.token)) {
        this.logout();
        return null;
      }
      return session;
    } catch { return null; }
  }

  /** هل المستخدم مسجل دخوله؟ */
  isLoggedIn() {
    return !!this.getSession();
  }

  /** تحديث بيانات ملف المستخدم */
  updateProfile(updates) {
    const session = this.getSession();
    if (!session) throw new Error("غير مسجل دخول.");

    const users = this._getAllUsers();
    const idx   = users.findIndex(u => u.id === session.user.id);
    if (idx === -1) throw new Error("المستخدم غير موجود.");

    const allowed = ["name", "phone", "businessName", "sector", "avatar"];
    allowed.forEach(k => { if (updates[k] !== undefined) users[idx][k] = updates[k]; });

    const isComplete = ["name", "phone", "businessName", "sector"].every(f => users[idx][f]);
    users[idx].profileComplete = isComplete;

    this._saveAllUsers(users);
    const newSession = { ...session, user: this._sanitize(users[idx]) };
    this._saveSession(newSession);
    this._emit("profileUpdated", users[idx]);
    return this._sanitize(users[idx]);
  }

  /** مستمع للأحداث */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  /* ===================== منطق داخلي ===================== */

  _createToken(user) {
    const payload = { id: user.id, email: user.email, exp: Date.now() + this.tokenExpiry * 1000 };
    return btoa(JSON.stringify(payload));
  }

  _isTokenValid(token) {
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Date.now();
    } catch { return false; }
  }

  _saveSession(data)   { this.storage.setItem(this.sessionKey, JSON.stringify(data)); }
  _getAllUsers()       { return JSON.parse(localStorage.getItem("jenan_users") || "[]"); }
  _saveAllUsers(arr)   { localStorage.setItem("jenan_users", JSON.stringify(arr)); }

  _sanitize(user) {
    const { passwordHash, resetToken, resetExpiry, ...safe } = user;
    return safe;
  }

  _validate(obj, fields) {
    fields.forEach(f => { if (!obj[f]) throw new Error(`الحقل ${f} مطلوب.`); });
  }

  _generateId() {
    return `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  _generateReferralCode(name) {
    return name.slice(0, 3).toUpperCase().replace(/\s/g, "") + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  /** هاش بسيط — في الإنتاج استبدل بـ bcrypt على الـ backend */
  _hashPassword(pw) {
    let h = 0;
    for (let i = 0; i < pw.length; i++) h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
    return `sha_${Math.abs(h).toString(16)}_${pw.length}`;
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }
}

const jenanAuth = new AuthManager(
  typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.auth : {}
);

if (typeof module !== "undefined") module.exports = { AuthManager, jenanAuth };
