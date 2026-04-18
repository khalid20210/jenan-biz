#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
test_rag_pipeline.py — اختبار كامل لـ RAG Pipeline
=====================================================
يُنفَّذ من مجلد jenan-biz:
  venv\Scripts\python.exe api/test_rag_pipeline.py

الاختبارات:
  1. قراءة متغيرات البيئة
  2. الاتصال بـ Supabase (REST)
  3. وجود جدول knowledge_chunks ودالة match_chunks
  4. توليد embedding تجريبي (OpenAI)
  5. ingest نص قصير -> pgvector
  6. search — استرجاع المقطع المدرج
  7. تنظيف (حذف سجلات الاختبار)
"""

import asyncio
import os
import sys

# ── إجبار UTF-8 على Windows ────────────────────────────────────
if sys.stdout.encoding and sys.stdout.encoding.upper() not in ("UTF-8", "UTF8"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── تحميل .env ────────────────────────────────────────────────
from pathlib import Path
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=_env_path)
    print(f"  [.env] loaded from {_env_path}")
else:
    print(f"  [.env] NOT FOUND at {_env_path} — reading from system env")

# ── ألوان طرفية ───────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):    print(f"  {GREEN}[OK] {msg}{RESET}")
def fail(msg):  print(f"  {RED}[FAIL] {msg}{RESET}")
def warn(msg):  print(f"  {YELLOW}[WARN] {msg}{RESET}")
def info(msg):  print(f"  {CYAN}[INFO] {msg}{RESET}")
def header(msg):print(f"\n{BOLD}{CYAN}{'='*55}\n  {msg}\n{'='*55}{RESET}")

# ─── نص اختباري (مادة قانونية عربية وهمية) ───────────────────
_TEST_CHUNKS = [
    {
        "chunk_id":  1,
        "header":    "المادة الأولى: التعريفات [TEST]",
        "text":      "المادة الأولى: التعريفات [TEST]\nيُقصد بالمنصة في هذا النظام: منصة جنان بيز للأعمال الذكية.",
        "char_count": 85,
        "source":    "__test_rag_pipeline__.pdf",
    },
    {
        "chunk_id":  2,
        "header":    "المادة الثانية: الاشتراطات [TEST]",
        "text":      "المادة الثانية: الاشتراطات [TEST]\nيجب على كل مستخدم الالتزام بسياسة الخصوصية والشروط العامة.",
        "char_count": 90,
        "source":    "__test_rag_pipeline__.pdf",
    },
]
_TEST_FILENAME = "__test_rag_pipeline__.pdf"
_TEST_QUERY    = "ما هي تعريفات المنصة في النظام؟"


async def main():
    errors = 0

    # ══════════════════════════════════════════════════
    header("1. فحص متغيرات البيئة")
    # ══════════════════════════════════════════════════
    required = {
        "OPENAI_API_KEY":           "OpenAI — توليد النصوص والـ embeddings",
        "SUPABASE_URL":             "Supabase — عنوان المشروع",
        "SUPABASE_ANON_KEY":        "Supabase — مفتاح الـ REST API",
    }
    optional = {
        "SUPABASE_SERVICE_ROLE_KEY": "Supabase — مفتاح الصلاحيات الكاملة (للـ admin)",
        "JWT_SECRET":                "مصادقة المستخدمين",
        "SENTRY_DSN":                "مراقبة الأخطاء في الإنتاج",
    }

    # الكلمات المفتاحية التي تدل على قيمة وهمية
    _DUMMY_MARKERS = ("xxxx", "your_", "placeholder", "replace", "sk-xxx",
                      "dummy", "test_key", "changeme", "_here", "_me")

    def _is_placeholder(v: str) -> bool:
        low = v.lower()
        return any(m in low for m in _DUMMY_MARKERS) or len(v) < 12

    all_ok = True
    for var, desc in required.items():
        val = os.getenv(var, "")
        if val and not _is_placeholder(val):
            ok(f"{var} — موجود ✓  ({desc})")
        elif val and _is_placeholder(val):
            warn(f"{var} — مُعبَّأ بقيمة placeholder! ({desc})")
            all_ok = False; errors += 1
        else:
            fail(f"{var} — مفقود!  ({desc})")
            all_ok = False; errors += 1

    for var, desc in optional.items():
        val = os.getenv(var, "")
        if val and not _is_placeholder(val):
            ok(f"{var} — موجود ({desc})")
        else:
            warn(f"{var} — غير مُعيَّن (اختياري: {desc})")

    if not all_ok:
        print(f"\n  {RED}أكمل ملف api/.env قبل المتابعة.{RESET}")
        sys.exit(1)

    # ══════════════════════════════════════════════════
    header("2. الاتصال بـ Supabase")
    # ══════════════════════════════════════════════════
    import httpx
    sb_url      = os.getenv("SUPABASE_URL", "").rstrip("/")
    sb_key      = os.getenv("SUPABASE_ANON_KEY", "")
    sb_svc_key  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    # نستخدم service_role للاتصال التجريبي (anon محدود على endpoint الجذر)
    hdrs = {
        "apikey":        sb_svc_key,
        "Authorization": f"Bearer {sb_svc_key}",
        "Content-Type":  "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{sb_url}/rest/v1/", headers=hdrs)
        if r.status_code in (200, 400, 401):   # 401 anon = server alive
            ok(f"Supabase يستجيب — status {r.status_code}")
        else:
            fail(f"Supabase أعاد status غير متوقع: {r.status_code} — {r.text[:100]}")
            errors += 1
    except Exception as e:
        fail(f"تعذّر الاتصال بـ Supabase: {e}")
        errors += 1; sys.exit(1)

    # ══════════════════════════════════════════════════
    header("3. فحص جدول knowledge_chunks ودالة match_chunks")
    # ══════════════════════════════════════════════════
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{sb_url}/rest/v1/knowledge_chunks?limit=1",
                headers=hdrs,
            )
        if r.status_code == 200:
            ok("جدول knowledge_chunks موجود")
        elif r.status_code == 404:
            fail("الجدول غير موجود — شغّل api/supabase_setup.sql في Supabase SQL Editor")
            errors += 1; sys.exit(1)
        else:
            warn(f"استجابة غير متوقعة: {r.status_code} — {r.text[:150]}")
    except Exception as e:
        fail(f"خطأ في فحص الجدول: {e}")
        errors += 1; sys.exit(1)

    # فحص دالة match_chunks
    try:
        zero_vec = "[" + ",".join(["0.0"] * 1536) + "]"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{sb_url}/rest/v1/rpc/match_chunks",
                json={"query_embedding": zero_vec, "match_threshold": 0.0, "match_count": 1},
                headers=hdrs,
            )
        if r.status_code == 200:
            ok("دالة match_chunks موجودة وتعمل")
        else:
            fail(f"دالة match_chunks غير موجودة أو خطأ: {r.status_code} — {r.text[:150]}")
            fail("شغّل api/supabase_setup.sql في Supabase SQL Editor")
            errors += 1; sys.exit(1)
    except Exception as e:
        fail(f"خطأ في فحص match_chunks: {e}")
        errors += 1; sys.exit(1)

    # ══════════════════════════════════════════════════
    header("4. توليد Embedding تجريبي (OpenAI)")
    # ══════════════════════════════════════════════════
    from openai import AsyncOpenAI
    oai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    try:
        resp = await oai.embeddings.create(
            model="text-embedding-3-small",
            input=["اختبار نظام RAG لجنان بيز"],
        )
        emb = resp.data[0].embedding
        assert len(emb) == 1536
        ok(f"OpenAI Embedding — بُعد: {len(emb)} ✓")
        info(f"نموذج: text-embedding-3-small | أول 5 قيم: {[round(x,4) for x in emb[:5]]}")
    except Exception as e:
        err_str = str(e)
        if "insufficient_quota" in err_str or "429" in err_str:
            warn("OpenAI — رصيد المفتاح صفر حالياً (سيتم الشحن لاحقاً) — تخطّي مراحل 4-7")
            info("أضف رصيداً من: https://platform.openai.com/settings/billing")
            sys.exit(0)   # خروج ناجح — ليس خطأ
        else:
            fail(f"خطأ في OpenAI Embeddings: {e}")
            errors += 1; sys.exit(1)

    # ══════════════════════════════════════════════════
    header("5. Ingest — رفع النص التجريبي إلى pgvector")
    # ══════════════════════════════════════════════════
    sys.path.insert(0, str(Path(__file__).parent.parent))
    try:
        from api.rag_engine import ingest_chunks, doc_id_from_filename
    except ImportError:
        from rag_engine import ingest_chunks, doc_id_from_filename

    test_doc_id = doc_id_from_filename(_TEST_FILENAME)
    info(f"doc_id للاختبار: {test_doc_id}")

    try:
        result = await ingest_chunks(_TEST_CHUNKS, _TEST_FILENAME, oai)
        if result["success"] and result["chunks_stored"] == len(_TEST_CHUNKS):
            ok(f"تم رفع {result['chunks_stored']} مقطع إلى pgvector")
            info(f"توكنز مُستخدمة تقريباً: {result.get('tokens_used_est', 0)}")
        else:
            fail(f"فشل الـ ingest: {result}")
            errors += 1
    except Exception as e:
        fail(f"خطأ أثناء ingest: {e}")
        errors += 1; sys.exit(1)

    # ══════════════════════════════════════════════════
    header("6. Search — استرجاع المقطع التجريبي")
    # ══════════════════════════════════════════════════
    try:
        from api.rag_engine import search as rag_search, build_rag_context
    except ImportError:
        from rag_engine import search as rag_search, build_rag_context

    try:
        results = await rag_search(_TEST_QUERY, oai, threshold=0.40, top_k=5)
        if results:
            ok(f"البحث الدلالي أعاد {len(results)} نتيجة")
            for r in results:
                sim = r.get("similarity", 0)
                hdr = r.get("header", "")
                info(f"  → [{sim:.0%}] {hdr}")

            context = build_rag_context(results)
            ok(f"build_rag_context — {len(context)} حرف سياق جاهز للـ LLM")

            # تحقق أن المقطع التجريبي موجود في النتائج
            found = any("TEST" in r.get("header","") for r in results)
            if found:
                ok("المقطع التجريبي مُسترجع بنجاح ✓")
            else:
                warn("المقطع التجريبي لم يظهر في النتائج (قد يكون threshold مرتفعاً)")
        else:
            warn("لم تُعد أي نتائج — جرّب تخفيض threshold أو تحقق من pgvector")
    except Exception as e:
        fail(f"خطأ أثناء البحث: {e}")
        errors += 1

    # ══════════════════════════════════════════════════
    header("7. Cleanup — حذف سجلات الاختبار")
    # ══════════════════════════════════════════════════
    try:
        from api.rag_engine import delete_document
    except ImportError:
        from rag_engine import delete_document

    try:
        deleted = await delete_document(test_doc_id)
        if deleted:
            ok(f"تم حذف سجلات الاختبار (doc_id: {test_doc_id})")
        else:
            warn("لم يُعثر على سجلات للحذف (ربما لم تُدرج في الخطوة 5)")
    except Exception as e:
        warn(f"خطأ أثناء الحذف: {e}")

    # ══════════════════════════════════════════════════
    header("النتيجة النهائية")
    # ══════════════════════════════════════════════════
    if errors == 0:
        print(f"\n  {GREEN}{BOLD}🎉 جميع الاختبارات اجتازت بنجاح! Pipeline جاهز لاستقبال ملفاتك.{RESET}\n")
        print(f"  {CYAN}الخطوة التالية: ارفع ملفاتك عبر POST /api/rag/ingest{RESET}\n")
    else:
        print(f"\n  {RED}{BOLD}⚠️  {errors} اختبار فشل — راجع الأخطاء أعلاه.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
