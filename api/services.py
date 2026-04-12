"""
services.py — الـ Backend الخادم لجنان بيز
يعمل كـ proxy آمن لـ OpenAI ويوفر نقاط نهاية لجميع خدمات الذكاء الاصطناعي
التشغيل: uvicorn services:app --host 0.0.0.0 --port 8000
"""

import os
import json
import time
import hashlib
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import quote

# تحميل متغيّرات البيئة من ملف .env
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import openai
from openai import AsyncOpenAI
import httpx

# ---- Supabase ----
SUPABASE_URL      = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# ---- إعداد التطبيق ----
app = FastAPI(
    title="جنان بيز API",
    description="Backend services for Jenan Biz platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- خدمة الملفات الثابتة ----
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app.mount("/assets", StaticFiles(directory=os.path.join(BASE_DIR, "assets")), name="assets")
app.mount("/config", StaticFiles(directory=os.path.join(BASE_DIR, "config")), name="config")

@app.get("/")
async def root():
    resp = FileResponse(os.path.join(BASE_DIR, "auth.html"))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp

@app.get("/dashboard")
async def dashboard():
    resp = FileResponse(os.path.join(BASE_DIR, "dashboard.html"))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp

@app.get("/dashboard.html")
async def dashboard_html():
    resp = FileResponse(os.path.join(BASE_DIR, "dashboard.html"))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp

@app.get("/auth.html")
async def auth_html():
    resp = FileResponse(os.path.join(BASE_DIR, "auth.html"))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp

@app.get("/auth")
async def auth():
    resp = FileResponse(os.path.join(BASE_DIR, "auth.html"))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp

# ---- OpenAI Client (lazy — يُنشأ عند أول طلب فعلي) ----
_openai_client = None
def get_openai_client():
    global _openai_client
    if _openai_client is None:
        key = os.getenv("OPENAI_API_KEY", "")
        if not key or key.startswith("sk-test"):
            raise HTTPException(status_code=503, detail="مفتاح OpenAI غير مُضاف بعد — السيرفر يعمل في وضع التجربة")
        _openai_client = AsyncOpenAI(api_key=key)
    return _openai_client
client = type("LazyClient", (), {"__getattr__": lambda s,n: getattr(get_openai_client(), n)})()
DISCLAIMER = (
    "⚠️ جميع التحليلات والدراسات المقدمة من جنان بيز هي لأغراض إرشادية فحسب، "
    "دون أدنى مسؤولية قانونية أو مالية على المنصة أو القائمين عليها. "
    "يتحمل المستخدم كامل المسؤولية عن قراراته."
)

# ---- Rate Limiting بسيط (in-memory) ----
_rate_store: Dict[str, List[float]] = {}
RATE_LIMIT = 30  # طلب/دقيقة


def check_rate_limit(user_id: str) -> bool:
    now = time.time()
    window = 60.0
    calls = [t for t in _rate_store.get(user_id, []) if now - t < window]
    if len(calls) >= RATE_LIMIT:
        return False
    calls.append(now)
    _rate_store[user_id] = calls
    return True


def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        return "anonymous"
    token = authorization.split(" ", 1)[1]
    try:
        import base64
        payload = json.loads(base64.b64decode(token))
        return payload.get("id", "anonymous")
    except Exception:
        return "anonymous"


# ===================== النماذج =====================

class ProjectInput(BaseModel):
    capital:      float = Field(..., gt=0, description="رأس المال بالريال")
    monthly_rent: float = Field(..., ge=0)
    num_employees: int  = Field(..., ge=0)
    avg_daily_revenue: float = Field(..., ge=0)
    sector:       str
    region:       Optional[str] = ""
    area:         Optional[float] = None
    depth:        Optional[str] = "simplified"  # simplified | detailed


class GenerateStudyInput(BaseModel):
    prompt: str
    depth:  Optional[str] = "simplified"


class ChatMessage(BaseModel):
    role:    str  # system | user | assistant
    content: str


class ChatInput(BaseModel):
    messages: List[ChatMessage]


class DesignInput(BaseModel):
    business_name: str
    sector:        Optional[str] = ""
    primary_color: Optional[str] = "#4E73C2"
    style:         Optional[str] = "modern"


class CertificateInput(BaseModel):
    user_id:    str
    user_name:  str
    track_id:   str
    track_name: str


# ══════════════════ نماذج خدمات الجذب ══════════════════

class ExecSummaryInput(BaseModel):
    """ملخص المشروع التنفيذي السريع"""
    project_name: str = Field(..., min_length=2, max_length=120)
    idea:         str = Field(..., min_length=10, max_length=1000)
    depth:        Optional[str] = "full"   # "teaser" | "full"


class GovComplianceInput(BaseModel):
    """مدقق الامتثال الحكومي — قوى / مدد"""
    sector:          str               # نوع النشاط
    employee_count:  int = Field(..., ge=0)
    is_registered:   bool = True       # هل منشأة مسجلة؟
    has_cr:          bool = True       # سجل تجاري
    has_municipality:bool = False      # ترخيص بلدي
    has_gosi:        bool = False      # تأمينات
    has_iban:        bool = False      # ايبان مرتبط بمدد
    saudi_ratio:     float = Field(0.0, ge=0, le=100)   # نسبة السعوديين %


class FundingRadarInput(BaseModel):
    """رادار التمويل المبدئي"""
    capital:       float = Field(..., gt=0)
    region:        str
    sector:        str
    monthly_revenue: Optional[float] = 0
    num_employees: Optional[int]     = 0
    years_active:  Optional[int]     = 0   # سنوات التشغيل


# ===================== OTP — نماذج وتخزين =====================

# In-memory OTP store: { target: (code, expiry_ts, attempts) }
_otp_store: Dict[str, Tuple[str, float, int]] = {}
OTP_EXPIRY_SECS  = 300   # 5 دقائق
OTP_MAX_ATTEMPTS = 5

class OTPSendRequest(BaseModel):
    target: str          # بريد إلكتروني أو رقم جوال
    channel: str = "email"  # "email" | "sms"
    name: str = ""       # اسم المستخدم للتخصيص

class OTPVerifyRequest(BaseModel):
    target: str
    code: str


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


async def _send_via_supabase(email: str) -> bool:
    """
    يرسل OTP عبر Supabase Auth (لا يحتاج SMTP).
    يتطلب SUPABASE_URL + SUPABASE_ANON_KEY في .env
    يجب تفعيل "Email OTP" من: Supabase → Auth → Email → Enable OTP
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY or SUPABASE_ANON_KEY == "YOUR_SUPABASE_ANON_KEY_HERE":
        return False
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(
            f"{SUPABASE_URL}/auth/v1/otp",
            headers={
                "apikey":       SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            json={"email": email, "options": {"should_create_user": False}}
        )
    if r.status_code in (200, 201, 204):
        return True
    # Supabase رد *400* إذا البريد غير مسجّل — نعيد المحاولة بتسجيل مستخدم أولاً
    if r.status_code == 400:
        # سجّل المستخدم ثم أرسل الرمز
        r2 = await httpx.AsyncClient(timeout=10).post(
            f"{SUPABASE_URL}/auth/v1/otp",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": email, "options": {"should_create_user": True}}
        )
        return r2.status_code in (200, 201, 204)
    raise HTTPException(500, f"Supabase Auth error {r.status_code}: {r.text}")


async def _verify_via_supabase(email: str, token: str) -> bool:
    """يتحقق من رمز OTP عبر Supabase Auth."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY or SUPABASE_ANON_KEY == "YOUR_SUPABASE_ANON_KEY_HERE":
        return False
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(
            f"{SUPABASE_URL}/auth/v1/verify",
            headers={
                "apikey":       SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            json={"type": "email", "email": email, "token": token}
        )
    return r.status_code in (200, 201)


async def _send_email(to: str, otp: str, name: str = "") -> bool:
    """
    يرسل رمز OTP عبر SMTP (احتياطي إذا لم توجد Supabase).
    متغيرات .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
    """
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    pw   = os.getenv("SMTP_PASS", "")

    if not user or not pw:
        print(f"[DEV-OTP] {to}: {otp}")
        return False

    greeting  = f"مرحباً {name}," if name else "مرحباً،"
    html_body = f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
      <div style="background:#1a2a5e;padding:16px;border-radius:8px 8px 0 0;text-align:center">
        <h2 style="color:#fff;margin:0;font-size:20px">جنان بيز — رمز التحقق</h2>
      </div>
      <div style="background:#f8f9ff;padding:24px;border:1px solid #dde3f0;border-radius:0 0 8px 8px">
        <p style="color:#333">{greeting}</p>
        <p style="color:#555">استخدم الرمز التالي للتحقق من حسابك. صالح لمدة <strong>5 دقائق</strong>.</p>
        <div style="background:#fff;border:2px solid #1a2a5e;border-radius:8px;text-align:center;padding:20px;margin:20px 0">
          <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#1a2a5e">{otp}</span>
        </div>
        <p style="color:#888;font-size:13px">إذا لم تطلب هذا الرمز، تجاهل هذا البريد.</p>
      </div>
    </div>
    """
    msg            = MIMEMultipart("alternative")
    msg["Subject"] = f"رمز التحقق: {otp} — جنان بيز"
    msg["From"]    = f"جنان بيز <{user}>"
    msg["To"]      = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    try:
        with smtplib.SMTP(host, port, timeout=10) as srv:
            srv.ehlo(); srv.starttls(); srv.login(user, pw); srv.send_message(msg)
        return True
    except Exception as e:
        print(f"[SMTP-ERROR] {e}")
        raise HTTPException(500, f"خطأ في إرسال البريد: {e}")


async def _send_sms(phone: str, otp: str) -> bool:
    """
    يرسل رمز OTP عبر SMS.
    متغيرات البيئة:
      SMS_PROVIDER  — msegat | unifonic
      SMS_API_KEY   — مفتاح الـ API
      SMS_SENDER    — هوية المرسل (مثال: JenanBiz)
      SMS_USER_SENDER (لـ msegat فقط)
    """
    provider  = os.getenv("SMS_PROVIDER", "")
    api_key   = os.getenv("SMS_API_KEY", "")
    sender    = os.getenv("SMS_SENDER", "JenanBiz")
    msg_text  = f"رمز التحقق في جنان بيز: {otp} (صالح 5 دقائق)"

    if not provider or not api_key:
        print(f"[DEV-SMS] {phone}: {otp}")
        return False

    if provider == "msegat":
        user_sender = os.getenv("SMS_USER_SENDER", "")
        payload = {
            "userSender": user_sender,
            "apiKey":     api_key,
            "numbers":    phone,
            "msg":        msg_text,
            "msgEncoding": "UTF8"
        }
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post("https://www.msegat.com/gw/sendsms.php", json=payload)
    elif provider == "unifonic":
        payload = {
            "AppSid":      api_key,
            "SenderID":    sender,
            "Recipient":   phone,
            "Body":        msg_text,
        }
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post("https://el.cloud.unifonic.com/rest/SMS/messages", data=payload)
    else:
        raise HTTPException(500, f"SMS provider غير مدعوم: {provider}")

    if r.status_code not in (200, 201):
        raise HTTPException(500, f"فشل إرسال SMS: {r.text}")
    return True


# ===================== نقطتا OTP =====================

@app.post("/api/otp/send")
async def otp_send(req: OTPSendRequest):
    target = req.target.strip().lower()

    # الأولوية: Supabase Auth — يرسل بريد حقيقي دون SMTP
    if req.channel != "sms":
        try:
            supabase_sent = await _send_via_supabase(target)
            if supabase_sent:
                return {"success": True, "dev": False, "provider": "supabase"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"[SUPABASE-WARN] {e}")

    # الثاني: SMTP أو SMS
    otp    = _generate_otp()
    expiry = time.time() + OTP_EXPIRY_SECS
    _otp_store[target] = (otp, expiry, 0)

    if req.channel == "sms":
        sent = await _send_sms(req.target, otp)
    else:
        sent = await _send_email(req.target, otp, req.name)

    if sent:
        return {"success": True, "dev": False, "provider": "smtp"}
    else:
        # وضع التطوير — أعد الرمز ليظهر في الواجهة
        return {"success": True, "dev": True, "code": otp, "provider": "dev"}


@app.post("/api/otp/verify")
async def otp_verify(req: OTPVerifyRequest):
    target = req.target.strip().lower()
    code   = req.code.strip()

    # محاولة التحقق عبر Supabase Auth أولاً
    try:
        supabase_ok = await _verify_via_supabase(target, code)
        if supabase_ok:
            return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SUPABASE-VERIFY-WARN] {e}")

    # fallback — المخزن المحلي
    record = _otp_store.get(target)
    if not record:
        raise HTTPException(400, "لم يتم طلب رمز أو انتهت صلاحيته")

    stored_code, expiry, attempts = record
    if time.time() > expiry:
        del _otp_store[target]
        raise HTTPException(400, "انتهت صلاحية الرمز، اطلب رمزاً جديداً")
    if attempts >= OTP_MAX_ATTEMPTS:
        del _otp_store[target]
        raise HTTPException(429, "تجاوزت عدد المحاولات المسموحة")
    if code != stored_code:
        _otp_store[target] = (stored_code, expiry, attempts + 1)
        raise HTTPException(400, f"رمز غير صحيح ({OTP_MAX_ATTEMPTS - attempts - 1} محاولة متبقية)")

    del _otp_store[target]
    return {"success": True}


# ===================== نقاط النهاية =====================

@app.get("/health")
async def health():
    return {"status": "ok", "service": "جنان بيز API", "ts": datetime.utcnow().isoformat()}


# ---- تحليل المشروع السريع ----
@app.post("/api/analyze-project")
async def analyze_project(data: ProjectInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات. حاول بعد دقيقة.")

    monthly_salaries  = data.num_employees * 3500
    monthly_utilities = round(data.capital * 0.005)
    monthly_marketing = round(data.capital * 0.01)
    monthly_fixed     = data.monthly_rent + monthly_salaries + monthly_utilities + monthly_marketing

    monthly_revenue   = data.avg_daily_revenue * 26
    monthly_profit    = monthly_revenue - monthly_fixed
    breakeven_months  = round(data.capital / monthly_profit) if monthly_profit > 0 else None
    roi_12m           = round((monthly_profit * 12 / data.capital) * 100, 1) if monthly_profit > 0 else 0

    if not breakeven_months or breakeven_months > 36:
        risk = "high"
    elif breakeven_months > 18:
        risk = "medium"
    else:
        risk = "low"

    risk_labels = {"low": "منخفض", "medium": "متوسط", "high": "مرتفع"}

    return {
        "monthly_fixed":    monthly_fixed,
        "monthly_revenue":  monthly_revenue,
        "monthly_profit":   monthly_profit,
        "breakeven_months": breakeven_months,
        "roi_12m":          f"{roi_12m}%",
        "risk_level":       risk,
        "risk_label":       risk_labels[risk],
        "disclaimer":       DISCLAIMER,
        "generated_at":     datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


# ---- توليد دراسة الجدوى بـ OpenAI ----
@app.post("/api/generate-study")
async def generate_study(data: GenerateStudyInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    system_msg = (
        "أنت مستشار أعمال محترف متخصص في السوق السعودي. "
        "تكتب باللغة العربية الفصحى المبسطة. "
        "تحليلاتك دقيقة ومبنية على بيانات واقعية. "
        f"احرص على إضافة هذا التنبيه في النهاية: {DISCLAIMER}"
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": data.prompt},
            ],
            max_tokens=3000 if data.depth == "detailed" else 1500,
            temperature=0.7,
        )
        return {"content": response.choices[0].message.content, "disclaimer": DISCLAIMER}
    except openai.APIError as e:
        raise HTTPException(503, f"خطأ في خدمة الذكاء الاصطناعي: {str(e)}")


# ---- محادثة AI ----
@app.post("/api/chat")
async def chat_ai(data: ChatInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    system = {
        "role": "system",
        "content": (
            "أنت مساعد جنان بيز الذكي. تساعد أصحاب المنشآت السعودية في الأعمال، "
            "الموارد البشرية، المحاسبة، والتسويق. ردودك موجزة ومفيدة باللغة العربية."
        ),
    }
    messages = [system] + [{"role": m.role, "content": m.content} for m in data.messages]

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=800,
            temperature=0.6,
        )
        return {"reply": response.choices[0].message.content}
    except openai.APIError as e:
        raise HTTPException(503, str(e))


# ---- توليد نصوص التصميم ----
@app.post("/api/generate-design")
async def generate_design_text(data: DesignInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    prompt = (
        f"اقترح شعاراً مكتوباً (tagline) احترافياً ومختصراً لمنشأة '{data.business_name}' "
        f"في قطاع {data.sector or 'غير محدد'} بالأسلوب {data.style}. "
        "الرد يكون: الشعار فقط، بدون شرح."
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.9,
        )
        return {"tagline": response.choices[0].message.content.strip()}
    except openai.APIError as e:
        raise HTTPException(503, str(e))


# ---- إصدار الشهادات ----
@app.post("/api/certificates")
async def issue_certificate(data: CertificateInput):
    cert_id = f"JENAN-{data.track_id.upper()}-{int(time.time())}"
    return {
        "cert_id":    cert_id,
        "user_id":    data.user_id,
        "user_name":  data.user_name,
        "track_name": data.track_name,
        "issued_at":  datetime.now().strftime("%Y-%m-%d"),
        "verify_url": f"https://rawad.jenan.biz/verify/{cert_id}",
    }


@app.get("/api/certificates/{cert_id}")
async def verify_certificate(cert_id: str):
    # في الإنتاج: يستعلم من قاعدة البيانات
    if cert_id.startswith("JENAN-"):
        return {"valid": True, "cert_id": cert_id, "message": "الشهادة صالحة"}
    raise HTTPException(404, "الشهادة غير موجودة")


# ---- النشر الاجتماعي (Webhook) ----
@app.post("/api/social/publish")
async def social_publish(request: Request):
    body = await request.json()
    platform = body.get("platform", "")
    text      = body.get("text", "")

    # هنا تُضاف تكاملات منصات السوشيال (Twitter API, LinkedIn API, etc.)
    # حالياً: تسجيل فقط
    print(f"[Social] {platform}: {text[:80]}")
    return {"status": "queued", "platform": platform}


# ══════════════════════════════════════════════════════
#   خدمات الجذب الفوري — Hook Services
# ══════════════════════════════════════════════════════

POINTS_DISCLAIMER = (
    "⚖️ جميع النقاط والمكافآت والتقديرات التمويلية هي خدمات استشارية تشجيعية، "
    "وتخضع لشروط المنصة، وتُقدَّم دون أدنى مسؤولية قانونية على جنان بيز."
)


# ─── 1. ملخص المشروع التنفيذي السريع ────────────────
@app.post("/api/exec-summary")
async def exec_summary(data: ExecSummaryInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات. حاول بعد دقيقة.")

    # في وضع "teaser" نستخدم قالب محلي سريع بدون OpenAI لخفض التكلفة
    if data.depth == "teaser":
        teaser = (
            f"مشروع «{data.project_name}»: {data.idea[:120]}... "
            "سجّل الآن لرؤية الملخص التنفيذي الكامل مع تحليل السوق والميزة التنافسية."
        )
        return {
            "teaser": teaser,
            "locked": True,
            "message": "سجّل أو سجّل دخولك لرؤية الملخص كاملاً والحصول على دراسة الجدوى المبسطة",
            "welcome_points": 50,
            "disclaimer": POINTS_DISCLAIMER,
        }

    system_msg = (
        "أنت مستشار أعمال محترف متخصص في السوق السعودي. "
        "عند استقبالك لاسم مشروع وفكرته، تكتب ملخصاً تنفيذياً احترافياً "
        "لا يقل عن 150 كلمة يشمل:\n"
        "1. الرؤية والرسالة\n"
        "2. الفئة المستهدفة\n"
        "3. الميزة التنافسية\n"
        "4. فرص السوق في المملكة\n"
        f"أضف في النهاية: {DISCLAIMER}\n"
        f"ثم: {POINTS_DISCLAIMER}"
    )
    prompt = f"اسم المشروع: {data.project_name}\nالفكرة: {data.idea}"

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=700,
            temperature=0.7,
        )
        full_text = response.choices[0].message.content
        return {
            "summary":   full_text,
            "locked":    False,
            "disclaimer": POINTS_DISCLAIMER,
        }
    except openai.APIError as e:
        raise HTTPException(503, f"خطأ في خدمة الذكاء الاصطناعي: {str(e)}")


# ─── 2. مدقق الامتثال الحكومي (قوى / مدد) ──────────
@app.post("/api/gov-compliance")
async def gov_compliance(data: GovComplianceInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    issues  = []
    passing = []

    # ── قواعد قوى ──
    if data.employee_count >= 1 and not data.has_gosi:
        issues.append({
            "platform": "قوى / التأمينات",
            "status":   "red",
            "message":  "لم يتم اشتراك الموظفين في التأمينات الاجتماعية (GOSI). يُعدّ ذلك مخالفة.",
            "action":   "تسجيل في التأمينات عبر منصة قوى",
            "academy_course": "gov_platforms",
        })
    else:
        if data.employee_count >= 1:
            passing.append({"platform": "قوى", "status": "green", "message": "التأمينات الاجتماعية مسجّلة ✅"})

    # نسبة السعودة (نطاقات)
    if data.employee_count >= 6:
        required_ratio = 12.5  # حد أدنى مبسط للنطاقات الخضراء
        if data.saudi_ratio < required_ratio:
            issues.append({
                "platform": "قوى — نطاقات",
                "status":   "red",
                "message":  f"نسبة السعودة ({data.saudi_ratio:.1f}%) أقل من الحد الأدنى المطلوب ({required_ratio}%). خطر تصنيف 'أحمر'.",
                "action":   "تعيين موظفين سعوديين أو تحديث بيانات قوى",
                "academy_course": "hr",
            })
        else:
            passing.append({"platform": "قوى — نطاقات", "status": "green", "message": f"نسبة السعودة مقبولة ({data.saudi_ratio:.1f}%) ✅"})

    # ── قواعد مدد ──
    if data.employee_count >= 1 and not data.has_iban:
        issues.append({
            "platform": "مدد",
            "status":   "red",
            "message":  "لا يوجد IBAN مرتبط بحساب الرواتب على منصة مدد.",
            "action":   "ربط IBAN بمنصة مدد لصرف الرواتب",
            "academy_course": "gov_platforms",
        })
    else:
        if data.employee_count >= 1:
            passing.append({"platform": "مدد", "status": "green", "message": "IBAN مرتبط بمدد ✅"})

    # السجل التجاري
    if not data.has_cr:
        issues.append({
            "platform": "عام",
            "status":   "red",
            "message":  "لا يوجد سجل تجاري. المنشأة غير نظامية.",
            "action":   "استخراج سجل تجاري عبر بوابة ناجز",
            "academy_course": "gov_platforms",
        })
    else:
        passing.append({"platform": "السجل التجاري", "status": "green", "message": "السجل التجاري متاح ✅"})

    # الترخيص البلدي
    if not data.has_municipality and data.sector not in ["تقنية", "خدمات إلكترونية", "عمل حر"]:
        issues.append({
            "platform": "البلدية",
            "status":   "yellow",
            "message":  "ترخيص البلدية غير موثق. قد يكون مطلوباً حسب النشاط.",
            "action":   "التحقق من اشتراطات بلدية المنطقة",
            "academy_course": "gov_platforms",
        })
    else:
        passing.append({"platform": "البلدية", "status": "green", "message": "الترخيص البلدي متاح ✅"})

    overall = "green" if len(issues) == 0 else ("yellow" if all(i["status"] == "yellow" for i in issues) else "red")

    return {
        "overall_status": overall,
        "issues":         issues,
        "passing":        passing,
        "issues_count":   len(issues),
        "passing_count":  len(passing),
        "summary_ar":     (
            "✅ منشأتك ممتثلة للمتطلبات الحكومية الرئيسية." if overall == "green"
            else f"⚠️ يوجد {len(issues)} {'نقص' if len(issues)==1 else 'نواقص'} تحتاج معالجة."
        ),
        "disclaimer": POINTS_DISCLAIMER,
    }


# ─── 3. رادار التمويل المبدئي ────────────────────────
@app.post("/api/funding-radar")
async def funding_radar(data: FundingRadarInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    # حساب نسبة التمويل المبدئي
    multiplier = 0.5
    program    = "صغار المنشآت — كفالة"

    if data.capital <= 50_000:
        multiplier, program = 0.5,  "صغار المنشآت — كفالة"
    elif data.capital <= 200_000:
        multiplier, program = 1.0,  "منشآت — برامج التمويل الأساسية"
    elif data.capital <= 1_000_000:
        multiplier, program = 2.0,  "منشآت — برنامج النمو"
    else:
        multiplier, program = 3.0,  "مساندة — برنامج التوسع"

    # تحسين التقدير إذا المنشأة نشطة
    if data.years_active >= 2:
        multiplier *= 1.25
    if data.monthly_revenue > 0 and data.monthly_revenue * 12 >= data.capital * 0.5:
        multiplier *= 1.1

    estimated_funding = round(data.capital * multiplier / 1000) * 1000  # تقريب لأقرب ألف

    # برامج إضافية حسب المنطقة
    regional_programs = []
    if data.region in ["الرياض", "مكة المكرمة", "المدينة المنورة"]:
        regional_programs.append("صندوق المئوية — منح المنطقة")
    if data.region in ["الشرقية", "الجبيل", "ينبع"]:
        regional_programs.append("صندوق التنمية الصناعية السعودي")
    if data.sector in ["تقنية", "برمجة", "ذكاء اصطناعي"]:
        regional_programs.append("STC Ventures — صندوق التقنية")
        regional_programs.append("Flat6Labs — حاضنة ريادة الأعمال")

    return {
        "estimated_funding":   estimated_funding,
        "program":             program,
        "regional_programs":   regional_programs,
        "teaser_message":      (
            f"بناءً على بياناتك، أنت مؤهل مبدئياً لتمويل يصل إلى "
            f"{estimated_funding:,.0f} ريال عبر برنامج {program}."
        ),
        "next_step":           "أكمل ملفك الشخصي وتواصل مع المساعد الذكي لبدء إجراءات التمويل الفعلية.",
        "disclaimer":          POINTS_DISCLAIMER,
    }


# ══════════════════ نماذج الأكاديمية والنشر ══════════════════

class AcademyArticleInput(BaseModel):
    """توليد مقالة أكاديمية بالذكاء الاصطناعي"""
    topic:    str   = Field(..., min_length=5, max_length=200)
    category: str   = "general"   # finance | entrepreneurship | markets | ecommerce | marketing | management | legal | success
    length:   str   = "medium"    # short(300w) | medium(600w) | long(1200w)

class AcademyQuizInput(BaseModel):
    """توليد أسئلة اختبار لدرس"""
    track_id:  str
    track_name: str
    lesson_title: str
    num_questions: int = Field(5, ge=3, le=10)

class SocialComposeInput(BaseModel):
    """تأليف منشور سوشيال ميديا"""
    content_type: str   # article | course | promo | tip
    content_text: str   = Field(..., min_length=10, max_length=2000)
    platform:     str   = "twitter"   # twitter | whatsapp | instagram | tiktok
    hashtags:     Optional[List[str]] = []


# ─── أكاديمية: توليد مقالة ───────────────────────────
@app.post("/api/academy/generate-article")
async def academy_generate_article(data: AcademyArticleInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    word_targets = {"short": 300, "medium": 600, "long": 1200}
    words = word_targets.get(data.length, 600)

    cat_context = {
        "finance":         "المال والاستثمار والتخطيط المالي",
        "entrepreneurship":"ريادة الأعمال وتأسيس المشاريع",
        "markets":         "الأسواق المالية والبورصة وتحليل البيانات",
        "ecommerce":       "التجارة الإلكترونية والمتاجر الرقمية",
        "marketing":       "التسويق الرقمي والسوشيال ميديا والعلامة التجارية",
        "management":      "إدارة الأعمال والموارد البشرية وقيادة الفرق",
        "legal":           "القانون التجاري والامتثال والأنظمة الحكومية",
        "success":         "خطوات النجاح والقيادة والتطوير الذاتي",
    }.get(data.category, "الأعمال والاقتصاد")

    prompt = (
        f"اكتب مقالة متخصصة عن: {data.topic}\n"
        f"التصنيف: {cat_context}\n"
        f"عدد الكلمات التقريبي: {words} كلمة\n\n"
        "المطلوب:\n"
        "1. مقدمة جذابة (2-3 جمل)\n"
        "2. الجسم: فقرات منظمة مع عناوين فرعية (##)\n"
        "3. نصائح عملية قابلة للتطبيق\n"
        "4. خاتمة مختصرة\n"
        "اكتب باللغة العربية الفصحى المبسطة المناسبة لأصحاب الأعمال في السوق السعودي."
    )

    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"أنت كاتب متخصص في محتوى الأعمال للسوق السعودي. {DISCLAIMER}"},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=min(words * 3, 3000),
            temperature=0.72,
        )
        article_text = resp.choices[0].message.content.strip()
    except Exception:
        # fallback: هيكل مقالة افتراضي
        article_text = (
            f"## مقدمة\n\n{data.topic} من أهم المواضيع في عالم الأعمال اليوم.\n\n"
            f"## أهمية الموضوع\n\nيؤثر {data.topic} بشكل مباشر على نجاح المنشآت "
            f"وقدرتها التنافسية في السوق السعودي.\n\n"
            "## خطوات عملية\n\n"
            "1. ابدأ بفهم الأساسيات والمفاهيم الجوهرية\n"
            "2. طبّق على نطاق صغير وقيّم النتائج\n"
            "3. استشر خبراء المجال قبل القرارات الكبرى\n"
            "4. وثّق كل خطوة وراجع أداءك دورياً\n\n"
            f"## خاتمة\n\n{data.topic} ليس ترفاً بل ضرورة لكل منشأة تسعى للنمو."
        )

    # استخراج عنوان تلقائي
    title = data.topic if len(data.topic) < 80 else data.topic[:77] + "..."

    return {
        "title":       title,
        "category":    data.category,
        "body":        article_text,
        "word_count":  len(article_text.split()),
        "read_time":   max(1, len(article_text.split()) // 200),  # دقائق القراءة
        "disclaimer":  DISCLAIMER,
        "generated_at":datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


# ─── أكاديمية: توليد أسئلة اختبار ───────────────────
@app.post("/api/academy/generate-quiz")
async def academy_generate_quiz(data: AcademyQuizInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    prompt = (
        f"أنشئ {data.num_questions} أسئلة اختيار من متعدد (4 خيارات لكل سؤال) "
        f"عن الدرس: {data.lesson_title} — المسار: {data.track_name}\n\n"
        "أعد النتيجة كـ JSON array فقط بهذا الشكل بدون أي نص إضافي:\n"
        '[{"id":1,"question":"...","options":["أ:...","ب:...","ج:...","د:..."],"correct":"أ:..."}]'
    )

    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "أنت مدرب أعمال محترف. رد بـ JSON array فقط بدون markdown."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=1500,
            temperature=0.5,
        )
        raw = resp.choices[0].message.content.strip()
        # تنظيف أي markdown
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        questions = json.loads(raw.strip())
    except Exception:
        questions = [
            {"id": 1, "question": f"ما أهم مفهوم في {data.lesson_title}؟",
             "options": ["أ: التخطيط المسبق", "ب: التنفيذ الفوري", "ج: التجاهل", "د: الانتظار"],
             "correct": "أ: التخطيط المسبق"},
            {"id": 2, "question": f"ما الخطوة الأولى في تطبيق {data.lesson_title}؟",
             "options": ["أ: الدراسة والتحليل", "ب: الاستثمار الكبير", "ج: تجاهل المنافسين", "د: التوسع السريع"],
             "correct": "أ: الدراسة والتحليل"},
        ]

    return {"track_id": data.track_id, "questions": questions, "total": len(questions)}


# ─── النشر الاجتماعي: تأليف منشور ───────────────────
@app.post("/api/social/compose-post")
async def social_compose_post(data: SocialComposeInput, user_id: str = Depends(get_user_id)):
    if not check_rate_limit(user_id):
        raise HTTPException(429, "تجاوزت حد الطلبات.")

    max_chars = {"twitter": 280, "whatsapp": 1000, "instagram": 2200, "tiktok": 150}.get(data.platform, 280)
    hashtag_str = " ".join(f"#{h}" for h in (data.hashtags or []) if h)

    platform_style = {
        "twitter":   "منشور تويتر/X موجز وجذاب لا يتجاوز 220 حرفاً",
        "whatsapp":  "رسالة واتساب ودية ومقنعة مع إيموجي",
        "instagram": "كابشن إنستغرام جذاب مع هاشتاقات",
        "tiktok":    "نص تيك توك قصير ومثير لا يتجاوز 130 حرفاً",
    }.get(data.platform, "منشور سوشيال ميديا")

    prompt = (
        f"اكتب {platform_style} لمنشور عن:\n{data.content_text}\n\n"
        f"الهاشتاقات المطلوبة: {hashtag_str}\n"
        f"الحد الأقصى للأحرف: {max_chars}\n"
        "اكتب باللغة العربية واجعله جذاباً ومحفزاً للتفاعل. أعد النص فقط."
    )

    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "أنت متخصص محتوى سوشيال ميديا للأعمال العربية."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=400,
            temperature=0.8,
        )
        post_text = resp.choices[0].message.content.strip()
    except Exception:
        post_text = f"✨ {data.content_text[:200]}\n\n{hashtag_str}"

    # ضمان الحد الأقصى
    if len(post_text) > max_chars:
        post_text = post_text[:max_chars - 3] + "..."

    return {
        "platform":   data.platform,
        "post_text":  post_text,
        "char_count": len(post_text),
        "max_chars":  max_chars,
    }


# ══════════════════════════════════════════════════════════════
# متجر البرامج — طلب استفسار / شراء
# ══════════════════════════════════════════════════════════════
class SoftwareInquiryInput(BaseModel):
    product_id:   str                    = Field(..., description="معرّف البرنامج")
    product_name: str                    = Field(..., description="اسم البرنامج")
    plan:         str                    = Field(default="احترافية", description="الباقة المطلوبة")
    business_name: Optional[str]         = Field(default=None, description="اسم المنشأة")
    contact_name:  Optional[str]         = Field(default=None, description="اسم التواصل")
    notes:         Optional[str]         = Field(default=None, description="ملاحظات إضافية")
    demo_requested: bool                 = Field(default=False, description="طلب عرض تجريبي")


@app.post("/api/software/inquire")
async def software_inquire(data: SoftwareInquiryInput, request: Request):
    """
    تسجيل طلب استفسار أو شراء برنامج جنان.
    يُنشئ رسالة واتساب جاهزة للإرسال وسجلاً داخلياً.
    """
    user_id = request.headers.get("X-User-ID", request.client.host)
    if not check_rate_limit(user_id):
        raise HTTPException(status_code=429, detail="تجاوزت الحد المسموح به. حاول بعد دقيقة.")

    action = "عرض تجريبي" if data.demo_requested else "طلب اشتراك"
    business_info = f"\nاسم المنشأة: {data.business_name}" if data.business_name else ""
    contact_info  = f"\nاسم التواصل: {data.contact_name}" if data.contact_name else ""
    notes_info    = f"\nملاحظات: {data.notes}" if data.notes else ""

    wa_message = (
        f"📋 {action} — {data.product_name}\n"
        f"الباقة: {data.plan}"
        f"{business_info}{contact_info}{notes_info}\n\n"
        f"المصدر: متجر برامج جنان بيز"
    )

    wa_url = f"https://wa.me/966567711999?text={quote(wa_message)}"

    return {
        "status":       "success",
        "action":       action,
        "product_id":   data.product_id,
        "product_name": data.product_name,
        "plan":         data.plan,
        "wa_message":   wa_message,
        "wa_url":       wa_url,
        "timestamp":    datetime.utcnow().isoformat(),
        "note":         "سيتم التواصل معك خلال 24 ساعة",
    }


# ════════════════════════════════════════════════════════
# نقاط نهاية بوابة الدفع — Payment Gateway Endpoints
# ════════════════════════════════════════════════════════

class PaymentCreateInput(BaseModel):
    amount: float                    # بالريال (يُحوَّل للهللات)
    currency: str = "SAR"
    description: str
    callback_url: str
    return_url: Optional[str] = None
    product_id: str
    product_name: str
    plan_name: str
    source: Optional[Dict[str, Any]] = None   # بيانات البطاقة (مُشفَّرة)
    phone: Optional[str] = None               # لـ STC Pay

class BNPLSessionInput(BaseModel):
    phone: str
    amount: float
    currency: str = "SAR"
    product_id: str
    product_name: str
    plan_name: str
    order_reference_id: Optional[str] = None
    buyer: Optional[Dict[str, Any]] = None
    items: Optional[List[Dict[str, Any]]] = None
    success_callback: Optional[str] = None
    failure_callback: Optional[str] = None
    cancel_callback: Optional[str] = None

class STCInitInput(BaseModel):
    phone: str
    amount: float
    product_id: str

class STCConfirmInput(BaseModel):
    phone: str
    otp: str
    product_id: str


@app.post("/api/payment/create-order")
async def payment_create_order(body: PaymentCreateInput, x_api_key: Optional[str] = Header(None)):
    """
    إنشاء طلب دفع عبر Moyasar.
    يُعيد transaction_url لإعادة التوجيه لصفحة 3D Secure أو حالة paid/failed مباشرةً.
    """
    import httpx
    import os

    publishable_key = os.environ.get("MOYASAR_PUBLISHABLE_KEY", "pk_test_your_key")
    secret_key      = os.environ.get("MOYASAR_SECRET_KEY",      "sk_test_your_key")

    moyasar_payload = {
        "amount":       int(body.amount * 100),   # تحويل للهللات
        "currency":     body.currency,
        "description":  body.description,
        "callback_url": body.callback_url,
        "source":       body.source or {"type": "creditcard"},
        "metadata": {
            "product_id":   body.product_id,
            "product_name": body.product_name,
            "plan_name":    body.plan_name,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.moyasar.com/v1/payments",
                json=moyasar_payload,
                auth=(secret_key, ""),
            )
        data = response.json()
        return data
    except Exception as exc:
        # وضع التطوير — إجابة محاكاة
        demo_id = hashlib.md5(f"{body.product_id}-{time.time()}".encode()).hexdigest()[:12].upper()
        return {
            "id": "DEMO-" + demo_id,
            "status": "paid",
            "amount": int(body.amount * 100),
            "currency": "SAR",
            "description": body.description,
            "message": "وضع التطوير — لا يوجد اتصال حقيقي بـ Moyasar",
        }


@app.post("/api/payment/webhook")
async def payment_webhook(request: Request):
    """
    استقبال إشعارات Moyasar (webhook) عند اكتمال/فشل الدفع.
    يجب تسجيل هذا العنوان في لوحة تحكم Moyasar.
    """
    payload = await request.json()
    payment_id = payload.get("id")
    status     = payload.get("status")
    metadata   = payload.get("metadata", {})

    # هنا: تحديث قاعدة البيانات، إرسال إيميل تأكيد، تفعيل البرنامج ...
    print(f"[Webhook] payment_id={payment_id}, status={status}, meta={metadata}")

    return {"received": True}


@app.get("/api/payment/status/{order_id}")
async def payment_status(order_id: str):
    """
    استعلام عن حالة طلب دفع موجود من Moyasar.
    """
    secret_key = os.environ.get("MOYASAR_SECRET_KEY", "sk_test_your_key")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"https://api.moyasar.com/v1/payments/{order_id}",
                auth=(secret_key, ""),
            )
        return response.json()
    except Exception:
        return {"id": order_id, "status": "unknown", "message": "تعذّر الاتصال بـ Moyasar"}


@app.post("/api/payment/tamara/create-session")
async def tamara_create_session(body: BNPLSessionInput):
    """
    إنشاء جلسة Tamara BNPL (3 أقساط بدون فوائد).
    يُعيد checkout_url لإعادة التوجيه لصفحة تمارا.
    """
    tamara_token = os.environ.get("TAMARA_API_TOKEN", "sandbox_token")
    tamara_base  = "https://api-sandbox.tamara.co"   # غيّر لـ api.tamara.co في الإنتاج

    order_ref = body.order_reference_id or f"JENAN-{int(time.time())}"
    payload = {
        "order_reference_id": order_ref,
        "total_amount": {"amount": str(body.amount), "currency": body.currency},
        "description":  f"{body.product_name} — {body.plan_name}",
        "country_code": "SA",
        "payment_type": "PAY_BY_INSTALMENTS",
        "instalments": 3,
        "locale": "ar_SA",
        "items": body.items or [{"name": body.product_name, "quantity": 1,
                                   "unit_price": {"amount": str(body.amount), "currency": body.currency},
                                   "total_amount": {"amount": str(body.amount), "currency": body.currency}}],
        "consumer": {"phone_number": body.phone, "first_name": "عميل", "last_name": "جنان", "email": "customer@jenan.biz"},
        "billing_address": {"country": "SA", "city": "الرياض"},
        "shipping_address": {"country": "SA", "city": "الرياض"},
        "success_url": body.success_callback or "/",
        "failure_url": body.failure_callback or "/",
        "cancel_url":  body.cancel_callback  or "/",
        "merchant_url": "https://jenan.biz",
        "platform": "web",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{tamara_base}/checkout",
                json=payload,
                headers={"Authorization": f"Bearer {tamara_token}", "Content-Type": "application/json"},
            )
        return response.json()
    except Exception:
        return {"checkout_url": None, "message": "وضع التطوير — تمارا غير متصلة"}


@app.post("/api/payment/tabby/create-session")
async def tabby_create_session(body: BNPLSessionInput):
    """
    إنشاء جلسة Tabby (4 أقساط بدون فوائد).
    يُعيد web_url لإعادة التوجيه لصفحة تابي.
    """
    tabby_key  = os.environ.get("TABBY_API_KEY", "pk_test_your_tabby_key")
    tabby_base = "https://api.tabby.ai"

    payload = {
        "payment": {
            "amount": str(body.amount),
            "currency": body.currency,
            "description": f"{body.product_name} — {body.plan_name}",
            "buyer": body.buyer or {"phone": body.phone, "email": "customer@jenan.biz", "name": "عميل جنان"},
            "order": {"reference_id": f"JENAN-{int(time.time())}",
                       "items": [{"title": body.product_name, "quantity": 1,
                                   "unit_price": str(body.amount), "category": "software"}]},
        },
        "lang": "ar",
        "merchant_code": "jenan_biz",
        "merchant_urls": {
            "success": body.success_callback or "/",
            "failure": body.failure_callback or "/",
            "cancel":  body.cancel_callback  or "/",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{tabby_base}/api/v2/checkout",
                json=payload,
                headers={"Authorization": f"Bearer {tabby_key}", "Content-Type": "application/json"},
            )
        return response.json()
    except Exception:
        return {"checkout_url": None, "message": "وضع التطوير — تابي غير متصلة"}


@app.post("/api/payment/applepay/validate-merchant")
async def applepay_validate_merchant(request: Request):
    """
    التحقق من هوية التاجر لـ Apple Pay Session.
    يُستدعى من المتصفح أثناء تهيئة ApplePaySession.
    """
    body = await request.json()
    validation_url = body.get("validationURL", "")
    if not validation_url:
        raise HTTPException(400, "validationURL مطلوب")
    # في الإنتاج: استدع validation_url بشهادة Apple Pay merchant
    # حالياً وضع تطوير — يعيد بيانات وهمية
    return {
        "merchantSessionIdentifier": "DEMO_SESSION_" + hashlib.md5(validation_url.encode()).hexdigest()[:16].upper(),
        "nonce": secrets.token_hex(16),
        "merchantIdentifier": os.environ.get("APPLE_MERCHANT_ID", "merchant.biz.jenan.demo"),
        "domainName": "rawad.jenan.biz",
        "displayName": "جنان بيز",
    }


@app.post("/api/payment/stcpay/init")
async def stcpay_init(body: STCInitInput):
    """
    تهيئة دفع STC Pay — إرسال OTP للعميل.
    """
    stc_key = os.environ.get("STCPAY_API_KEY", "test_stc_key")  # noqa: F841
    # STC Pay REST API integration goes here
    # Demo mode — return success
    return {"status": "otp_sent", "message": "تم إرسال رمز OTP — وضع التطوير"}


@app.post("/api/payment/stcpay/confirm")
async def stcpay_confirm(body: STCConfirmInput):
    """
    تأكيد دفع STC Pay بعد إدخال OTP.
    """
    # Demo mode — accept any OTP
    demo_id = hashlib.md5(f"{body.phone}-{time.time()}".encode()).hexdigest()[:12].upper()
    return {
        "id": "STC-" + demo_id,
        "status": "paid",
        "message": "تم الدفع عبر STC Pay — وضع التطوير"
    }


# ---- معالجة الأخطاء العامة ----
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"message": "حدث خطأ داخلي. حاول مجدداً."})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services:app", host="0.0.0.0", port=8000, reload=True)
