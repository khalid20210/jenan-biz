-- ══════════════════════════════════════════════════════════════
-- supabase_setup.sql — إعداد قاعدة معرفة جنان بيز (pgvector)
-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة فقط
-- ══════════════════════════════════════════════════════════════

-- ─── 1) تفعيل مكتبة pgvector ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;


-- ─── 2) جدول knowledge_chunks ─────────────────────────────────
-- يخزّن كل مقطع نصي مع embedding بُعد 1536 (text-embedding-3-small)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          BIGSERIAL    PRIMARY KEY,
  doc_id      TEXT         NOT NULL,          -- معرّف الوثيقة (MD5 من اسم الملف)
  filename    TEXT         NOT NULL,          -- اسم الملف الأصلي
  chunk_id    INT          NOT NULL,          -- رقم المقطع داخل الوثيقة
  header      TEXT,                           -- عنوان المادة / الفقرة
  content     TEXT         NOT NULL,          -- النص الكامل للمقطع
  char_count  INT,                            -- عدد الأحرف
  embedding   VECTOR(1536),                   -- vector embedding من OpenAI
  created_at  TIMESTAMPTZ  DEFAULT NOW(),

  UNIQUE (doc_id, chunk_id)                   -- منع التكرار
);


-- ─── 3) فهرس IVFFlat للبحث التقريبي السريع ────────────────────
-- يُستخدم بعد وصول عدد الصفوف لأكثر من ~1000 سجل
-- مع cosine distance للعربية (أفضل من L2 للنصوص)
CREATE INDEX IF NOT EXISTS knowledge_chunks_emb_idx
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);


-- ─── 4) دالة RPC للبحث الدلالي ────────────────────────────────
-- تُستدعى من الـ backend عبر: /rest/v1/rpc/match_chunks
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT   DEFAULT 0.60,
  match_count      INT     DEFAULT 5
)
RETURNS TABLE (
  id          BIGINT,
  doc_id      TEXT,
  filename    TEXT,
  chunk_id    INT,
  header      TEXT,
  content     TEXT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    doc_id,
    filename,
    chunk_id,
    header,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding   -- أقرب أولاً
  LIMIT match_count;
$$;


-- ─── 5) Supabase Storage Bucket ────────────────────────────────
-- أنشئ bucket اسمه "knowledge-base" في Supabase Storage Dashboard
-- أو شغّل هذا:
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;


-- ─── 6) RLS (اختياري في الإنتاج) ─────────────────────────────
-- فعّله إذا أردت عزل بيانات كل مستخدم عن الآخر
-- ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "service_role_full_access" ON knowledge_chunks
--   USING (true) WITH CHECK (true);


-- ─── تحقق ────────────────────────────────────────────────────
-- بعد التشغيل تحقق بـ:
-- SELECT COUNT(*) FROM knowledge_chunks;
-- SELECT * FROM match_chunks('[0,0,0]'::vector(1536), 0.1, 3);
