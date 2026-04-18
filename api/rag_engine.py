"""
rag_engine.py — محرك RAG الدلالي لجنان بيز
=========================================
الوظائف:
  • ingest_chunks()   — يُضمّن الـ chunks ويخزّنها في Supabase pgvector
  • search()          — يبحث دلالياً ويُعيد أقرب K مقاطع
  • delete_document() — يحذف وثيقة بالكامل من pgvector
  • build_rag_context()— يبني سياق RAG جاهزاً لإضافته إلى system prompt

المتطلبات:
  • SUPABASE_URL  و SUPABASE_ANON_KEY في .env
  • جدول knowledge_chunks مع extension pgvector (شغّل supabase_setup.sql)
  • نموذج OpenAI embeddings: text-embedding-3-small (1536 بُعد)
"""

import os
import hashlib
import httpx
from typing import List, Dict, Any, Optional
from loguru import logger

# ─── ثوابت ───────────────────────────────────────────────────────
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM   = 1536
_TABLE      = "knowledge_chunks"
_BATCH_SIZE = 50   # عدد النصوص في كل طلب embedding


# ─── دوال مساعدة ─────────────────────────────────────────────────

def _sb_url() -> str:
    return os.getenv("SUPABASE_URL", "").rstrip("/")

def _sb_key() -> str:
    return os.getenv("SUPABASE_ANON_KEY", "")

def _sb_hdrs() -> Dict[str, str]:
    return {
        "apikey":        _sb_key(),
        "Authorization": f"Bearer {_sb_key()}",
        "Content-Type":  "application/json",
    }

def _vec_str(embedding: List[float]) -> str:
    """يُحوّل قائمة floats إلى تنسيق Postgres vector: [x,y,...]"""
    return "[" + ",".join(f"{x:.8f}" for x in embedding) + "]"

def doc_id_from_filename(filename: str) -> str:
    """يُنشئ معرّف فريد ثابت للوثيقة من اسمها."""
    return hashlib.md5(filename.encode("utf-8")).hexdigest()[:16]


# ─── توليد Embeddings ─────────────────────────────────────────────

async def _embed_batch(texts: List[str], oai_client) -> List[List[float]]:
    """يُرسل دفعة نصوص إلى OpenAI ويُعيد قائمة embeddings."""
    resp = await oai_client.embeddings.create(
        model=EMBED_MODEL,
        input=texts,
    )
    return [item.embedding for item in resp.data]


async def _embed_all(texts: List[str], oai_client) -> List[List[float]]:
    """يُضمّن قائمة نصوص كاملة على دفعات."""
    all_emb: List[List[float]] = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        embs  = await _embed_batch(batch, oai_client)
        all_emb.extend(embs)
        logger.info(f"[RAG] embedded batch {i // _BATCH_SIZE + 1} — {len(batch)} chunks")
    return all_emb


# ─── Ingestion (حفظ في pgvector) ─────────────────────────────────

async def ingest_chunks(
    chunks: List[Dict],
    filename: str,
    oai_client,
) -> Dict[str, Any]:
    """
    يأخذ الـ chunks المُجزَّأة من document_parser، يولّد embeddings لكل chunk
    ويحفظها في جدول knowledge_chunks في Supabase pgvector.

    الإدخال:
      chunks   — قائمة قواميس {chunk_id, header, text, char_count, source}
      filename — اسم الملف (يُستخدم لاشتقاق doc_id)
      oai_client — AsyncOpenAI client

    الإخراج:
      {doc_id, chunks_stored, success, tokens_used}
    """
    url  = _sb_url()
    hdrs = _sb_hdrs()

    if not url or not _sb_key():
        raise RuntimeError("SUPABASE_URL أو SUPABASE_ANON_KEY غير موجود في .env")

    d_id  = doc_id_from_filename(filename)
    texts = [c["text"] for c in chunks]

    # 1) توليد الـ embeddings
    all_emb = await _embed_all(texts, oai_client)

    # 2) حذف السجلات القديمة للملف نفسه (upsert logic)
    async with httpx.AsyncClient(timeout=15) as client:
        del_resp = await client.delete(
            f"{url}/rest/v1/{_TABLE}?doc_id=eq.{d_id}",
            headers=hdrs,
        )
        logger.info(f"[RAG] deleted old chunks for doc_id={d_id}: {del_resp.status_code}")

    # 3) بناء صفوف الإدراج
    rows = [
        {
            "doc_id":     d_id,
            "filename":   filename,
            "chunk_id":   c["chunk_id"],
            "header":     c.get("header", "")[:200],
            "content":    c["text"],
            "char_count": c.get("char_count", len(c["text"])),
            "embedding":  _vec_str(emb),   # pgvector format
        }
        for c, emb in zip(chunks, all_emb)
    ]

    # 4) إدراج في Supabase (على دفعات 100 لتجنب timeout)
    success = True
    for i in range(0, len(rows), 100):
        batch = rows[i : i + 100]
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{url}/rest/v1/{_TABLE}",
                json=batch,
                headers={**hdrs, "Prefer": "return=minimal"},
            )
            if resp.status_code not in (200, 201):
                logger.error(f"[RAG] insert error {resp.status_code}: {resp.text[:300]}")
                success = False

    # تقدير التوكنز (تقريباً 1 token = 4 أحرف)
    total_chars  = sum(len(t) for t in texts)
    tokens_est   = total_chars // 4

    return {
        "doc_id":        d_id,
        "chunks_stored": len(rows),
        "success":       success,
        "tokens_used_est": tokens_est,
    }


# ─── البحث الدلالي ────────────────────────────────────────────────

async def search(
    query:     str,
    oai_client,
    threshold: float = 0.60,
    top_k:     int   = 5,
) -> List[Dict[str, Any]]:
    """
    يُضمّن query ثم يبحث في pgvector بـ cosine similarity.

    الإخراج:
      [{id, doc_id, filename, chunk_id, header, content, similarity}]
    """
    url  = _sb_url()
    hdrs = _sb_hdrs()

    if not url or not _sb_key():
        logger.warning("[RAG] Supabase not configured — skipping search")
        return []

    # توليد embedding للاستعلام
    [q_emb] = await _embed_all([query], oai_client)

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{url}/rest/v1/rpc/match_chunks",
            json={
                "query_embedding": _vec_str(q_emb),
                "match_threshold": threshold,
                "match_count":     top_k,
            },
            headers=hdrs,
        )

    if resp.status_code != 200:
        logger.warning(f"[RAG] search RPC failed {resp.status_code}: {resp.text[:200]}")
        return []

    results = resp.json()
    return results if isinstance(results, list) else []


# ─── حذف وثيقة ───────────────────────────────────────────────────

async def delete_document(doc_id: str) -> bool:
    """يحذف جميع chunks الوثيقة من pgvector."""
    url  = _sb_url()
    hdrs = _sb_hdrs()

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.delete(
            f"{url}/rest/v1/{_TABLE}?doc_id=eq.{doc_id}",
            headers=hdrs,
        )
    ok = resp.status_code in (200, 204)
    logger.info(f"[RAG] delete doc_id={doc_id}: {'OK' if ok else 'FAIL'} {resp.status_code}")
    return ok


# ─── بناء سياق RAG لـ LLM ────────────────────────────────────────

def build_rag_context(results: List[Dict], max_chars: int = 3000) -> str:
    """
    يبني نص سياق من نتائج البحث ليُضاف إلى system prompt.
    يُقلّص التوكنز بالاقتصار على أهم المقاطع فقط.
    """
    if not results:
        return ""

    lines = ["=== معلومات من قاعدة المعرفة ==="]
    total = 0
    for r in results:
        header  = r.get("header", "")
        content = r.get("content", "")
        sim     = r.get("similarity", 0)
        src     = r.get("filename", "")

        entry = f"\n[{header}] (تطابق: {sim:.0%} | المصدر: {src})\n{content}"
        if total + len(entry) > max_chars:
            break
        lines.append(entry)
        total += len(entry)

    lines.append("=== نهاية المعلومات ===")
    return "\n".join(lines)
