"""
pdf_generator.py — توليد PDF احترافي لجنان بيز
يستخدم: reportlab (شهادات) + weasyprint (تقارير HTML→PDF)
"""

import io
import os
import hashlib
import qrcode
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image as RLImage,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF

from PIL import Image as PILImage
from xhtml2pdf import pisa
from loguru import logger

# ─── مسارات الأصول ───────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
LOGO_PATH  = BASE_DIR / "logo.png"
FONTS_DIR  = BASE_DIR / "assets" / "fonts"

# ─── ألوان جنان بيز ──────────────────────────────────
COLOR_NAVY   = colors.HexColor("#1a2a5e")   # الكحلي الرئيسي
COLOR_GOLD   = colors.HexColor("#c9a84c")   # الذهبي
COLOR_LIGHT  = colors.HexColor("#f0f4ff")   # خلفية فاتحة
COLOR_WHITE  = colors.white
COLOR_GRAY   = colors.HexColor("#666666")
COLOR_GREEN  = colors.HexColor("#1a7a4a")


def _register_arabic_font() -> bool:
    """
    يسجّل خط عربي إذا كان متوفراً.
    يبحث في assets/fonts/ عن أي ملف .ttf عربي.
    إن لم يُوجد، يُعيد False ويستخدم Helvetica.
    """
    candidates = [
        FONTS_DIR / "NotoSansArabic-Regular.ttf",
        FONTS_DIR / "Amiri-Regular.ttf",
        FONTS_DIR / "Cairo-Regular.ttf",
        FONTS_DIR / "Tajawal-Regular.ttf",
    ]
    for font_path in candidates:
        if font_path.exists():
            try:
                pdfmetrics.registerFont(TTFont("Arabic", str(font_path)))
                logger.info(f"تم تسجيل الخط: {font_path.name}")
                return True
            except Exception as e:
                logger.warning(f"فشل تسجيل الخط {font_path.name}: {e}")
    return False


_ARABIC_FONT_AVAILABLE = _register_arabic_font()
_BASE_FONT = "Arabic" if _ARABIC_FONT_AVAILABLE else "Helvetica"


# ══════════════════════════════════════════════════════
#  1. شهادات الأكاديمية — Certificate PDF
# ══════════════════════════════════════════════════════

def _make_qr_image(data: str, size_px: int = 200) -> io.BytesIO:
    """يولّد صورة QR code ويعيدها كـ BytesIO."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=6,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a2a5e", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def generate_certificate_pdf(
    cert_id: str,
    user_name: str,
    track_name: str,
    issued_at: str,
    verify_url: str,
) -> bytes:
    """
    يُنشئ شهادة إتمام بتصميم احترافي بصيغة PDF.
    يعيد bytes جاهزة للإرسال كـ StreamingResponse.
    """
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    # ─── الأنماط ───────────────────────────────────────
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CertTitle",
        fontName=_BASE_FONT,
        fontSize=32,
        textColor=COLOR_NAVY,
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
        leading=40,
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        fontName=_BASE_FONT,
        fontSize=14,
        textColor=COLOR_GRAY,
        alignment=TA_CENTER,
        spaceAfter=8 * mm,
    )
    name_style = ParagraphStyle(
        "CertName",
        fontName=_BASE_FONT,
        fontSize=26,
        textColor=COLOR_GOLD,
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
        leading=34,
    )
    track_style = ParagraphStyle(
        "CertTrack",
        fontName=_BASE_FONT,
        fontSize=18,
        textColor=COLOR_NAVY,
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
    )
    small_style = ParagraphStyle(
        "CertSmall",
        fontName=_BASE_FONT,
        fontSize=10,
        textColor=COLOR_GRAY,
        alignment=TA_CENTER,
    )
    id_style = ParagraphStyle(
        "CertId",
        fontName=_BASE_FONT,
        fontSize=8,
        textColor=COLOR_GRAY,
        alignment=TA_CENTER,
    )

    # ─── بناء المحتوى ─────────────────────────────────
    story = []

    # شريط علوي
    header_data = [[Paragraph("أكاديمية جنان للمال والأعمال", ParagraphStyle(
        "H", fontName=_BASE_FONT, fontSize=14,
        textColor=COLOR_WHITE, alignment=TA_CENTER
    ))]]
    header_table = Table(header_data, colWidths=[doc.width])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_NAVY),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 1 * cm))

    # الشعار
    if LOGO_PATH.exists():
        try:
            logo_buf = io.BytesIO(LOGO_PATH.read_bytes())
            logo = RLImage(logo_buf, width=3 * cm, height=3 * cm)
            logo.hAlign = "CENTER"
            story.append(logo)
            story.append(Spacer(1, 4 * mm))
        except Exception:
            pass

    # العنوان الرئيسي
    story.append(Paragraph("شهادة إتمام", title_style))
    story.append(HRFlowable(width="60%", thickness=2, color=COLOR_GOLD, hAlign="CENTER"))
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("تُشهد أكاديمية جنان للمال والأعمال بأن", subtitle_style))
    story.append(Spacer(1, 3 * mm))

    # اسم المتدرب
    story.append(Paragraph(user_name, name_style))
    story.append(HRFlowable(width="40%", thickness=1, color=COLOR_GOLD, hAlign="CENTER"))
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("قد أتمّ بنجاح متطلبات مسار", subtitle_style))
    story.append(Spacer(1, 2 * mm))

    # اسم المسار
    story.append(Paragraph(track_name, track_style))
    story.append(Spacer(1, 6 * mm))

    # التاريخ ورقم الشهادة
    date_cert_data = [
        [
            Paragraph(f"تاريخ الإصدار\n{issued_at}", small_style),
            Paragraph("", small_style),  # فراغ للـ QR
            Paragraph(f"رقم الشهادة\n{cert_id}", small_style),
        ]
    ]

    # QR code
    qr_buf = _make_qr_image(verify_url, 200)
    qr_img = RLImage(qr_buf, width=2.5 * cm, height=2.5 * cm)

    footer_data = [
        [
            Paragraph(f"تاريخ الإصدار: {issued_at}", small_style),
            qr_img,
            Paragraph(f"رقم الشهادة: {cert_id}", small_style),
        ]
    ]
    footer_table = Table(footer_data, colWidths=[doc.width * 0.4, doc.width * 0.2, doc.width * 0.4])
    footer_table.setStyle(TableStyle([
        ("ALIGN",  (0, 0), (0, 0), "LEFT"),
        ("ALIGN",  (1, 0), (1, 0), "CENTER"),
        ("ALIGN",  (2, 0), (2, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(footer_table)
    story.append(Spacer(1, 3 * mm))

    story.append(Paragraph(f"للتحقق من صحة الشهادة: {verify_url}", id_style))
    story.append(Spacer(1, 4 * mm))

    # شريط سفلي
    footer_bar_data = [[Paragraph(
        "جنان بيز — منصة ريادة الأعمال السعودية  |  rawad.jenan.biz",
        ParagraphStyle("FB", fontName=_BASE_FONT, fontSize=9,
                       textColor=COLOR_WHITE, alignment=TA_CENTER)
    )]]
    footer_bar = Table(footer_bar_data, colWidths=[doc.width])
    footer_bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_NAVY),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(footer_bar)

    # ─── البناء ────────────────────────────────────────
    doc.build(story)
    buf.seek(0)
    return buf.read()


# ══════════════════════════════════════════════════════
#  2. تقارير الجدوى — Feasibility Report PDF
# ══════════════════════════════════════════════════════

_REPORT_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Arial', 'Tahoma', sans-serif;
    font-size: 12pt;
    color: #222;
    background: #fff;
    direction: rtl;
  }}
  .page {{ padding: 20mm 18mm; min-height: 297mm; }}

  /* الترويسة */
  .header {{
    background: linear-gradient(135deg, #1a2a5e 0%, #2d4090 100%);
    color: white;
    padding: 18px 24px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }}
  .header-logo {{ width: 60px; height: 60px; object-fit: contain; }}
  .header-text h1 {{ font-size: 22pt; font-weight: 900; margin-bottom: 4px; }}
  .header-text p {{ font-size: 10pt; opacity: 0.85; }}

  /* البطاقات */
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 20px 0;
  }}
  .kpi-card {{
    background: #f0f4ff;
    border: 1px solid #d0d9f5;
    border-radius: 8px;
    padding: 14px;
    text-align: center;
  }}
  .kpi-card .label {{ font-size: 9pt; color: #666; margin-bottom: 4px; }}
  .kpi-card .value {{ font-size: 18pt; font-weight: 700; color: #1a2a5e; }}
  .kpi-card .unit  {{ font-size: 9pt; color: #888; }}
  .kpi-card.green .value {{ color: #1a7a4a; }}
  .kpi-card.red   .value {{ color: #c0392b; }}

  /* العناوين */
  h2 {{
    font-size: 14pt;
    font-weight: 700;
    color: #1a2a5e;
    border-right: 4px solid #c9a84c;
    padding-right: 10px;
    margin: 20px 0 10px;
  }}

  /* الجداول */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10pt;
  }}
  th {{
    background: #1a2a5e;
    color: white;
    padding: 8px 12px;
    text-align: right;
    font-weight: 600;
  }}
  td {{
    padding: 7px 12px;
    border-bottom: 1px solid #e8ecf5;
    text-align: right;
  }}
  tr:nth-child(even) td {{ background: #f8f9ff; }}

  /* التنبيه */
  .disclaimer {{
    background: #fff8e1;
    border: 1px solid #f0c040;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 9pt;
    color: #7a6000;
    margin-top: 24px;
  }}

  /* الفوتر */
  .footer {{
    background: #1a2a5e;
    color: white;
    text-align: center;
    padding: 10px;
    font-size: 9pt;
    border-radius: 0 0 8px 8px;
    margin-top: 24px;
  }}

  /* شارة الحالة */
  .badge {{
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 9pt;
    font-weight: 600;
  }}
  .badge-green  {{ background: #d4edda; color: #155724; }}
  .badge-yellow {{ background: #fff3cd; color: #856404; }}
  .badge-red    {{ background: #f8d7da; color: #721c24; }}

  /* تخطيط عمودان */
  .two-col {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 10px 0;
  }}
  .info-box {{
    background: #f8f9ff;
    border: 1px solid #d0d9f5;
    border-radius: 6px;
    padding: 12px;
  }}
  .info-box .item {{ display: flex; justify-content: space-between; padding: 4px 0;
                     border-bottom: 1px dashed #dde3f0; font-size: 10pt; }}
  .info-box .item:last-child {{ border-bottom: none; }}
  .info-box .item .k {{ color: #555; }}
  .info-box .item .v {{ font-weight: 600; color: #1a2a5e; }}
</style>
</head>
<body>
<div class="page">

  <!-- الترويسة -->
  <div class="header">
    {logo_tag}
    <div class="header-text">
      <h1>تقرير الجدوى الاقتصادية</h1>
      <p>قطاع: {sector} &nbsp;|&nbsp; المنطقة: {region} &nbsp;|&nbsp; تاريخ التقرير: {report_date}</p>
    </div>
  </div>

  <!-- المؤشرات الرئيسية -->
  <h2>المؤشرات المالية الرئيسية</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="label">رأس المال</div>
      <div class="value">{capital:,.0f}</div>
      <div class="unit">ريال</div>
    </div>
    <div class="kpi-card {profit_class}">
      <div class="label">صافي الربح الشهري</div>
      <div class="value">{monthly_profit:,.0f}</div>
      <div class="unit">ريال</div>
    </div>
    <div class="kpi-card {roi_class}">
      <div class="label">العائد على الاستثمار</div>
      <div class="value">{roi:.1f}%</div>
      <div class="unit">سنوياً</div>
    </div>
    <div class="kpi-card">
      <div class="label">نقطة التعادل (شهري)</div>
      <div class="value">{break_even:,.0f}</div>
      <div class="unit">ريال مبيعات</div>
    </div>
    <div class="kpi-card">
      <div class="label">فترة الاسترداد</div>
      <div class="value">{payback_months:.0f}</div>
      <div class="unit">شهر</div>
    </div>
    <div class="kpi-card">
      <div class="label">هامش الربح</div>
      <div class="value">{profit_margin:.1f}%</div>
      <div class="unit">من الإيرادات</div>
    </div>
  </div>

  <!-- تفاصيل التكاليف والإيرادات -->
  <div class="two-col">
    <div class="info-box">
      <h2 style="margin-top:0;margin-bottom:8px;font-size:12pt;">التكاليف الشهرية</h2>
      <div class="item"><span class="k">الإيجار</span><span class="v">{monthly_rent:,.0f} ر</span></div>
      <div class="item"><span class="k">الرواتب ({num_employees} موظف)</span><span class="v">{monthly_salaries:,.0f} ر</span></div>
      <div class="item"><span class="k">المرافق والصيانة</span><span class="v">{monthly_utilities:,.0f} ر</span></div>
      <div class="item"><span class="k">التسويق</span><span class="v">{monthly_marketing:,.0f} ر</span></div>
      <div class="item" style="border-top:2px solid #1a2a5e;margin-top:4px;padding-top:6px;">
        <span class="k" style="font-weight:700;">إجمالي التكاليف</span>
        <span class="v" style="color:#c0392b;">{monthly_fixed:,.0f} ر</span>
      </div>
    </div>
    <div class="info-box">
      <h2 style="margin-top:0;margin-bottom:8px;font-size:12pt;">الإيرادات والربحية</h2>
      <div class="item"><span class="k">متوسط المبيعات اليومي</span><span class="v">{avg_daily_revenue:,.0f} ر</span></div>
      <div class="item"><span class="k">إجمالي الإيرادات الشهرية</span><span class="v">{monthly_revenue:,.0f} ر</span></div>
      <div class="item"><span class="k">صافي الربح الشهري</span><span class="v" style="color:{profit_color};">{monthly_profit:,.0f} ر</span></div>
      <div class="item"><span class="k">صافي الربح السنوي</span><span class="v" style="color:{profit_color};">{annual_profit:,.0f} ر</span></div>
    </div>
  </div>

  <!-- التوقعات ثلاث سنوات -->
  <h2>التوقعات المالية (3 سنوات)</h2>
  <table>
    <tr>
      <th>السنة</th>
      <th>الإيرادات المتوقعة</th>
      <th>التكاليف المتوقعة</th>
      <th>صافي الربح</th>
      <th>العائد التراكمي</th>
    </tr>
    {projection_rows}
  </table>

  <!-- تقييم المشروع -->
  <h2>تقييم المشروع</h2>
  <table>
    <tr>
      <th>المعيار</th>
      <th>القيمة</th>
      <th>التقييم</th>
    </tr>
    <tr>
      <td>فترة الاسترداد</td>
      <td>{payback_months:.0f} شهر</td>
      <td><span class="badge {payback_badge}">{payback_label}</span></td>
    </tr>
    <tr>
      <td>هامش الربح الصافي</td>
      <td>{profit_margin:.1f}%</td>
      <td><span class="badge {margin_badge}">{margin_label}</span></td>
    </tr>
    <tr>
      <td>العائد على الاستثمار (ROI)</td>
      <td>{roi:.1f}% سنوياً</td>
      <td><span class="badge {roi_badge}">{roi_label}</span></td>
    </tr>
    <tr>
      <td>السيولة الشهرية</td>
      <td>{monthly_profit:,.0f} ريال</td>
      <td><span class="badge {liquidity_badge}">{liquidity_label}</span></td>
    </tr>
  </table>

  <!-- التنبيه القانوني -->
  <div class="disclaimer">
    ⚠️ جميع التحليلات والأرقام الواردة في هذا التقرير هي لأغراض إرشادية فحسب، مبنية على المدخلات المقدمة
    ولا تمثل ضماناً أو التزاماً قانونياً أو مالياً. يتحمل المستخدم كامل المسؤولية عن قراراته الاستثمارية.
    جنان بيز — {report_date}
  </div>

  <div class="footer">
    جنان بيز — منصة ريادة الأعمال السعودية &nbsp;|&nbsp; rawad.jenan.biz &nbsp;|&nbsp; رقم التقرير: {report_id}
  </div>

</div>
</body>
</html>"""


def _badge(value: float, good_threshold: float, warn_threshold: float):
    """يعيد (class, label) حسب القيمة."""
    if value >= good_threshold:
        return "badge-green", "ممتاز"
    if value >= warn_threshold:
        return "badge-yellow", "مقبول"
    return "badge-red", "يحتاج مراجعة"


def generate_report_pdf(
    capital: float,
    monthly_rent: float,
    num_employees: int,
    avg_daily_revenue: float,
    sector: str,
    region: str = "غير محدد",
    report_id: str = "",
) -> bytes:
    """
    يولّد تقرير جدوى اقتصادية كامل بصيغة PDF باستخدام WeasyPrint.
    يعيد bytes جاهزة للإرسال.
    """
    # ─── الحسابات ──────────────────────────────────────
    monthly_salaries  = num_employees * 3500
    monthly_utilities = round(capital * 0.005)
    monthly_marketing = round(capital * 0.01)
    monthly_fixed     = monthly_rent + monthly_salaries + monthly_utilities + monthly_marketing
    monthly_revenue   = avg_daily_revenue * 26
    monthly_profit    = monthly_revenue - monthly_fixed
    annual_profit     = monthly_profit * 12
    roi               = (annual_profit / capital * 100) if capital > 0 else 0
    payback_months    = (capital / monthly_profit) if monthly_profit > 0 else 9999
    profit_margin     = (monthly_profit / monthly_revenue * 100) if monthly_revenue > 0 else 0
    break_even        = monthly_fixed

    # ─── التوقعات ثلاث سنوات ───────────────────────────
    growth_rates = [1.0, 1.12, 1.25]   # 0% + 12% + 25% نمو تراكمي
    cost_growth  = [1.0, 1.05, 1.10]
    cumulative   = 0.0
    projection_rows = ""
    for i, (gr, cr) in enumerate(zip(growth_rates, cost_growth), 1):
        yr_rev    = monthly_revenue * 12 * gr
        yr_cost   = monthly_fixed * 12 * cr
        yr_profit = yr_rev - yr_cost
        cumulative += yr_profit
        color = "#1a7a4a" if yr_profit >= 0 else "#c0392b"
        cum_color = "#1a7a4a" if cumulative >= 0 else "#c0392b"
        projection_rows += f"""
        <tr>
          <td>السنة {i}</td>
          <td>{yr_rev:,.0f} ريال</td>
          <td>{yr_cost:,.0f} ريال</td>
          <td style="color:{color};font-weight:600;">{yr_profit:,.0f} ريال</td>
          <td style="color:{cum_color};font-weight:600;">{cumulative:,.0f} ريال</td>
        </tr>"""

    # ─── التقييمات ─────────────────────────────────────
    payback_badge, payback_label = _badge(36 - payback_months, 12, 0)
    margin_badge,  margin_label  = _badge(profit_margin, 20, 10)
    roi_badge,     roi_label     = _badge(roi, 25, 10)
    liq_badge,     liq_label     = _badge(monthly_profit, 5000, 0)

    profit_class = "green" if monthly_profit >= 0 else "red"
    roi_class    = "green" if roi >= 10 else ("red" if roi < 0 else "")
    profit_color = "#1a7a4a" if monthly_profit >= 0 else "#c0392b"

    # ─── الشعار ────────────────────────────────────────
    logo_tag = ""
    if LOGO_PATH.exists():
        import base64
        logo_b64 = base64.b64encode(LOGO_PATH.read_bytes()).decode()
        logo_tag = f'<img class="header-logo" src="data:image/png;base64,{logo_b64}" alt="Logo">'

    html = _REPORT_HTML_TEMPLATE.format(
        logo_tag=logo_tag,
        sector=sector,
        region=region,
        report_date=datetime.now().strftime("%Y-%m-%d"),
        report_id=report_id or f"JB-{int(datetime.now().timestamp())}",
        capital=capital,
        monthly_rent=monthly_rent,
        num_employees=num_employees,
        avg_daily_revenue=avg_daily_revenue,
        monthly_salaries=monthly_salaries,
        monthly_utilities=monthly_utilities,
        monthly_marketing=monthly_marketing,
        monthly_fixed=monthly_fixed,
        monthly_revenue=monthly_revenue,
        monthly_profit=monthly_profit,
        annual_profit=annual_profit,
        roi=roi,
        payback_months=max(payback_months, 0),
        profit_margin=profit_margin,
        break_even=break_even,
        profit_class=profit_class,
        roi_class=roi_class,
        profit_color=profit_color,
        projection_rows=projection_rows,
        payback_badge=payback_badge, payback_label=payback_label,
        margin_badge=margin_badge,   margin_label=margin_label,
        roi_badge=roi_badge,         roi_label=roi_label,
        liquidity_badge=liq_badge,   liquidity_label=liq_label,
    )

    try:
        out = io.BytesIO()
        result = pisa.CreatePDF(html, dest=out, encoding="utf-8")
        if result.err:
            logger.error(f"xhtml2pdf errors: {result.err}")
            raise RuntimeError("xhtml2pdf: فشل توليد PDF")
        out.seek(0)
        return out.read()
    except Exception as e:
        logger.error(f"xhtml2pdf report error: {e}")
        raise


# ══════════════════════════════════════════════════════
#  3. تصدير دراسة الجدوى AI → PDF  (reportlab — دعم عربي كامل)
# ══════════════════════════════════════════════════════

def _get_arabic_font() -> tuple[str, str]:
    """
    يعيد (font_name, bold_name) — يبحث عن خطوط عربية على النظام.
    إذا لم يُوجد، يُعيد Helvetica.
    """
    # مرشحات خطوط عربية: مسارات Windows ثم assets/fonts
    candidates = [
        (Path("C:/Windows/Fonts/arial.ttf"),    Path("C:/Windows/Fonts/arialbd.ttf")),
        (Path("C:/Windows/Fonts/tahoma.ttf"),   Path("C:/Windows/Fonts/tahomabd.ttf")),
        (Path("C:/Windows/Fonts/arabtype.ttf"), None),
        (FONTS_DIR / "NotoSansArabic-Regular.ttf", FONTS_DIR / "NotoSansArabic-Bold.ttf"),
        (FONTS_DIR / "Amiri-Regular.ttf",          FONTS_DIR / "Amiri-Bold.ttf"),
    ]
    for regular, bold in candidates:
        if regular.exists():
            reg_name = f"StudyFont_{regular.stem}"
            try:
                pdfmetrics.registerFont(TTFont(reg_name, str(regular)))
            except Exception:
                continue
            bold_name = reg_name
            if bold and bold.exists():
                b_name = f"StudyFont_{bold.stem}"
                try:
                    pdfmetrics.registerFont(TTFont(b_name, str(bold)))
                    pdfmetrics.registerFontFamily(reg_name, normal=reg_name, bold=b_name)
                    bold_name = b_name
                except Exception:
                    pass
            logger.info(f"Study PDF — خط عربي: {regular.name}")
            return reg_name, bold_name
    logger.warning("Study PDF — لم يُعثر على خط عربي، سيُستخدم Helvetica")
    return "Helvetica", "Helvetica-Bold"


def _ar(text: str) -> str:
    """يُعيد النص بعد إعادة تشكيل العربية + BiDi للعرض الصحيح في reportlab."""
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def _study_build_story(content: str, study_id: str, date_str: str,
                        fn: str, fb: str) -> list:
    """يبني قائمة العناصر (story) لـ reportlab من نص الدراسة."""
    from reportlab.platypus import KeepTogether

    # ─── أنماط النصوص ───────────────────────────────
    base = ParagraphStyle(
        "StudyBase", fontName=fn, fontSize=11,
        leading=20, textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT, spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        "StudyH2", fontName=fb, fontSize=13,
        leading=20, textColor=colors.HexColor("#1a2a5e"),
        alignment=TA_RIGHT, spaceBefore=14, spaceAfter=6,
        borderPadding=(0, 0, 0, 8),
        leftIndent=0, rightIndent=0,
    )
    meta_style = ParagraphStyle(
        "StudyMeta", fontName=fn, fontSize=9,
        leading=14, textColor=colors.white,
        alignment=TA_RIGHT,
    )
    disc_style = ParagraphStyle(
        "StudyDisc", fontName=fn, fontSize=9,
        leading=14, textColor=colors.HexColor("#7a6000"),
        alignment=TA_RIGHT,
        backColor=colors.HexColor("#fff8e1"),
        borderColor=colors.HexColor("#f0c040"),
        borderWidth=1, borderRadius=4,
        borderPadding=8, spaceAfter=10,
    )

    story: list = []

    # ─── رأس الصفحة (خلفية كحلي) ─────────────────────
    header_data = [[
        Paragraph(_ar(f"تاريخ الإصدار: {date_str}    |    رقم الدراسة: {study_id}"), meta_style),
        Paragraph(_ar("دراسة الجدوى الاقتصادية"), ParagraphStyle(
            "StudyTitle", fontName=fb, fontSize=20, leading=26,
            textColor=colors.white, alignment=TA_RIGHT,
        )),
    ]]
    header_tbl = Table(header_data, colWidths=["35%", "65%"])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), colors.HexColor("#1a2a5e")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#1a2a5e")]),
        ("TOPPADDING",  (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING",  (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 14))

    # ─── شريط ذهبي ──────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=3,
                             color=colors.HexColor("#c9a84c"), spaceAfter=10))

    # ─── معالجة المحتوى: تقسيم السطور ──────────────
    for line in content.split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 6))
            continue
        # عناوين: السطور التي تبدأ بـ # أو تنتهي بـ : أو ##
        if line.startswith("##"):
            txt = line.lstrip("#").strip()
            story.append(Paragraph(_ar(txt), h2_style))
            story.append(HRFlowable(width="100%", thickness=1,
                                     color=colors.HexColor("#c9a84c"), spaceAfter=4))
        elif line.startswith("#"):
            txt = line.lstrip("#").strip()
            story.append(Paragraph(_ar(txt), ParagraphStyle(
                "StudyH1", fontName=fb, fontSize=15, leading=24,
                textColor=colors.HexColor("#1a2a5e"), alignment=TA_RIGHT,
                spaceBefore=10, spaceAfter=6,
            )))
        elif line.startswith(("•", "-", "*", "·")):
            txt = line[1:].strip()
            story.append(Paragraph("• " + _ar(txt), ParagraphStyle(
                "StudyBullet", fontName=fn, fontSize=11, leading=19,
                textColor=colors.HexColor("#333333"), alignment=TA_RIGHT,
                leftIndent=10, rightIndent=16, spaceAfter=3,
            )))
        else:
            story.append(Paragraph(_ar(line), base))

    # ─── تنبيه الذكاء الاصطناعي ─────────────────────
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        _ar("تنبيه: هذه الدراسة مولّدة بالذكاء الاصطناعي لأغراض إرشادية فحسب، "
            "ولا تمثّل ضماناً أو التزاماً قانونياً أو مالياً. "
            "يتحمّل المستخدم كامل المسؤولية عن قراراته الاستثمارية."),
        disc_style,
    ))

    # ─── تذييل ──────────────────────────────────────
    story.append(Spacer(1, 8))
    footer_data = [[Paragraph(
        _ar(f"جنان بيز — rawad.jenan.biz    |    {date_str}"),
        ParagraphStyle("StudyFooter", fontName=fn, fontSize=9,
                       textColor=colors.white, alignment=TA_CENTER),
    )]]
    footer_tbl = Table(footer_data, colWidths=["100%"])
    footer_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#1a2a5e")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(footer_tbl)
    return story


def generate_study_pdf(content: str, study_id: str = "") -> bytes:
    """يحوّل نص دراسة الجدوى المولّدة من AI إلى PDF منسّق (reportlab + دعم عربي)."""
    date_str  = datetime.now().strftime("%Y-%m-%d")
    study_id  = study_id or f"JS-{int(datetime.now().timestamp())}"
    fn, fb    = _get_arabic_font()

    out = io.BytesIO()
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        leftMargin=2 * cm,  rightMargin=2 * cm,
        title=f"دراسة الجدوى — {study_id}",
        author="جنان بيز",
    )
    try:
        story = _study_build_story(content, study_id, date_str, fn, fb)
        doc.build(story)
        out.seek(0)
        return out.read()
    except Exception as e:
        logger.error(f"generate_study_pdf error: {e}")
        raise
