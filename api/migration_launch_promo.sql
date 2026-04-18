-- ══════════════════════════════════════════════════════════════════════
-- migration_launch_promo.sql
-- بروموشن الافتتاح: منح 50 ريال (= 500 نقطة) لأول 100 مستخدم مسجّل
-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة فقط
-- ══════════════════════════════════════════════════════════════════════

-- 1. إضافة عمود received_launch_promo إن لم يكن موجوداً
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS received_launch_promo BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. منح البرومو لأول 100 مستخدم مسجّل (بترتيب created_at) لم يحصلوا عليه بعد
--    500 نقطة × 0.10 ريال/نقطة = 50 ريال
WITH first_hundred AS (
  SELECT p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.received_launch_promo = FALSE
  ORDER BY u.created_at ASC
  LIMIT 100
)
UPDATE public.profiles
SET
  points_balance        = points_balance + 500,
  total_earned          = total_earned   + 500,
  received_launch_promo = TRUE
WHERE id IN (SELECT id FROM first_hundred);

-- تأكيد
SELECT
  COUNT(*) FILTER (WHERE received_launch_promo = TRUE)  AS promo_granted,
  COUNT(*) FILTER (WHERE received_launch_promo = FALSE) AS no_promo
FROM public.profiles;
