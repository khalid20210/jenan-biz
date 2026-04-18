#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════╗
║         جنان بيز — معالج الإعداد الكامل                     ║
║         setup_jenan.py — شغّله مرة واحدة فقط                ║
╚══════════════════════════════════════════════════════════════╝

يقوم هذا السكريبت بـ:
  1. جمع مفاتيح API التالية:
       - Supabase URL + Anon Key + Service Role Key
       - OpenAI API Key
       - Moyasar Publishable + Secret Keys
  2. تحديث ملف api/.env بالقيم الحقيقية
  3. تشغيل ملفات SQL في Supabase (pgvector + referral + core schema)
  4. اختبار pipeline الـ RAG كاملاً

تشغيل:
  python setup_jenan.py
"""

import os
import sys
import re
import asyncio
import getpass
import textwrap
from pathlib import Path

# ── تأكد من تحميل httpx و dotenv ──────────────────────────────
try:
    import httpx
except ImportError:
    os.system(f"{sys.executable} -m pip install httpx -q")
    import httpx

try:
    from dotenv import dotenv_values, set_key
except ImportError:
    os.system(f"{sys.executable} -m pip install python-dotenv -q")
    from dotenv import dotenv_values, set_key

# ── مسارات ────────────────────────────────────────────────────
ROOT     = Path(__file__).parent
API_DIR  = ROOT / "api"
ENV_FILE = API_DIR / ".env"

SQL_FILES = [
    ("محرك البحث الذكي (pgvector)",  API_DIR / "supabase_setup.sql"),
    ("محرك الإحالات والنقاط",        API_DIR / "referral_setup.sql"),
    ("المحفظة المالية والاشتراكات",  API_DIR / "core_schema.sql"),
]

# ── ألوان الطرفية ─────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):   print(f"  {GREEN}✅ {msg}{RESET}")
def warn(msg): print(f"  {YELLOW}⚠️  {msg}{RESET}")
def err(msg):  print(f"  {RED}❌ {msg}{RESET}")
def info(msg): print(f"  {CYAN}ℹ  {msg}{RESET}")
def hdr(msg):
    print(f"\n{BOLD}{'─'*55}")
    print(f"  {msg}")
    print(f"{'─'*55}{RESET}")


# ══════════════════════════════════════════════════════════════
# 1. قراءة المفاتيح من المستخدم
# ══════════════════════════════════════════════════════════════

def _ask(prompt: str, secret: bool = False, validator=None, default: str = "") -> str:
    """يطلب قيمة من المستخدم مع دعم الـ default والتحقق."""
    display_default = f" [{default[:6]}...]" if default and len(default) > 6 else (f" [{default}]" if default else "")
    full_prompt = f"  {CYAN}{prompt}{display_default}: {RESET}"

    while True:
        if secret:
            val = getpass.getpass(full_prompt)
        else:
            val = input(full_prompt).strip()

        if not val and default:
            return default
        if not val:
            warn("القيمة مطلوبة، أعد المحاولة.")
            continue
        if validator and not validator(val):
            warn("القيمة تبدو غير صحيحة، تأكد منها.")
            # نسمح بالمتابعة إذا أصرّ المستخدم
            cont = input(f"  {YELLOW}هل تريد المتابعة رغم ذلك؟ (y/n): {RESET}").strip().lower()
            if cont == "y":
                return val
            continue
        return val

def _is_supabase_url(v: str) -> bool:
    return v.startswith("https://") and "supabase.co" in v

def _is_supabase_key(v: str) -> bool:
    return v.startswith("eyJ") and len(v) > 50

def _is_openai_key(v: str) -> bool:
    return v.startswith("sk-") and len(v) > 20

def _is_moyasar_key(v: str) -> bool:
    return (v.startswith("pk_") or v.startswith("sk_")) and len(v) > 10


def collect_keys() -> dict:
    """يجمع المفاتيح من المستخدم تفاعلياً."""
    # تحميل القيم الموجودة (إن وُجدت)
    current = dotenv_values(ENV_FILE) if ENV_FILE.exists() else {}

    def _cur(key: str) -> str:
        """يُعيد القيمة الحالية إذا كانت حقيقية (ليست placeholder)."""
        v = current.get(key, "")
        if not v or "xxxx" in v or "YOUR_" in v or v.startswith("sk-test"):
            return ""
        return v

    hdr("الخطوة 1/5 — Supabase")
    info("تجدهم في: Supabase Dashboard → Settings → API")
    supabase_url      = _ask("SUPABASE_URL", validator=_is_supabase_url, default=_cur("SUPABASE_URL"))
    supabase_anon     = _ask("SUPABASE_ANON_KEY (anon public)", secret=True, validator=_is_supabase_key, default=_cur("SUPABASE_ANON_KEY"))
    supabase_service  = _ask("SUPABASE_SERVICE_ROLE_KEY", secret=True, validator=_is_supabase_key, default=_cur("SUPABASE_SERVICE_ROLE_KEY"))

    hdr("الخطوة 2/5 — OpenAI")
    info("تجده في: https://platform.openai.com/api-keys")
    openai_key = _ask("OPENAI_API_KEY", secret=True, validator=_is_openai_key, default=_cur("OPENAI_API_KEY"))

    hdr("الخطوة 3/5 — Moyasar")
    info("تجدهم في: Moyasar Dashboard → Developers → API Keys")
    info("استخدم pk_live_... و sk_live_... للإنتاج (أو pk_test_... للاختبار)")
    moyasar_pub = _ask("MOYASAR_PUBLISHABLE_KEY", validator=_is_moyasar_key, default=_cur("MOYASAR_PUBLISHABLE_KEY"))
    moyasar_sec = _ask("MOYASAR_SECRET_KEY", secret=True, validator=_is_moyasar_key, default=_cur("MOYASAR_SECRET_KEY"))

    hdr("الخطوة 4/5 — إعدادات عامة")
    app_url = _ask("APP_BASE_URL (رابط موقعك)", default=_cur("APP_BASE_URL") or "https://jenan.biz")

    hdr("الخطوة 5/5 — اختياري")
    smtp_user = _ask("SMTP_USER (بريد Gmail للإشعارات — اضغط Enter لتخطيه)", default=_cur("SMTP_USER") or "")
    smtp_pass = _ask("SMTP_PASS (كلمة مرور التطبيق)", secret=True, default=_cur("SMTP_PASS") or "") if smtp_user else ""

    return {
        "SUPABASE_URL":             supabase_url,
        "SUPABASE_ANON_KEY":        supabase_anon,
        "SUPABASE_SERVICE_ROLE_KEY":supabase_service,
        "OPENAI_API_KEY":           openai_key,
        "MOYASAR_PUBLISHABLE_KEY":  moyasar_pub,
        "MOYASAR_SECRET_KEY":       moyasar_sec,
        "APP_BASE_URL":             app_url,
        "SMTP_USER":                smtp_user,
        "SMTP_PASS":                smtp_pass,
    }


# ══════════════════════════════════════════════════════════════
# 2. تحديث .env
# ══════════════════════════════════════════════════════════════

def update_env(keys: dict):
    """يكتب المفاتيح الجديدة في api/.env."""
    hdr("تحديث ملف api/.env")
    for k, v in keys.items():
        if v:
            set_key(str(ENV_FILE), k, v)
            display = v[:8] + "..." if len(v) > 8 else v
            ok(f"{k} = {display}")
    ok("api/.env محدَّث بنجاح")


# ══════════════════════════════════════════════════════════════
# 3. تشغيل SQL في Supabase عبر Management API
# ══════════════════════════════════════════════════════════════

def _extract_project_ref(url: str) -> str:
    """يستخرج project ref من الـ URL (أول segment)."""
    # https://abcdefghij.supabase.co
    m = re.match(r"https://([^.]+)\.supabase\.co", url)
    return m.group(1) if m else ""


async def run_sql_via_management_api(sql: str, supabase_url: str, service_key: str) -> dict:
    """
    يُشغّل SQL مباشرة عبر Supabase Management API.
    يحتاج: project ref + Management API token
    """
    project_ref = _extract_project_ref(supabase_url)
    if not project_ref:
        return {"success": False, "error": "لم يُستخرج project ref من الـ URL"}

    # الطريقة 1: Supabase Management API (تحتاج Personal Access Token)
    mgmt_url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"

    # لا نملك Management Token — نستخدم الطريقة 2: REST RPC مع Service Role
    # عبر deno edge function مُعرَّفة أو الـ raw postgres endpoint
    # الطريقة 3: pg_dump endpoint الجديد في Supabase (query endpoint)
    headers = {
        "apikey":        service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type":  "application/json",
    }

    # تجربة: هل يدعم المشروع تشغيل SQL مباشرة؟
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(
            f"{supabase_url}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"sql": sql},
        )
    if r.status_code == 200:
        return {"success": True}
    return {"success": False, "status": r.status_code, "error": r.text[:200]}


async def run_sql_chunked(sql_text: str, supabase_url: str, service_key: str) -> bool:
    """
    يُقسّم ملف SQL إلى جمل منفصلة ويُشغّل كل منها عبر RPC.
    يُحاول طريقتين:
      أ) exec_sql RPC (إن كانت الدالة مُعرَّفة)
      ب) raw postgres connection (إن توفّر psycopg2)
    """
    # تنظيف التعليقات وتقسيم الجمل
    clean = re.sub(r'--[^\n]*', '', sql_text)
    clean = re.sub(r'/\*.*?\*/', '', clean, flags=re.DOTALL)
    # تقسيم بـ ; مع تجاهل الفراغات
    statements = [s.strip() for s in clean.split(';') if s.strip() and len(s.strip()) > 5]

    headers = {
        "apikey":        service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }

    passed = 0
    failed_stmts = []

    async with httpx.AsyncClient(timeout=30) as c:
        for stmt in statements:
            r = await c.post(
                f"{supabase_url}/rest/v1/rpc/exec_sql",
                headers=headers,
                json={"query": stmt},
            )
            if r.status_code in (200, 201, 204):
                passed += 1
            else:
                failed_stmts.append((stmt[:60], r.status_code, r.text[:80]))

    if failed_stmts:
        warn(f"  {passed}/{len(statements)} جملة نجحت")
        for s, code, txt in failed_stmts[:3]:
            info(f"  [{code}] {s}... → {txt}")
        return passed > 0
    else:
        ok(f"جميع الجمل الـ {passed} نُفِّذت بنجاح")
        return True


async def execute_all_sql(supabase_url: str, service_key: str):
    """يُشغّل الملفات الثلاثة بالترتيب."""
    hdr("تشغيل ملفات SQL في Supabase")

    # تحقق من الاتصال أولاً
    info("اختبار الاتصال بـ Supabase...")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{supabase_url}/rest/v1/",
                headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"},
            )
        if r.status_code in (200, 400):
            ok(f"الاتصال بـ Supabase ناجح (HTTP {r.status_code})")
        else:
            err(f"الاتصال فشل: HTTP {r.status_code}")
            return False
    except Exception as e:
        err(f"لا يمكن الوصول لـ Supabase: {e}")
        return False

    # تحقق من وجود exec_sql
    info("التحقق من وجود دالة exec_sql...")
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(
            f"{supabase_url}/rest/v1/rpc/exec_sql",
            headers={
                "apikey":        service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type":  "application/json",
            },
            json={"query": "SELECT 1"},
        )
    exec_sql_available = r.status_code in (200, 201, 204)

    if not exec_sql_available:
        warn("دالة exec_sql غير موجودة في Supabase (هذا طبيعي)")
        print()
        print(f"  {BOLD}{YELLOW}══ يجب تنفيذ SQL يدوياً ══{RESET}")
        print(f"  افتح: {CYAN}https://supabase.com/dashboard/project/_/sql{RESET}")
        print(f"  ثم شغّل الملفات الثلاثة بالترتيب:\n")
        for label, path in SQL_FILES:
            if path.exists():
                print(f"  {GREEN}✦ {label}{RESET}")
                print(f"    الملف: {path}")
                # طباعة أول 3 سطور كمعاينة
                lines = path.read_text(encoding="utf-8").split("\n")[:3]
                for l in lines:
                    print(f"    {CYAN}{l}{RESET}")
                print()
        print(f"  {YELLOW}بعد تنفيذ SQL، أعد تشغيل هذا السكريبت للاختبار.{RESET}")
        return None   # None = يجب التنفيذ اليدوي

    # تنفيذ تلقائي
    all_ok = True
    for i, (label, path) in enumerate(SQL_FILES, 1):
        if not path.exists():
            warn(f"ملف غير موجود: {path}")
            continue
        print(f"\n  [{i}/3] {label}...")
        sql_text = path.read_text(encoding="utf-8")
        result = await run_sql_chunked(sql_text, supabase_url, service_key)
        if not result:
            all_ok = False

    return all_ok


# ══════════════════════════════════════════════════════════════
# 4. اختبار pipeline كامل
# ══════════════════════════════════════════════════════════════

async def test_pipeline(supabase_url: str, anon_key: str, openai_key: str):
    """اختبار مبسط: Supabase connection → OpenAI ping → knowledge_chunks."""
    hdr("اختبار النظام")

    # -- اختبار Supabase --
    info("1. اختبار Supabase...")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{supabase_url}/rest/v1/knowledge_chunks?select=id&limit=1",
                headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
            )
        if r.status_code == 200:
            ok(f"Supabase: knowledge_chunks متاحة (HTTP 200)")
        elif r.status_code == 404:
            warn("Supabase: knowledge_chunks غير موجودة بعد — شغّل supabase_setup.sql أولاً")
        else:
            warn(f"Supabase: HTTP {r.status_code} — {r.text[:80]}")
    except Exception as e:
        err(f"Supabase connection failed: {e}")

    # -- اختبار profiles --
    info("2. اختبار جدول profiles...")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{supabase_url}/rest/v1/profiles?select=id&limit=1",
                headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
            )
        if r.status_code == 200:
            ok("Supabase: جدول profiles موجود ✅")
        else:
            warn(f"Supabase: profiles HTTP {r.status_code} — قد تحتاج تشغيل core_schema.sql")
    except Exception as e:
        err(f"profiles check failed: {e}")

    # -- اختبار transactions --
    info("3. اختبار جدول transactions...")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{supabase_url}/rest/v1/transactions?select=id&limit=1",
                headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
            )
        if r.status_code == 200:
            ok("Supabase: جدول transactions موجود ✅")
        else:
            warn(f"Supabase: transactions HTTP {r.status_code}")
    except Exception as e:
        err(f"transactions check failed: {e}")

    # -- اختبار OpenAI --
    info("4. اختبار OpenAI API...")
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json",
                },
                json={"input": "اختبار", "model": "text-embedding-3-small"},
            )
        if r.status_code == 200:
            dims = len(r.json()["data"][0]["embedding"])
            ok(f"OpenAI: embedding يعمل — {dims} بُعد ✅")
        elif r.status_code == 401:
            err("OpenAI: مفتاح API غير صالح")
        else:
            warn(f"OpenAI: HTTP {r.status_code}")
    except Exception as e:
        err(f"OpenAI test failed: {e}")

    # -- اختبار match_chunks --
    info("5. اختبار دالة match_chunks (RAG search)...")
    try:
        # نحتاج embedding حقيقي
        async with httpx.AsyncClient(timeout=15) as c:
            emb_r = await c.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                json={"input": "اختبار", "model": "text-embedding-3-small"},
            )
        if emb_r.status_code == 200:
            vector = emb_r.json()["data"][0]["embedding"]
            async with httpx.AsyncClient(timeout=15) as c:
                rpc_r = await c.post(
                    f"{supabase_url}/rest/v1/rpc/match_chunks",
                    headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}", "Content-Type": "application/json"},
                    json={"query_embedding": vector, "match_threshold": 0.5, "match_count": 1},
                )
            if rpc_r.status_code == 200:
                results = rpc_r.json()
                ok(f"match_chunks تعمل — {len(results)} نتيجة (قاعدة المعرفة {'فارغة — جاهزة للرفع 🚀' if len(results)==0 else 'تحتوي بيانات ✅'})")
            else:
                warn(f"match_chunks HTTP {rpc_r.status_code} — قد تحتاج تشغيل supabase_setup.sql")
    except Exception as e:
        warn(f"match_chunks test skipped: {e}")


# ══════════════════════════════════════════════════════════════
# main
# ══════════════════════════════════════════════════════════════

async def main():
    print(f"""
{BOLD}{CYAN}
╔══════════════════════════════════════════════════════════════╗
║         جنان بيز — معالج الإعداد الكامل                     ║
║         الإصدار 1.0 — أبريل 2026                            ║
╚══════════════════════════════════════════════════════════════╝
{RESET}
  هذا السكريبت سيُعدّ المنصة كاملاً في خطوات تلقائية.
  عندما تُطلب منك القيمة الحالية بين [أقواس]، اضغط Enter لإبقائها.
""")

    # ── جمع المفاتيح ──────────────────────────────────────────
    keys = collect_keys()

    # ── تحديث .env ────────────────────────────────────────────
    update_env(keys)

    # ── تشغيل SQL ──────────────────────────────────────────────
    sql_result = await execute_all_sql(
        keys["SUPABASE_URL"],
        keys["SUPABASE_SERVICE_ROLE_KEY"],
    )

    # ── الاختبار النهائي ────────────────────────────────────────
    print()
    if sql_result is None:
        info("انتظر تنفيذ SQL يدوياً ثم شغّل الاختبار:")
        print(f"  {CYAN}python setup_jenan.py --test-only{RESET}")
    else:
        await test_pipeline(
            keys["SUPABASE_URL"],
            keys["SUPABASE_ANON_KEY"],
            keys["OPENAI_API_KEY"],
        )

    # ── الملخص النهائي ──────────────────────────────────────────
    hdr("الخلاصة")
    print(f"""
  {GREEN}✅ api/.env محدَّث بمفاتيحك الحقيقية{RESET}
  {CYAN}
  الخطوات التالية:
  ─────────────────────────────────────────────
  1. إذا ظهرت تحذيرات SQL → شغّل الملفات يدوياً في:
     https://supabase.com/dashboard/project/_/sql

  2. شغّل السيرفر:
     venv\\Scripts\\python.exe -m uvicorn api.services:app --host 0.0.0.0 --port 8002 --reload

  3. سجّل الـ Webhook في Moyasar Dashboard:
     https://dashboard.moyasar.com → Webhooks → Add
     URL: https://jenan.biz/api/payment/webhook

  4. ارفع أول ملف PDF حقيقي من:
     Dashboard → قاعدة المعرفة → رفع ملف
  {RESET}""")


if __name__ == "__main__":
    # --test-only: تجاوز جمع المفاتيح وشغّل الاختبار مباشرة
    if "--test-only" in sys.argv:
        from dotenv import load_dotenv
        load_dotenv(ENV_FILE)
        sb_url  = os.getenv("SUPABASE_URL", "")
        sb_anon = os.getenv("SUPABASE_ANON_KEY", "")
        oai_key = os.getenv("OPENAI_API_KEY", "")
        asyncio.run(test_pipeline(sb_url, sb_anon, oai_key))
    else:
        asyncio.run(main())
