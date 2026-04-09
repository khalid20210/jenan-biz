/**
 * business-analyzer.js — محلل المشاريع ومولّد دراسات الجدوى
 * يحلل رأس المال والمنطقة ويولد تقرير فوري + استدعاء OpenAI للدراسة التفصيلية
 */

class BusinessAnalyzer {
  constructor(apiClient, loyaltyEngine, config = {}) {
    this.api      = apiClient;
    this.loyalty  = loyaltyEngine;
    this.cfg      = config;
    this.disclaimer = (typeof JENAN_CONFIG !== "undefined")
      ? JENAN_CONFIG.legal.disclaimer
      : "التحليل لأغراض إرشادية فقط. دون أدنى مسؤولية على جنان بيز.";
  }

  /* ============ تحليل المشروع الفوري (بدون AI) ============ */

  /**
   * @param {object} input
   * {
   *   capital:   number,   // رأس المال بالريال
   *   area:      number,   // المساحة بالمتر المربع
   *   region:    string,   // المنطقة (الرياض/جدة...)
   *   sector:    string,   // القطاع (مطعم/صالون/...)
   *   monthlyRent:   number,
   *   numEmployees:  number,
   *   avgTicket:     number,  // متوسط الفاتورة اليومية
   *   userId:    string,
   * }
   */
  quickAnalysis(input) {
    this._validateInput(input);

    const { capital, monthlyRent, numEmployees, avgTicket } = input;

    // --- حسابات جدوى مبسطة ---
    const monthlySalaries  = numEmployees * 3500;    // متوسط راتب شامل
    const monthlyUtilities = Math.round(capital * 0.005); // 0.5% من رأس المال
    const monthlyMarketing = Math.round(capital * 0.01);
    const monthlyFixed     = monthlyRent + monthlySalaries + monthlyUtilities + monthlyMarketing;

    const monthlyRevenue   = avgTicket * 26; // 26 يوم عمل
    const monthlyProfit    = monthlyRevenue - monthlyFixed;
    const breakEvenMonths  = monthlyProfit > 0 ? Math.ceil(capital / monthlyProfit) : null;
    const roi12m           = monthlyProfit > 0 ? ((monthlyProfit * 12 / capital) * 100).toFixed(1) : "0";

    const riskLevel = this._calcRisk({ capital, monthlyFixed, monthlyRevenue, breakEvenMonths });

    const report = {
      input,
      results: {
        monthlyFixed,
        monthlyRevenue,
        monthlyProfit,
        breakEvenMonths,
        roi12m: `${roi12m}%`,
        riskLevel,
        riskLabel: { low: "منخفض", medium: "متوسط", high: "مرتفع" }[riskLevel],
        recommendation: this._buildRecommendation(riskLevel, breakEvenMonths, monthlyProfit),
      },
      disclaimer: this.disclaimer,
      generatedAt: new Date().toLocaleString("ar-SA"),
    };

    // منح نقاط
    if (input.userId && this.loyalty) {
      this.loyalty.award(input.userId, "use_analyzer", { sector: input.sector });
    }

    return report;
  }

  /* ============ دراسة الجدوى بالذكاء الاصطناعي ============ */

  async generateFeasibilityStudy(input, depth = "simplified") {
    this._validateInput(input);

    const quick = this.quickAnalysis(input);

    const prompt = this._buildPrompt(input, quick, depth);

    // ضخ الطلب عبر الطابور
    const studyText = await jenanQueue.enqueue(
      () => this.api.generateStudy({ prompt, depth }),
      { userId: input.userId, label: "feasibility_study", priority: 5 }
    );

    const fullStudy = {
      summary:    quick.results,
      aiStudy:    studyText.content || studyText,
      depth,
      disclaimer: this.disclaimer,
      generatedAt: new Date().toLocaleString("ar-SA"),
    };

    // نقاط
    if (input.userId && this.loyalty) {
      this.loyalty.award(input.userId, "generate_study", { sector: input.sector, depth });
    }

    return fullStudy;
  }

  /* ============ منطق داخلي ============ */

  _validateInput(input) {
    const required = ["capital", "monthlyRent", "numEmployees", "avgTicket", "sector"];
    required.forEach(f => {
      if (input[f] === undefined || input[f] === null || input[f] === "")
        throw new Error(`الحقل "${f}" مطلوب.`);
    });
    if (input.capital < 10000) throw new Error("رأس المال يجب أن يكون 10,000 ريال على الأقل.");
  }

  _calcRisk({ capital, monthlyFixed, monthlyRevenue, breakEvenMonths }) {
    if (!breakEvenMonths || breakEvenMonths > 36) return "high";
    if (breakEvenMonths > 18 || monthlyRevenue < monthlyFixed * 1.2) return "medium";
    return "low";
  }

  _buildRecommendation(risk, bep, profit) {
    if (risk === "high") return "المشروع يحمل مخاطر عالية. راجع تكاليفك الثابتة وابحث عن مصادر إيراد إضافية.";
    if (risk === "medium") return `نقطة التعادل خلال ${bep} شهراً. ننصح بتقليل التكاليف أو رفع متوسط الفاتورة.`;
    return `المشروع جيد! متوقع تحقيق ربح ${profit.toLocaleString("ar-SA")} ريال/شهر والوصول لنقطة التعادل خلال ${bep} شهراً.`;
  }

  _buildPrompt(input, quick, depth) {
    const r = quick.results;
    return `أنت مستشار أعمال محترف. قدّم دراسة جدوى ${depth === "detailed" ? "مفصلة" : "مبسطة"} باللغة العربية للمشروع التالي:
القطاع: ${input.sector}
المنطقة: ${input.region || "غير محددة"}
رأس المال: ${input.capital.toLocaleString("ar-SA")} ريال
المساحة: ${input.area || "غير محددة"} م²
الإيجار الشهري: ${input.monthlyRent.toLocaleString("ar-SA")} ريال
عدد الموظفين: ${input.numEmployees}
متوسط الإيراد اليومي المتوقع: ${input.avgTicket.toLocaleString("ar-SA")} ريال

نتائج التحليل الأولية:
- التكاليف الثابتة الشهرية: ${r.monthlyFixed.toLocaleString("ar-SA")} ريال
- الإيراد الشهري المتوقع: ${r.monthlyRevenue.toLocaleString("ar-SA")} ريال
- صافي الربح الشهري: ${r.monthlyProfit.toLocaleString("ar-SA")} ريال
- نقطة التعادل: ${r.breakEvenMonths || "غير محددة"} شهراً
- مستوى المخاطر: ${r.riskLabel}

الدراسة المطلوبة تشمل: ملخص تنفيذي، تحليل السوق، الفرص والمخاطر، التوصيات، وخطة العمل.
في نهاية الدراسة أضف: "${this.disclaimer}"`;
  }
}

// تهيئة بعد تحميل التبعيات
let jenanAnalyzer;
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    jenanAnalyzer = new BusinessAnalyzer(
      typeof jenanApi      !== "undefined" ? jenanApi      : null,
      typeof jenanLoyalty  !== "undefined" ? jenanLoyalty  : null,
    );
  });
}

if (typeof module !== "undefined") module.exports = { BusinessAnalyzer };
