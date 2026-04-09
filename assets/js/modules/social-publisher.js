/**
 * social-publisher.js — ناشر السوشيال الذكي لجنان بيز
 * ينشر المحتوى الجديد تلقائياً، ويُطلق حملات ترويجية إذا لم يكن هناك جديد
 * يعتمد على: app-config.js
 */

class SocialPublisher {
  constructor(config = {}) {
    const cfg           = (typeof JENAN_CONFIG !== "undefined") ? JENAN_CONFIG.social : {};
    this._handles       = cfg.handles       || config.handles       || {};
    this._apiBase       = (typeof JENAN_CONFIG !== "undefined") ? JENAN_CONFIG.api.baseUrl : "/api";
    this._queueKey      = cfg.storageKey    || "jenan_social_queue";
    this._lastPublishKey= cfg.lastPublishKey || "jenan_last_publish";
    this._promoTemplates= cfg.promoTemplates || config.promoTemplates || [];
    this._silentDays    = cfg.promoIfSilentDays || 7;
    this._platformCfg   = cfg.platformConfig || {
      twitter:   { maxChars: 280  },
      whatsapp:  { maxChars: 1000 },
      instagram: { maxChars: 2200 },
      tiktok:    { maxChars: 150  },
    };
  }

  /* ════════ كيوالعالقة ════════ */
  _queue()        { try { return JSON.parse(localStorage.getItem(this._queueKey) || "[]"); } catch { return []; } }
  _saveQueue(q)   { localStorage.setItem(this._queueKey, JSON.stringify(q)); }
  _lastPublish()  { return parseInt(localStorage.getItem(this._lastPublishKey) || "0", 10); }
  _markPublished(){ localStorage.setItem(this._lastPublishKey, Date.now().toString()); }
  _daysSincePost(){ return (Date.now() - this._lastPublish()) / 86400000; }

  /* ════════ API ════════ */
  async _composePost(text, platform, hashtags = []) {
    try {
      const r = await fetch(`${this._apiBase}/social/compose-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: "general", content_text: text, platform, hashtags }),
      });
      const d = await r.json();
      return d.post_text || text;
    } catch {
      // fallback: بناء النص يدوياً
      const max   = this._platformCfg[platform]?.maxChars || 280;
      const tags  = hashtags.map(h => `#${h}`).join(" ");
      return text.length + tags.length + 1 <= max
        ? `${text} ${tags}`
        : `${text.substring(0, max - tags.length - 4)}... ${tags}`;
    }
  }

  /* ════════ معالجة محتوى جديد ════════ */
  async onNewContent(type, title, body = "") {
    const cfg = (typeof JENAN_CONFIG !== "undefined") ? JENAN_CONFIG.social : {};
    if (!cfg.autoPublish) {
      // حتى لو autoPublish=false، نقوم بوضع في الكيو للمراجعة اليدوية
      this._addToQueue({ type, title, body, status: "pending", addedAt: Date.now() });
      return;
    }

    // توليد النص ونشر
    const hashtags = ["جنان_بيز", "أكاديمية_جنان", "ريادة_أعمال"];
    const snippet  = body ? body.replace(/<[^>]+>/g, "").substring(0, 120) + "..." : title;

    const contentByPlatform = {
      twitter:   await this._composePost(`📖 ${title}\n\n${snippet}`, "twitter",   hashtags),
      whatsapp:  await this._composePost(`📖 *${title}*\n\n${snippet}`, "whatsapp", hashtags),
      instagram: await this._composePost(`📖 ${title}\n\n${snippet}`, "instagram", hashtags),
      tiktok:    await this._composePost(`📖 ${title}`, "tiktok", hashtags),
    };

    this._addToQueue({ type, title, content: contentByPlatform, status: "ready", addedAt: Date.now() });
    this._markPublished();
  }

  /* ════════ التحقق من الصمت وإطلاق حملة ترويجية ════════ */
  async checkAndAutoPromo() {
    if (this._daysSincePost() < this._silentDays) return null;
    if (!this._promoTemplates.length) return null;

    // اختيار قالب دوري
    const idx      = Math.floor((Date.now() / 86400000)) % this._promoTemplates.length;
    const template = this._promoTemplates[idx];

    const hashtags = (template.hashtags || ["جنان_بيز"]);
    const baseUrl  = (typeof JENAN_CONFIG !== "undefined")
      ? JENAN_CONFIG.app.domain + template.url
      : template.url;

    const platforms = ["twitter", "whatsapp", "instagram", "tiktok"];
    const content   = {};

    for (const p of platforms) {
      const fullText = `${template.text}\n\n🔗 ${baseUrl}`;
      content[p] = await this._composePost(fullText, p, hashtags);
    }

    const post = { type: "promo", title: template.text, content, status: "ready", addedAt: Date.now() };
    this._addToQueue(post);
    this._markPublished();
    return post;
  }

  /* ════════ روابط المشاركة المباشرة ════════ */
  getShareUrls(text, pageUrl = window.location.href) {
    const enc  = encodeURIComponent;
    const tags = "#جنان_بيز #ريادة_أعمال #أعمال_السعودية";
    const full = `${text}\n\n${tags}`;
    return {
      twitter:   `https://twitter.com/intent/tweet?text=${enc(full)}&url=${enc(pageUrl)}`,
      whatsapp:  `https://wa.me/?text=${enc(full + "\n" + pageUrl)}`,
      linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${enc(pageUrl)}`,
      tiktok:    `https://www.tiktok.com/`,
      instagram: `https://www.instagram.com/`,  // إنستغرام لا دعم للمشاركة المباشرة عبر URL
    };
  }

  /* ════════ إضافة للكيو ════════ */
  _addToQueue(item) {
    const q = this._queue();
    q.unshift({ ...item, id: `post_${Date.now()}` });
    if (q.length > 50) q.pop();  // احتفظ بأحدث 50 منشور
    this._saveQueue(q);
  }

  /* ════════ لوحة إدارة النشر ════════ */
  renderAdminPanel(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = this._adminHTML();
    this._bindAdminEvents(el);
  }

  _adminHTML() {
    const q    = this._queue();
    const days = this._daysSincePost().toFixed(1);
    const cfg  = (typeof JENAN_CONFIG !== "undefined") ? JENAN_CONFIG.social : {};

    return `
      <div class="sp-panel">
        <div class="sp-header">
          <h3 class="sp-title">📡 ناشر السوشيال ميديا</h3>
          <div class="sp-status ${parseFloat(days) >= this._silentDays ? "sp-status-warn" : "sp-status-ok"}">
            ${parseFloat(days) >= this._silentDays
              ? `⚠️ لم يُنشر منذ ${days} يوم`
              : `✅ آخر نشر منذ ${days} يوم`}
          </div>
        </div>

        <!-- الحسابات -->
        <div class="sp-accounts">
          <a href="${this._handles.twitter   || "#"}" target="_blank" class="sp-acc sp-tw">𝕏 تويتر</a>
          <a href="${this._handles.whatsapp  || "#"}" target="_blank" class="sp-acc sp-wa">💬 واتساب</a>
          <a href="${this._handles.instagram || "#"}" target="_blank" class="sp-acc sp-ig">📷 إنستغرام</a>
          <a href="${this._handles.tiktok    || "#"}" target="_blank" class="sp-acc sp-tt">🎵 تيك توك</a>
        </div>

        <!-- توليد محتوى جديد -->
        <div class="sp-compose">
          <h4 class="sp-section-title">✍️ أنشئ منشوراً جديداً</h4>
          <textarea id="sp-compose-text" class="sp-textarea"
            placeholder="اكتب نص المنشور أو عنوان المقالة الجديدة..."></textarea>
          <div class="sp-compose-row">
            <select id="sp-platform" class="sp-select">
              <option value="twitter">𝕏 تويتر</option>
              <option value="whatsapp">💬 واتساب</option>
              <option value="instagram">📷 إنستغرام</option>
              <option value="tiktok">🎵 تيك توك</option>
            </select>
            <button class="sp-btn-compose" id="sp-compose-btn">🤖 ولّد المنشور بالذكاء الاصطناعي</button>
          </div>
          <div id="sp-compose-result" class="sp-compose-result" style="display:none"></div>
        </div>

        <!-- زر الحملة الترويجية -->
        <div class="sp-promo-section">
          <h4 class="sp-section-title">🚀 الحملات الترويجية التلقائية</h4>
          <p class="sp-promo-desc">
            إذا مرّت ${this._silentDays} أيام دون نشر، تُطلق المنصة حملة ترويجية تلقائية لإحدى خدماتها.
          </p>
          <button class="sp-btn-promo" id="sp-promo-btn">📣 اطلق حملة ترويجية الآن</button>
        </div>

        <!-- الكيو -->
        <div class="sp-queue-section">
          <h4 class="sp-section-title">📋 قائمة المنشورات (${q.length})</h4>
          ${q.length === 0
            ? `<p class="sp-empty-queue">لا توجد منشورات في القائمة بعد</p>`
            : `<div class="sp-queue-list">${q.slice(0, 10).map(p => `
              <div class="sp-queue-item ${p.type === "promo" ? "sp-promo-item" : ""}">
                <div class="sp-qi-meta">
                  <span class="sp-qi-type">${p.type === "promo" ? "🚀 ترويجي" : "📖 محتوى"}</span>
                  <span class="sp-qi-date">${new Date(p.addedAt).toLocaleDateString("ar-SA")}</span>
                  <span class="sp-qi-status sp-status-${p.status}">${p.status === "ready" ? "جاهز" : "معلّق"}</span>
                </div>
                <p class="sp-qi-title">${p.title || "(بدون عنوان)"}</p>
                ${p.content?.twitter ? `
                <div class="sp-qi-preview">
                  <strong>🐦 تويتر:</strong> ${p.content.twitter.substring(0, 120)}...
                </div>` : ""}
                <div class="sp-qi-actions">
                  <button class="sp-btn-share" onclick="window.jenanSocial._sharePost('${p.id}','twitter')">𝕏</button>
                  <button class="sp-btn-share sp-wa" onclick="window.jenanSocial._sharePost('${p.id}','whatsapp')">💬</button>
                  <button class="sp-btn-del" onclick="window.jenanSocial._deletePost('${p.id}')">🗑️</button>
                </div>
              </div>`).join("")}</div>`}
        </div>
      </div>
    `;
  }

  _bindAdminEvents(el) {
    // زر التوليد بالذكاء الاصطناعي
    el.querySelector("#sp-compose-btn")?.addEventListener("click", async () => {
      const text     = el.querySelector("#sp-compose-text")?.value?.trim();
      const platform = el.querySelector("#sp-platform")?.value || "twitter";
      const resultEl = el.querySelector("#sp-compose-result");
      if (!text) return;

      resultEl.style.display = "block";
      resultEl.innerHTML = `<div class="sp-loading"><div class="sp-spinner"></div> جارٍ التوليد...</div>`;

      const composed = await this._composePost(text, platform, ["جنان_بيز", "أعمال"]);
      const urls     = this.getShareUrls(composed);

      resultEl.innerHTML = `
        <div class="sp-result-wrap">
          <p class="sp-result-text">${composed}</p>
          <p class="sp-result-count">${composed.length} حرف · الحد: ${this._platformCfg[platform]?.maxChars}</p>
          <div class="sp-result-actions">
            <a href="${urls[platform]}" target="_blank" class="sp-btn-publish">نشر مباشرة</a>
            <button class="sp-btn-copy" onclick="navigator.clipboard.writeText(\`${composed.replace(/`/g,"\\`")}\`);this.textContent='✓ تم النسخ'">نسخ النص</button>
          </div>
        </div>`;

      this._addToQueue({ type: "custom", title: text, content: { [platform]: composed }, status: "ready", addedAt: Date.now() });
    });

    // زر الحملة الترويجية
    el.querySelector("#sp-promo-btn")?.addEventListener("click", async () => {
      const btn = el.querySelector("#sp-promo-btn");
      btn.textContent = "⏳ جارٍ التحضير...";
      btn.disabled = true;
      try {
        const post = await this.checkAndAutoPromo();
        if (post) {
          this.renderAdminPanel(el.id);  // إعادة رسم
          alert(`✅ تم تجهيز الحملة: "${post.title.substring(0,60)}"\nافتح القائمة أدناه لنشرها.`);
        } else {
          alert("لم يمرّ وقت كافٍ على آخر منشور. حاول بعد " + Math.ceil(this._silentDays - this._daysSincePost()) + " أيام.");
          btn.textContent = "📣 اطلق حملة ترويجية الآن";
          btn.disabled = false;
        }
      } catch { btn.textContent = "📣 اطلق حملة ترويجية الآن"; btn.disabled = false; }
    });
  }

  /* ════════ مشاركة / حذف من الكيو ════════ */
  _sharePost(postId, platform) {
    const q    = this._queue();
    const post = q.find(p => p.id === postId);
    if (!post?.content?.[platform]) {
      alert("محتوى هذه المنصة غير متاح. أعد توليد المنشور.");
      return;
    }
    const urls = this.getShareUrls(post.content[platform]);
    window.open(urls[platform], "_blank", "width=600,height=400");
    // تحديث الحالة
    const idx = q.findIndex(p => p.id === postId);
    if (idx !== -1) { q[idx].status = "published"; q[idx].publishedAt = Date.now(); }
    this._saveQueue(q);
    this._markPublished();
  }

  _deletePost(postId) {
    const q = this._queue().filter(p => p.id !== postId);
    this._saveQueue(q);
    // إعادة رسم اللوحة
    const panel = document.querySelector(".sp-panel")?.closest("[id]");
    if (panel) this.renderAdminPanel(panel.id);
  }

  /* ════════ أزرار المشاركة الجاهزة ════════ */
  renderShareButtons(containerId, text, pageUrl = window.location.href) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const urls = this.getShareUrls(text, pageUrl);
    el.innerHTML = `
      <div class="sp-share-row">
        <span class="sp-share-label">📤 شارك:</span>
        <a href="${urls.twitter}"   target="_blank" class="sp-share-btn sp-tw">𝕏 تويتر</a>
        <a href="${urls.whatsapp}"  target="_blank" class="sp-share-btn sp-wa">💬 واتساب</a>
        <a href="${urls.linkedin}"  target="_blank" class="sp-share-btn sp-li">in لينكدإن</a>
      </div>`;
  }

  /* ════════ ملخص الحالة للأمام ════════ */
  getStats() {
    const q = this._queue();
    return {
      total:      q.length,
      pending:    q.filter(p => p.status === "pending").length,
      ready:      q.filter(p => p.status === "ready").length,
      published:  q.filter(p => p.status === "published").length,
      daysSince:  parseFloat(this._daysSincePost().toFixed(1)),
      needsPromo: this._daysSincePost() >= this._silentDays,
    };
  }
}

/* ════════════════════════════════════════════════════════
   تشغيل تلقائي
   ════════════════════════════════════════════════════════ */
window.jenanSocial = new SocialPublisher();

// فحص دوري: إذا لم يُنشر منذ فترة → نضع حملة في الكيو
(async () => {
  await window.jenanSocial.checkAndAutoPromo();
})();
