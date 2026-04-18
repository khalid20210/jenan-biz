-- ══════════════════════════════════════════════════════════════════
-- referral_setup.sql — نظام الإحالات والنقاط لجنان بيز
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. ملحق الأرقام العشوائية (مطلوب لـ referral_code)
-- ──────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────────
-- 2. جدول ملفات المستخدمين (users_profile)
--    يُخزَّن referral_code + رصيد النقاط هنا
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users_profile (
  id              BIGSERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL UNIQUE,          -- معرّف المستخدم (JWT sub)
  referral_code   TEXT NOT NULL UNIQUE,          -- كود فريد 8 أحرف
  referred_by     TEXT,                          -- referral_code المُحيل
  points_balance  INT  NOT NULL DEFAULT 0,       -- رصيد النقاط الحالي
  total_earned    INT  NOT NULL DEFAULT 0,       -- مجموع النقاط المكتسبة
  total_spent     INT  NOT NULL DEFAULT 0,       -- مجموع النقاط المُنفقة
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_profile_referral_code_idx ON users_profile (referral_code);
CREATE INDEX IF NOT EXISTS users_profile_referred_by_idx   ON users_profile (referred_by);

-- ──────────────────────────────────────────────────────────────────
-- 3. جدول الإحالات (referrals)
--    يتتبع كل إحالة من البداية حتى اكتمال الدفع
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              BIGSERIAL PRIMARY KEY,
  referrer_id     TEXT NOT NULL,                 -- user_id المُحيل
  referred_id     TEXT NOT NULL,                 -- user_id المُحال
  referral_code   TEXT NOT NULL,                 -- الكود المُستخدَم
  reward_status   TEXT NOT NULL DEFAULT 'pending',
    -- pending = انتظار أول دفعة
    -- rewarded = تم منح المكافأة
    -- expired  = انتهت صلاحية الإحالة (30 يوم بدون دفع)
  reward_points   INT  NOT NULL DEFAULT 0,       -- النقاط المُمنوحة
  payment_id      TEXT,                          -- معرّف الدفعة التي فعّلت المكافأة
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  rewarded_at     TIMESTAMPTZ,
  UNIQUE (referred_id)                           -- كل مُحال مرتبط بإحالة واحدة فقط
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx   ON referrals (reward_status);

-- ──────────────────────────────────────────────────────────────────
-- 4. جدول سجل المعاملات النقطية (points_log)
--    يُظهر للمستخدم كل نقطة كسبها أو أنفقها
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS points_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  action_type     TEXT NOT NULL,
    -- 'referral_reward'  = مكافأة إحالة
    -- 'signup_bonus'     = مكافأة التسجيل
    -- 'redeemed'         = استخدام نقاط في الدفع
    -- 'expired'          = نقاط منتهية الصلاحية
    -- 'admin_credit'     = منح إداري
  points          INT  NOT NULL,                 -- موجب = كسب، سالب = إنفاق
  description     TEXT,
  reference_id    TEXT,                          -- payment_id أو referral_id للمرجع
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS points_log_user_idx    ON points_log (user_id);
CREATE INDEX IF NOT EXISTS points_log_created_idx ON points_log (created_at DESC);

-- ──────────────────────────────────────────────────────────────────
-- 5. دالة: إنشاء ملف مستخدم جديد تلقائياً مع referral_code فريد
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INT;
BEGIN
  LOOP
    -- 8 أحرف عشوائية (أرقام + أحرف كبيرة)
    code := UPPER(SUBSTRING(encode(gen_random_bytes(6), 'base64') FROM 1 FOR 8));
    code := REGEXP_REPLACE(code, '[^A-Z0-9]', '', 'g');
    code := LPAD(code, 8, '0');
    code := SUBSTRING(code, 1, 8);
    -- تحقق من الفرادة
    SELECT COUNT(*) INTO exists_check FROM users_profile WHERE referral_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────
-- 6. دالة: منح مكافأة الإحالة (آمنة ضد التكرار)
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION grant_referral_reward(
  p_referred_id  TEXT,
  p_payment_id   TEXT,
  p_reward_pts   INT DEFAULT 100    -- 100 نقطة = 10 ريال
)
RETURNS JSONB AS $$
DECLARE
  v_referral    referrals%ROWTYPE;
  v_referrer_id TEXT;
BEGIN
  -- 1. ابحث عن الإحالة المعلّقة
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_id
    AND reward_status = 'pending'
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pending_referral');
  END IF;

  v_referrer_id := v_referral.referrer_id;

  -- 2. تحديث حالة الإحالة
  UPDATE referrals
  SET reward_status = 'rewarded',
      reward_points = p_reward_pts,
      payment_id    = p_payment_id,
      rewarded_at   = NOW()
  WHERE id = v_referral.id;

  -- 3. إضافة النقاط لرصيد المُحيل
  UPDATE users_profile
  SET points_balance = points_balance + p_reward_pts,
      total_earned   = total_earned   + p_reward_pts,
      updated_at     = NOW()
  WHERE user_id = v_referrer_id;

  -- 4. تسجيل في سجل المعاملات
  INSERT INTO points_log (user_id, action_type, points, description, reference_id)
  VALUES (
    v_referrer_id,
    'referral_reward',
    p_reward_pts,
    'مكافأة إحالة — مستخدم جديد أتمّ أول دفعة',
    v_referral.id::TEXT
  );

  RETURN jsonb_build_object(
    'success',      true,
    'referrer_id',  v_referrer_id,
    'points_added', p_reward_pts,
    'referral_id',  v_referral.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────
-- 7. دالة: استرداد النقاط في الدفع (خصم من الرصيد)
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_points(
  p_user_id    TEXT,
  p_points     INT,       -- النقاط المُراد استردادها
  p_payment_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_balance INT;
BEGIN
  SELECT points_balance INTO v_balance
  FROM users_profile
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found');
  END IF;

  IF v_balance < p_points THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_points', 'balance', v_balance);
  END IF;

  -- خصم النقاط
  UPDATE users_profile
  SET points_balance = points_balance - p_points,
      total_spent    = total_spent    + p_points,
      updated_at     = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO points_log (user_id, action_type, points, description, reference_id)
  VALUES (p_user_id, 'redeemed', -p_points, 'استخدام نقاط في الدفع', p_payment_id);

  RETURN jsonb_build_object('success', true, 'points_used', p_points, 'new_balance', v_balance - p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────
-- 8. فهرس RLS Policies (اختياري — فعّل إذا استخدمت Supabase Auth)
-- ──────────────────────────────────────────────────────────────────
-- ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE referrals     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE points_log    ENABLE ROW LEVEL SECURITY;
-- يُطبَّق بعد ربط Supabase Auth الكامل

-- ══════════════════════════════════════════════════════════════════
-- انتهى الإعداد — جداول: users_profile, referrals, points_log
-- دوال: generate_referral_code, grant_referral_reward, redeem_points
-- ══════════════════════════════════════════════════════════════════
