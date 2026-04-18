-- ══════════════════════════════════════════════════════════════════════
-- core_schema.sql — الأساس الخرساني لقاعدة بيانات جنان بيز
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor
-- الترتيب مهم: profiles أولاً ← transactions ← subscriptions ← triggers
-- ══════════════════════════════════════════════════════════════════════

-- ── 0. الإضافات المطلوبة ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- لتوليد referral_code
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- لـ uuid_generate_v4()

-- ══════════════════════════════════════════════════════════════════════
-- 1. جدول الملفات الشخصية (profiles)
--    مرتبط 1:1 مع auth.users عبر Trigger تلقائي
--    يُنشأ عند تسجيل أي مستخدم جديد دون أي كود يدوي
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  -- المفتاح الأساسي = UUID المستخدم من Supabase Auth
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- بيانات الحساب
  full_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,

  -- دور المستخدم في المنصة
  role            TEXT NOT NULL DEFAULT 'free'
                    CHECK (role IN ('free', 'biz', 'pro', 'platinum', 'admin')),
  --  free  = مجاني (3 تقارير)
  --  biz   = جنان بيز (اشتراك استشارات — النقاط مفعّلة)
  --  pro   = جنان برو (اشتراك تقني   — النقاط مُعطَّلة)
  --  admin = مشرف النظام

  -- نظام الإحالات والنقاط
  referral_code   TEXT NOT NULL UNIQUE,          -- كود 8 أحرف فريد لكل مستخدم
  referred_by     TEXT,                          -- referral_code المُحيل
  points_balance  INT  NOT NULL DEFAULT 0,       -- الرصيد الحالي
  total_earned    INT  NOT NULL DEFAULT 0,       -- مجموع ما كسبه
  total_spent     INT  NOT NULL DEFAULT 0,       -- مجموع ما أنفقه

  -- بروموشن الافتتاح (أول 100 مستخدم يحصلون على 50 ريال = 500 نقطة)
  received_launch_promo BOOLEAN NOT NULL DEFAULT FALSE,

  -- بيانات إضافية
  city            TEXT,
  business_name   TEXT,
  sector          TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس الأداء
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles (referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx   ON profiles (referred_by);
CREATE INDEX IF NOT EXISTS profiles_role_idx          ON profiles (role);

-- ── تعليق: دمج مع users_profile السابق ──────────────────────────────
-- إذا كانت لديك بيانات في users_profile (من referral_setup.sql)
-- يمكن نقلها هكذا بعد إنشاء الجدول:
--
-- INSERT INTO profiles (id, referral_code, referred_by, points_balance, ...)
-- SELECT user_id::UUID, referral_code, referred_by, points_balance, ...
-- FROM users_profile
-- ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- 2. دالة توليد كود الإحالة الفريد
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code        TEXT;
  exists_count INT;
BEGIN
  LOOP
    -- توليد 6 بايت عشوائية → base64 → أخذ أول 8 أحرف أبجدية-رقمية
    code := UPPER(REGEXP_REPLACE(
      SUBSTRING(encode(gen_random_bytes(6), 'base64'), 1, 10),
      '[^A-Z0-9]', '', 'g'
    ));
    -- تأكد من 8 أحرف بالضبط
    code := SUBSTRING(LPAD(code, 8, '0'), 1, 8);

    SELECT COUNT(*) INTO exists_count
    FROM profiles WHERE referral_code = code;

    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════
-- 3. دالة + Trigger: إنشاء profile تلقائياً عند تسجيل مستخدم جديد
--    يُطلَق من Supabase Auth عند أي INSERT على auth.users
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_ref_code    TEXT;
  v_ref_by      TEXT;
  v_user_count  INT;
  v_promo_pts   INT := 0;
  v_got_promo   BOOLEAN := FALSE;
BEGIN
  -- توليد كود إحالة فريد
  v_ref_code := generate_referral_code();

  -- استخراج كود الإحالة من metadata (مُمرَّر من الـ Frontend عند التسجيل)
  v_ref_by := NEW.raw_user_meta_data->>'referred_by';

  -- ─── بروموشن الافتتاح: أول 100 مستخدم يحصلون على 50 ريال (= 500 نقطة) ───
  -- نحسب المستخدمين المسجّلين قبل هذا المستخدم
  SELECT COUNT(*) INTO v_user_count FROM auth.users WHERE id != NEW.id;
  IF v_user_count < 100 THEN
    v_promo_pts := 500;   -- 500 نقطة × 0.10 ريال/نقطة = 50 ريال
    v_got_promo := TRUE;
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    referral_code,
    referred_by,
    role,
    points_balance,
    total_earned,
    received_launch_promo
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.phone,
    v_ref_code,
    v_ref_by,
    'free',
    v_promo_pts,
    v_promo_pts,
    v_got_promo
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تأكد من عدم وجود trigger مكرر
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ══════════════════════════════════════════════════════════════════════
-- 4. جدول المعاملات المالية (transactions)
--    يُسجَّل تلقائياً من webhook الدفع (Moyasar/Tamara/Tabby/STC)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
  id              BIGSERIAL PRIMARY KEY,

  -- معرّف المستخدم (UUID من profiles)
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- user_id_str: نستخدمه إذا المستخدم لم يُنشئ profile بعد (anonymous)
  user_id_str     TEXT,

  -- تفاصيل الدفعة
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'SAR',
  payment_method  TEXT,
  --  moyasar_card | moyasar_applepay | tamara | tabby | stcpay | applepay

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','failed','refunded','expired')),

  -- معرفات خارجية
  reference_id    TEXT UNIQUE,      -- Moyasar payment_id / Tamara order_id
  gateway         TEXT DEFAULT 'moyasar',  -- بوابة الدفع

  -- تفاصيل المنتج
  product_id      TEXT,
  product_name    TEXT,
  plan_name       TEXT,
  plan_type       TEXT,
  --  biz_monthly | biz_yearly | pro_monthly | pro_yearly | one_time

  -- النقاط المُستخدمة في هذه الفاتورة
  points_used     INT  DEFAULT 0,
  discount_sar    NUMERIC(10,2) DEFAULT 0,

  -- payload كامل من الـ gateway (للمراجعة)
  metadata        JSONB,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx    ON transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx     ON transactions (status);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_plan_type_idx  ON transactions (plan_type);

-- ══════════════════════════════════════════════════════════════════════
-- 5. جدول الاشتراكات (subscriptions)
--    يُحدَّث تلقائياً عند دفعة ناجحة
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id              BIGSERIAL PRIMARY KEY,

  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  plan_type       TEXT NOT NULL,
  --  biz_monthly | biz_yearly | pro_monthly | pro_yearly

  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','cancelled','expired','paused')),

  start_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date        TIMESTAMPTZ NOT NULL,
  -- biz_monthly = +30 يوم ، biz_yearly = +365 يوم

  transaction_id  BIGINT REFERENCES transactions(id) ON DELETE SET NULL,

  auto_renew      BOOLEAN DEFAULT TRUE,

  -- للتجديد التلقائي
  last_renewed_at TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- قيد: اشتراك نشط واحد لكل خطة لكل مستخدم
  UNIQUE (user_id, plan_type)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx  ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx   ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_end_date_idx ON subscriptions (end_date);

-- ══════════════════════════════════════════════════════════════════════
-- 6. دالة: تحديث updated_at تلقائياً عند كل UPDATE
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق على الجداول الثلاثة
DROP TRIGGER IF EXISTS set_updated_at_profiles       ON profiles;
DROP TRIGGER IF EXISTS set_updated_at_transactions   ON transactions;
DROP TRIGGER IF EXISTS set_updated_at_subscriptions  ON subscriptions;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- 7. دالة: on_payment_success
--    تُستدعى من webhook الدفع بعد تأكيد status=paid
--    تُنجز في معاملة واحدة atomically:
--      أ) تُسجّل/تُحدّث الـ transaction
--      β) تُنشئ/تُجدّد الـ subscription
--      ج) تُحدّث role المستخدم في profiles
--      د) تُطلق مكافأة الإحالة إن وُجدت
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION on_payment_success(
  p_user_id       TEXT,         -- user UUID كـ TEXT
  p_reference_id  TEXT,         -- Moyasar payment_id
  p_amount        NUMERIC,      -- بالريال
  p_plan_type     TEXT,         -- platinum_monthly | platinum_yearly | biz_monthly | ...
  p_plan_name     TEXT DEFAULT NULL,  -- platinum | biz | pro (الدور المباشر)
  p_product_id    TEXT DEFAULT NULL,
  p_product_name  TEXT DEFAULT NULL,
  p_gateway       TEXT DEFAULT 'moyasar',
  p_metadata      JSONB DEFAULT '{}'::JSONB,
  p_points_used   INT  DEFAULT 0,
  p_discount_sar  NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_user_uuid    UUID;
  v_tx_id        BIGINT;
  v_end_date     TIMESTAMPTZ;
  v_new_role     TEXT;
  v_referral_res JSONB;
BEGIN

  -- ── تحويل user_id إلى UUID ───────────────────────────────────────
  BEGIN
    v_user_uuid := p_user_id::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_user_id');
  END;

  -- ── أ) تسجيل المعاملة في transactions ──────────────────────────────
  INSERT INTO transactions (
    user_id, reference_id, amount, currency, gateway,
    status, plan_type, product_id, product_name,
    points_used, discount_sar, metadata
  ) VALUES (
    v_user_uuid, p_reference_id, p_amount, 'SAR', p_gateway,
    'paid', p_plan_type, p_product_id, p_product_name,
    p_points_used, p_discount_sar, p_metadata
  )
  ON CONFLICT (reference_id) DO UPDATE
    SET status = 'paid', updated_at = NOW()
  RETURNING id INTO v_tx_id;

  -- ── β) حساب تاريخ انتهاء الاشتراك ──────────────────────────────────
  v_end_date := CASE
    WHEN p_plan_type LIKE '%_yearly'  THEN NOW() + INTERVAL '365 days'
    WHEN p_plan_type LIKE '%_monthly' THEN NOW() + INTERVAL '30 days'
    ELSE NOW() + INTERVAL '30 days'  -- افتراضي
  END;

  -- ── ج) تحديد الدور الجديد ────────────────────────────────────────────
  v_new_role := CASE
    WHEN p_plan_name IS NOT NULL AND p_plan_name != '' THEN p_plan_name
    WHEN p_plan_type LIKE 'platinum_%' THEN 'platinum'
    WHEN p_plan_type LIKE 'biz_%'      THEN 'biz'
    WHEN p_plan_type LIKE 'pro_%'      THEN 'pro'
    ELSE 'free'
  END;

  -- ── د) إنشاء/تجديد الاشتراك ─────────────────────────────────────────
  INSERT INTO subscriptions (
    user_id, plan_type, status, start_date, end_date,
    transaction_id, auto_renew, last_renewed_at, next_billing_at
  ) VALUES (
    v_user_uuid, p_plan_type, 'active', NOW(), v_end_date,
    v_tx_id, TRUE, NOW(), v_end_date
  )
  ON CONFLICT (user_id, plan_type) DO UPDATE
    SET status          = 'active',
        end_date        = v_end_date,
        transaction_id  = v_tx_id,
        last_renewed_at = NOW(),
        next_billing_at = v_end_date,
        updated_at      = NOW();

  -- ── هـ) تحديث role المستخدم في profiles ──────────────────────────────
  UPDATE profiles
  SET role       = v_new_role,
      updated_at = NOW()
  WHERE id = v_user_uuid;

  -- ── و) تعيين حصص الخدمات ────────────────────────────────────────────
  BEGIN
    PERFORM assign_plan_quotas(v_user_uuid, v_new_role, NOW(), v_end_date);
  EXCEPTION WHEN undefined_function THEN
    NULL; -- assign_plan_quotas غير موجودة بعد
  END;

  -- ── ز) مكافأة الإحالة بناءً على سعر الباقة (10%) ────────────────────
  DECLARE
    v_reward_sar NUMERIC;
  BEGIN
    v_reward_sar := get_referral_reward(v_new_role, p_amount);
    -- استدعاء دالة grant_referral_reward مع المبلغ الصحيح
    BEGIN
      SELECT grant_referral_reward(p_user_id, p_reference_id, ROUND(v_reward_sar / 0.10)::INT)
      INTO v_referral_res;
    EXCEPTION WHEN undefined_function THEN
      v_referral_res := jsonb_build_object('success', false, 'reason', 'referral_not_setup');
    END;
  EXCEPTION WHEN OTHERS THEN
    v_referral_res := jsonb_build_object('success', false, 'reason', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success',         true,
    'transaction_id',  v_tx_id,
    'new_role',        v_new_role,
    'end_date',        v_end_date,
    'referral_reward', v_referral_res
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════
-- 8. دالة: انتهاء الاشتراكات التلقائي (تُشغَّل بـ pg_cron أو Supabase Edge Function)
--    Supabase: يمكن إعداد Scheduled Function كل يوم في منتصف الليل
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION expire_old_subscriptions()
RETURNS INT AS $$
DECLARE
  affected INT;
BEGIN
  -- تعطيل الاشتراكات المنتهية
  UPDATE subscriptions
  SET status     = 'expired',
      updated_at = NOW()
  WHERE status     = 'active'
    AND end_date   < NOW();

  GET DIAGNOSTICS affected = ROW_COUNT;

  -- إرجاع المستخدمين المنتهية اشتراكاتهم إلى 'free'
  UPDATE profiles p
  SET role       = 'free',
      updated_at = NOW()
  WHERE p.role IN ('launch', 'entrepreneur', 'investor', 'platinum', 'biz', 'pro')
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id
        AND s.status  = 'active'
        AND s.end_date > NOW()
    );

  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════
-- 11. جدول حصص الخدمات (user_quotas)
--     يُنشأ/يُحدَّث عند كل اشتراك ناجح
--     يُخفَّض رصيده عند كل استخدام للخدمة
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_quotas (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type         TEXT NOT NULL,                    -- launch | entrepreneur | investor

  -- الحصص المتبقية (NULL = لامحدودة)
  analyses_rem      INT  NOT NULL DEFAULT 0,          -- تحليلات المشاريع
  simple_study_rem  INT  NOT NULL DEFAULT 0,          -- دراسات الجدوى المبسطة
  detail_study_rem  INT  NOT NULL DEFAULT 0,          -- دراسات الجدوى المفصلة
  designs_rem       INT  NOT NULL DEFAULT 0,          -- خدمات التصميم
  downloads_rem     INT  DEFAULT NULL,                -- التحميلات (NULL = لامحدود)

  -- إعادة الضبط الشهرية
  subscription_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_end   TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, plan_type)
);

CREATE INDEX IF NOT EXISTS user_quotas_user_id_idx ON user_quotas (user_id);

DROP TRIGGER IF EXISTS set_updated_at_user_quotas ON user_quotas;
CREATE TRIGGER set_updated_at_user_quotas
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── دالة: تعيين الحصص عند الاشتراك ──────────────────────────────────
CREATE OR REPLACE FUNCTION assign_plan_quotas(
  p_user_id   UUID,
  p_plan_name TEXT,   -- launch | entrepreneur | investor
  p_start     TIMESTAMPTZ DEFAULT NOW(),
  p_end       TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_analyses      INT;
  v_simple_study  INT;
  v_detail_study  INT;
  v_designs       INT;
  v_downloads     INT;  -- NULL = لامحدود
BEGIN
  CASE p_plan_name
    WHEN 'launch' THEN
      v_analyses     := 1;
      v_simple_study := 0;
      v_detail_study := 0;
      v_designs      := 2;   -- تصميم شعار + خدمة تصميم
      v_downloads    := 10;
    WHEN 'entrepreneur' THEN
      v_analyses     := 3;
      v_simple_study := 1;
      v_detail_study := 0;
      v_designs      := 5;
      v_downloads    := 25;
    WHEN 'investor' THEN
      v_analyses     := 5;
      v_simple_study := 2;
      v_detail_study := 1;
      v_designs      := 10;
      v_downloads    := NULL;  -- لامحدود
    ELSE
      -- باقات قديمة أو platinum
      v_analyses     := 5;
      v_simple_study := 2;
      v_detail_study := 1;
      v_designs      := 10;
      v_downloads    := NULL;
  END CASE;

  INSERT INTO user_quotas (
    user_id, plan_type,
    analyses_rem, simple_study_rem, detail_study_rem, designs_rem, downloads_rem,
    subscription_start, subscription_end
  ) VALUES (
    p_user_id, p_plan_name,
    v_analyses, v_simple_study, v_detail_study, v_designs, v_downloads,
    p_start, p_end
  )
  ON CONFLICT (user_id, plan_type) DO UPDATE
    SET analyses_rem      = EXCLUDED.analyses_rem,
        simple_study_rem  = EXCLUDED.simple_study_rem,
        detail_study_rem  = EXCLUDED.detail_study_rem,
        designs_rem       = EXCLUDED.designs_rem,
        downloads_rem     = EXCLUDED.downloads_rem,
        subscription_start = EXCLUDED.subscription_start,
        subscription_end  = EXCLUDED.subscription_end,
        updated_at        = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════
-- 12. جدول الإحالات (referrals) — مع عمولة الباقات الجديدة
--     10% من سعر الباقة:
--       - الانطلاق    (149 ر.س) → 14.9 ر.س
--       - رواد الأعمال (500 ر.س) → 50   ر.س
--       - المستثمر   (1200 ر.س) → 120  ر.س
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS referrals (
  id              BIGSERIAL PRIMARY KEY,
  referrer_id     TEXT NOT NULL,    -- referral_code المُحيل
  referred_id     UUID,             -- UUID المستخدم المُحال
  transaction_id  BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  reward_sar      NUMERIC(10,2),    -- 14.9 | 50 | 120 حسب الباقة
  reward_pts      INT,              -- points_balance المُضافة للمحيل
  reward_status   TEXT NOT NULL DEFAULT 'pending'
                    CHECK (reward_status IN ('pending','rewarded','failed')),
  plan_type       TEXT,             -- نوع الباقة التي اشترك بها المُحال
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx   ON referrals (reward_status);

DROP TRIGGER IF EXISTS set_updated_at_referrals ON referrals;
CREATE TRIGGER set_updated_at_referrals
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── دالة: حساب عمولة الإحالة حسب الباقة ────────────────────────────
CREATE OR REPLACE FUNCTION get_referral_reward(p_plan_name TEXT, p_amount NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  -- 10% من سعر الباقة
  RETURN ROUND(p_amount * 0.10, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ══════════════════════════════════════════════════════════════════════
-- تحديث CHECK constraint على profiles.role لإضافة الباقات الجديدة
-- ══════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('free','launch','entrepreneur','investor','platinum','biz','pro','admin'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 9. View: لوحة تحكم المستخدم (بيانات مجمّعة)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
  p.id,
  p.full_name,
  p.role,
  p.referral_code,
  p.points_balance,
  p.total_earned,
  p.total_spent,
  COALESCE(p.points_balance * 0.10, 0)  AS points_in_sar,
  -- الاشتراك النشط
  s.plan_type                            AS active_plan,
  s.end_date                             AS subscription_end,
  s.status                               AS subscription_status,
  -- إحصاء الإحالات
  (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id::TEXT)            AS total_referrals,
  (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id::TEXT
     AND r.reward_status = 'rewarded')                                            AS rewarded_referrals,
  -- آخر عملية دفع
  (SELECT t.amount FROM transactions t WHERE t.user_id = p.id
     ORDER BY t.created_at DESC LIMIT 1)                                          AS last_payment_amount,
  (SELECT t.created_at FROM transactions t WHERE t.user_id = p.id
     ORDER BY t.created_at DESC LIMIT 1)                                          AS last_payment_at
FROM profiles p
LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active';

-- ══════════════════════════════════════════════════════════════════════
-- 10. Row Level Security (RLS) — اختياري — فعّل عند تطبيق Auth الكامل
-- ══════════════════════════════════════════════════════════════════════
-- ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "users see own profile"
--   ON profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "users see own transactions"
--   ON transactions FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "users see own subscriptions"
--   ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════
-- الملخص:
-- الجداول   : profiles, transactions, subscriptions
-- الدوال    : generate_referral_code, handle_new_user, on_payment_success,
--              expire_old_subscriptions, set_updated_at, grant_referral_reward (من referral_setup.sql)
-- Triggers  : on_auth_user_created, set_updated_at_*
-- Views     : user_dashboard
-- ══════════════════════════════════════════════════════════════════════
