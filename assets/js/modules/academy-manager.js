/**
 * academy-manager.js — أكاديمية جنان
 * إدارة مسارات التعلم، الاختبارات، وإصدار الشهادات تلقائياً
 */

class AcademyManager {
  constructor(loyalty, api, config = {}) {
    this.loyalty = loyalty;
    this.api     = api;
    this.tracks  = config.tracks      || [];
    this.certCfg = config.certificate || {};
    this._storageKey = "jenan_academy";
  }

  /* ============ المسارات والدروس ============ */

  /** قائمة المسارات مع تقدم المستخدم */
  getTracksWithProgress(userId) {
    const progress = this._getUserProgress(userId);
    return this.tracks.map(track => ({
      ...track,
      completedLessons: (progress[track.id]?.completed || []).length,
      progressPct: Math.round(
        ((progress[track.id]?.completed || []).length / track.lessons) * 100
      ),
      certified: progress[track.id]?.certified || false,
    }));
  }

  /** إتمام درس */
  completeLesson(userId, trackId, lessonId) {
    const progress = this._getUserProgress(userId);
    if (!progress[trackId]) progress[trackId] = { completed: [], certified: false };

    if (progress[trackId].completed.includes(lessonId)) {
      return { alreadyDone: true };
    }

    progress[trackId].completed.push(lessonId);
    this._saveUserProgress(userId, progress);

    // منح نقاط
    if (this.loyalty) this.loyalty.award(userId, "complete_lesson", { trackId, lessonId });

    // هل أكمل المسار بالكامل؟
    const track = this.tracks.find(t => t.id === trackId);
    const allDone = track && progress[trackId].completed.length >= track.lessons;

    return { success: true, progress: progress[trackId].completed.length, trackComplete: allDone };
  }

  /* ============ الاختبارات ============ */

  /**
   * تقديم إجابات اختبار
   * @param {string} userId
   * @param {string} trackId
   * @param {Array}  answers   — [{questionId, answer}, ...]
   * @param {Array}  questions — [{id, correct}, ...]  (من ملفات البيانات)
   */
  submitQuiz(userId, trackId, answers, questions) {
    let correct = 0;
    answers.forEach(a => {
      const q = questions.find(q => q.id === a.questionId);
      if (q && q.correct === a.answer) correct++;
    });

    const score   = Math.round((correct / questions.length) * 100);
    const passed  = score >= 70;

    if (passed && this.loyalty) {
      this.loyalty.award(userId, "pass_quiz", { trackId, score });
    }

    return { score, passed, correct, total: questions.length };
  }

  /* ============ الشهادات ============ */

  /**
   * إصدار شهادة PDF (يُستدعى بعد إتمام المسار واجتياز الاختبار)
   */
  async issueCertificate(userId, trackId, userName) {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) throw new Error("مسار غير موجود.");

    const certId  = `JENAN-${trackId.toUpperCase()}-${Date.now()}`;
    const qrUrl   = `${this.certCfg.qrBaseUrl || "/verify/"}${certId}`;
    const expYear = new Date().getFullYear() + (this.certCfg.validityYears || 3);

    const certData = {
      certId,
      userId,
      userName,
      trackId,
      trackName:  track.name,
      issuer:     this.certCfg.issuer || "أكاديمية جنان",
      issuedAt:   new Date().toLocaleDateString("ar-SA"),
      expiresAt:  `${expYear}`,
      qrUrl,
    };

    // تسجيل الشهادة
    const progress = this._getUserProgress(userId);
    if (!progress[trackId]) progress[trackId] = { completed: [], certified: false };
    progress[trackId].certified = certId;
    this._saveUserProgress(userId, progress);

    // حفظ مركزي للتحقق
    const allCerts = JSON.parse(localStorage.getItem("jenan_certificates") || "{}");
    allCerts[certId] = certData;
    localStorage.setItem("jenan_certificates", JSON.stringify(allCerts));

    // توليد PDF عبر API أو محلياً
    const pdf = await this._generateCertPDF(certData);

    return { certData, pdfBlob: pdf };
  }

  /** التحقق من شهادة عبر QR */
  verifyCertificate(certId) {
    const allCerts = JSON.parse(localStorage.getItem("jenan_certificates") || "{}");
    const cert = allCerts[certId];
    if (!cert) return { valid: false, message: "الشهادة غير موجودة." };
    return { valid: true, cert };
  }

  /* ============ توليد PDF للشهادة ============ */

  async _generateCertPDF(cert) {
    // HTML → Canvas → PDF باستخدام jsPDF إذا متاح
    // هنا قالب HTML للشهادة يُحوّل لـ PDF
    const html = `
      <div style="width:800px;height:565px;padding:40px;font-family:'Tajawal',sans-serif;
                  background:linear-gradient(135deg,#4E73C2,#3558A8);color:#fff;
                  border:8px solid #f4a623;text-align:center;direction:rtl;">
        <h1 style="font-size:38px;margin-bottom:8px;">شهادة إتمام</h1>
        <p style="font-size:16px;margin:0;">أكاديمية جنان بيز — ${new Date().getFullYear()}</p>
        <hr style="border:1px solid #fff;margin:20px 0;"/>
        <p style="font-size:18px;">يُشهد بأن</p>
        <h2 style="font-size:32px;margin:10px 0;">${cert.userName}</h2>
        <p style="font-size:18px;">قد أتم بنجاح مسار</p>
        <h3 style="font-size:26px;margin:10px 0;">${cert.trackName}</h3>
        <p style="font-size:14px;margin-top:30px;">رقم الشهادة: ${cert.certId}</p>
        <p style="font-size:14px;">تاريخ الإصدار: ${cert.issuedAt} | صالحة حتى: ${cert.expiresAt}</p>
        <p style="font-size:12px;margin-top:20px;">تحقق من الشهادة: ${cert.qrUrl}</p>
      </div>
    `;

    // إذا jsPDF متاح في الصفحة
    if (typeof window !== "undefined" && window.jspdf) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "landscape", format: "a4" });
      await doc.html(html, { x: 0, y: 0, width: 297 });
      return doc.output("blob");
    }

    // fallback: إرجاع HTML كـ Blob
    return new Blob([html], { type: "text/html" });
  }

  /* ============ منطق داخلي ============ */

  _getUserProgress(userId) {
    const all = JSON.parse(localStorage.getItem(this._storageKey) || "{}");
    return all[userId] || {};
  }

  _saveUserProgress(userId, progress) {
    const all = JSON.parse(localStorage.getItem(this._storageKey) || "{}");
    all[userId] = progress;
    localStorage.setItem(this._storageKey, JSON.stringify(all));
  }
}

let jenanAcademyMgr;
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    jenanAcademyMgr = new AcademyManager(
      typeof jenanLoyalty !== "undefined" ? jenanLoyalty : null,
      typeof jenanApi     !== "undefined" ? jenanApi     : null,
      typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.academy : {}
    );
    window.jenanAcademyMgr = jenanAcademyMgr;
  });
}

if (typeof module !== "undefined") module.exports = { AcademyManager };
