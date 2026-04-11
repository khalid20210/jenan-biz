/**
 * seo-bot.js — روبوت SEO والنشر التلقائي
 * يحدث الكلمات المفتاحية ويدير النشر التلقائي على السوشيال ميديا
 */

class SeoBot {
  constructor(api, config = {}) {
    this.api       = api;
    this.platforms = config.platforms    || [];
    // نزع بادئة /api لأن ApiClient يضيفها تلقائياً
    const rawWebhook = config.webhookUrl || "/api/social/publish";
    this.webhook   = rawWebhook.replace(/^\/api/, "") || "/social/publish";
    this.autoPublish = config.autoPublish || false;
    this._storageKey = "jenan_seo";
  }

  /* ============ SEO الميتاداتا ============ */

  /**
   * تحديث meta tags للصفحة ديناميكياً
   * @param {object} opts — { title, description, keywords, ogImage, canonicalUrl }
   */
  updateMeta(opts = {}) {
    const cfg = (typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.seo : null) || {};
    const title = opts.title || cfg.defaultTitle || "جنان بيز";
    const desc  = opts.description || cfg.defaultDesc || "";
    const kws   = [...(cfg.keywords || []), ...(opts.keywords || [])].join(", ");

    document.title = title;
    this._setMeta("description", desc);
    this._setMeta("keywords",    kws);

    // Open Graph
    this._setOg("og:title",       title);
    this._setOg("og:description", desc);
    this._setOg("og:image",       opts.ogImage || cfg.ogImage || "");
    this._setOg("og:url",         opts.canonicalUrl || window.location.href);
    this._setOg("og:type",        "website");

    // Twitter Card
    this._setOg("twitter:card",        "summary_large_image");
    this._setOg("twitter:title",       title);
    this._setOg("twitter:description", desc);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = opts.canonicalUrl || window.location.href;
  }

  /** توليد Schema.org JSON-LD للمنشأة */
  injectOrganizationSchema() {
    const cfg = typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG : {};
    const schema = {
      "@context": "https://schema.org",
      "@type":    "Organization",
      "name":     cfg.app?.name || "جنان بيز",
      "url":      cfg.app?.domain || window.location.origin,
      "logo":     cfg.app?.logo  || "",
      "contactPoint": [{
        "@type": "ContactPoint",
        "telephone": cfg.app?.whatsapp || "",
        "contactType": "customer service",
        "availableLanguage": "Arabic",
      }],
    };
    this._injectSchema(schema);
  }

  /** Schema.org لمقال أو خدمة */
  injectContentSchema({ type = "Article", name, description, datePublished }) {
    const schema = {
      "@context":      "https://schema.org",
      "@type":         type,
      "name":          name,
      "description":   description,
      "datePublished": datePublished || new Date().toISOString(),
      "publisher": {
        "@type": "Organization",
        "name":  typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.app.name : "جنان بيز",
      },
    };
    this._injectSchema(schema);
  }

  /* ============ النشر الاجتماعي ============ */

  /**
   * نشر محتوى على المنصات المفعّلة
   * @param {object} content — { text, imageUrl, link, platforms? }
   */
  async publish(content) {
    const platforms = content.platforms || this.platforms;
    if (!platforms.length) return { published: [], skipped: "no platforms configured" };

    const results = [];
    for (const platform of platforms) {
      try {
        const res = await this.api?.post(this.webhook, {
          platform,
          text:     content.text,
          imageUrl: content.imageUrl || null,
          link:     content.link     || null,
        });
        results.push({ platform, status: "ok", res });
      } catch (err) {
        results.push({ platform, status: "error", error: err.message });
      }
    }

    this._logPublish(content.text, results);
    return { published: results };
  }

  /**
   * مراقبة DOM للمحتوى الجديد ونشره آلياً
   * يُفعَّل من لوحة التحكم
   */
  startAutoPublish(intervalMinutes = 60) {
    if (this._watchInterval) clearInterval(this._watchInterval);

    this._watchInterval = setInterval(async () => {
      const pending = this._getPendingContent();
      for (const item of pending) {
        await this.publish(item);
        this._markPublished(item.id);
      }
    }, intervalMinutes * 60_000);

    return this;
  }

  stopAutoPublish() {
    if (this._watchInterval) {
      clearInterval(this._watchInterval);
      this._watchInterval = null;
    }
  }

  /** إضافة محتوى لطابور النشر */
  queueContent(item) {
    const pending = this._getPendingContent();
    pending.push({ ...item, id: Date.now(), queued: true, published: false });
    localStorage.setItem("jenan_publish_queue", JSON.stringify(pending));
  }

  /* ============ منطق داخلي ============ */

  _setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
    el.content = content;
  }

  _setOg(property, content) {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
    el.content = content;
  }

  _injectSchema(schema) {
    let el = document.getElementById("jenan-schema-" + schema["@type"]);
    if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = "jenan-schema-" + schema["@type"]; document.head.appendChild(el); }
    el.textContent = JSON.stringify(schema);
  }

  _getPendingContent() {
    return JSON.parse(localStorage.getItem("jenan_publish_queue") || "[]").filter(i => !i.published);
  }

  _markPublished(id) {
    const all = JSON.parse(localStorage.getItem("jenan_publish_queue") || "[]");
    const idx = all.findIndex(i => i.id === id);
    if (idx !== -1) { all[idx].published = true; localStorage.setItem("jenan_publish_queue", JSON.stringify(all)); }
  }

  _logPublish(text, results) {
    const log = JSON.parse(localStorage.getItem("jenan_publish_log") || "[]");
    log.push({ text: text?.slice(0, 100), results, ts: Date.now() });
    localStorage.setItem("jenan_publish_log", JSON.stringify(log.slice(-100)));
  }
}

let jenanSeo;
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    jenanSeo = new SeoBot(
      typeof jenanApi     !== "undefined" ? jenanApi     : null,
      typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.social : {}
    );
    jenanSeo.injectOrganizationSchema();
  });
}

if (typeof module !== "undefined") module.exports = { SeoBot };
