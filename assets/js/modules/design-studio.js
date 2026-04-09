/**
 * design-studio.js — استوديو التصميم والهوية البصرية
 * يولد شعارات، خطابات، بطاقات أعمال، وقوالب هوية متكاملة آلياً
 */

class DesignStudio {
  constructor(loyalty, api, config = {}) {
    this.loyalty   = loyalty;
    this.api       = api;
    this.fonts     = config.fonts    || ["Tajawal", "Cairo"];
    this.templates = config.templates || [];
    this.defaultPrimary   = config.defaultPrimary   || "#4E73C2";
    this.defaultSecondary = config.defaultSecondary || "#f4a623";
  }

  /* ============ توليد الشعار (SVG) ============ */

  generateLogo({ businessName, slogan = "", primary, secondary, shape = "circle" }) {
    const p = primary   || this.defaultPrimary;
    const s = secondary || this.defaultSecondary;
    const initials = this._arabicInitials(businessName);

    const shapes = {
      circle:  `<circle cx="60" cy="60" r="55" fill="${p}"/>`,
      hexagon: `<polygon points="60,5 111,30 111,90 60,115 9,90 9,30" fill="${p}"/>`,
      square:  `<rect x="5" y="5" width="110" height="110" rx="16" fill="${p}"/>`,
    };

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130" width="200" height="220">
  ${shapes[shape] || shapes.circle}
  <text x="60" y="70" text-anchor="middle" font-family="${this.fonts[0]}" font-size="32"
        fill="white" font-weight="bold">${initials}</text>
  <text x="60" y="125" text-anchor="middle" font-family="${this.fonts[0]}" font-size="10"
        fill="${s}">${businessName}</text>
</svg>`;

    if (this.loyalty) this.loyalty.award(
      this._getCurrentUserId(), "generate_design", { type: "logo" }
    );

    return { svg, type: "logo", businessName };
  }

  /* ============ توليد ورق رسمي (HTML → PDF) ============ */

  generateLetterhead({ businessName, sector, phone, email, address, primary, logo }) {
    const p = primary || this.defaultPrimary;
    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
<style>
  body{font-family:'Tajawal',sans-serif;margin:0;padding:0;}
  .header{background:${p};color:#fff;padding:24px 40px;display:flex;
          justify-content:space-between;align-items:center;}
  .header h1{margin:0;font-size:28px;}
  .header .info{font-size:13px;text-align:left;line-height:1.8;}
  .content{min-height:600px;padding:40px;}
  .footer{background:#f5f5f5;padding:12px 40px;text-align:center;font-size:12px;color:#666;
          border-top:3px solid ${p};}
  .disclaimer{font-size:10px;color:#999;margin-top:8px;}
</style></head>
<body>
  <div class="header">
    <div><h1>${businessName}</h1><small>${sector || ""}</small></div>
    <div class="info">
      📞 ${phone || ""}<br>
      ✉️ ${email || ""}<br>
      📍 ${address || ""}
    </div>
  </div>
  <div class="content">
    <!-- محتوى الخطاب هنا -->
  </div>
  <div class="footer">
    ${businessName} | ${new Date().getFullYear()}
    <div class="disclaimer">${typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.legal.disclaimer : ""}</div>
  </div>
</body></html>`;

    if (this.loyalty) this.loyalty.award(
      this._getCurrentUserId(), "generate_design", { type: "letterhead" }
    );

    return { html, type: "letterhead" };
  }

  /* ============ بطاقة أعمال (SVG) ============ */

  generateBusinessCard({ name, title, phone, email, website, primary, secondary }) {
    const p = primary   || this.defaultPrimary;
    const s = secondary || this.defaultSecondary;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 200" width="350" height="200">
  <rect width="350" height="200" rx="12" fill="${p}"/>
  <rect x="16" y="16" width="318" height="168" rx="8" fill="none" stroke="${s}" stroke-width="2"/>
  <text x="24" y="55" font-family="${this.fonts[0]}" font-size="22" fill="white" font-weight="bold">${name || ""}</text>
  <text x="24" y="80" font-family="${this.fonts[0]}" font-size="14" fill="${s}">${title || ""}</text>
  <line x1="24" y1="95" x2="326" y2="95" stroke="${s}" stroke-width="1" opacity="0.5"/>
  <text x="24" y="120" font-family="${this.fonts[0]}" font-size="12" fill="white">📞 ${phone || ""}</text>
  <text x="24" y="142" font-family="${this.fonts[0]}" font-size="12" fill="white">✉️ ${email || ""}</text>
  <text x="24" y="164" font-family="${this.fonts[0]}" font-size="12" fill="white">🌐 ${website || ""}</text>
</svg>`;

    if (this.loyalty) this.loyalty.award(
      this._getCurrentUserId(), "generate_design", { type: "business_card" }
    );

    return { svg, type: "business_card" };
  }

  /* ============ قالب منشور سوشيال ============ */

  generateSocialPost({ headline, body, hashtags = [], primary, secondary }) {
    const p = primary   || this.defaultPrimary;
    const s = secondary || this.defaultSecondary;
    const tags = hashtags.map(h => `#${h}`).join(" ");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="400" height="400">
  <rect width="1080" height="1080" fill="${p}"/>
  <rect x="40" y="40" width="1000" height="1000" rx="24" fill="none" stroke="${s}" stroke-width="6"/>
  <text x="540" y="200" text-anchor="middle" font-family="${this.fonts[0]}" font-size="72"
        fill="white" font-weight="bold">${headline || ""}</text>
  <text x="540" y="340" text-anchor="middle" font-family="${this.fonts[0]}" font-size="40" fill="#eee">${body || ""}</text>
  <text x="540" y="980" text-anchor="middle" font-family="${this.fonts[0]}" font-size="30" fill="${s}">${tags}</text>
</svg>`;

    if (this.loyalty) this.loyalty.award(
      this._getCurrentUserId(), "generate_design", { type: "social_post" }
    );

    return { svg, type: "social_post" };
  }

  /* ============ تحميل SVG كـ PNG ============ */

  async downloadAsPng(svg, filename = "jenan-design") {
    return new Promise((resolve) => {
      const blob   = new Blob([svg], { type: "image/svg+xml" });
      const url    = URL.createObjectURL(blob);
      const img    = new Image();
      img.onload   = () => {
        const canvas = document.createElement("canvas");
        canvas.width  = img.width  || 800;
        canvas.height = img.height || 600;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          const a  = document.createElement("a");
          a.href   = URL.createObjectURL(blob);
          a.download = `${filename}.png`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        });
      };
      img.src = url;
    });
  }

  /* ============ منطق داخلي ============ */

  _arabicInitials(name = "") {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("") || "ج";
  }

  _getCurrentUserId() {
    try {
      const s = JSON.parse(localStorage.getItem("jenan_session") || "{}");
      return s.user?.id || "anonymous";
    } catch { return "anonymous"; }
  }
}

let jenanDesign;
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    jenanDesign = new DesignStudio(
      typeof jenanLoyalty !== "undefined" ? jenanLoyalty : null,
      typeof jenanApi     !== "undefined" ? jenanApi     : null,
      typeof JENAN_CONFIG !== "undefined" ? JENAN_CONFIG.design : {}
    );
  });
}

if (typeof module !== "undefined") module.exports = { DesignStudio };
