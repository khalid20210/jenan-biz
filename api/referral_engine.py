"""
referral_engine.py — محرك نظام الإحالات والنقاط لجنان بيز
===========================================================
المعادلة الأساسية:
  100 نقطة = 10 ريال سعودي
  كل إحالة ناجحة (أول دفعة للمُحال) = 100 نقطة للمُحيل

القيود المهمة:
  - النقاط تعمل في خدمات "جنان بيز" (استشارات) فقط
  - النقاط مُعطَّلة في خدمات "جنان برو" (تقنية)
  - منع الإحالة الذاتية (نفس الجهاز أو IP)
  - كل مستخدم محال بإحالة واحدة فقط (UNIQUE على referred_id)
"""

import os
import re
import hashlib
import logging
from typing import Optional

import httpx

logger = logging.getLogger("referral_engine")

# ── إعدادات ───────────────────────────────────────────────────────
POINTS_PER_REFERRAL = int(os.getenv("REFERRAL_REWARD_POINTS", "100"))   # 100 نقطة
POINTS_TO_SAR_RATE  = float(os.getenv("POINTS_TO_SAR_RATE", "0.10"))    # 1 نقطة = 0.10 ريال
MAX_REDEEM_RATIO    = float(os.getenv("MAX_REDEEM_RATIO", "0.50"))       # حد 50% خصم من النقاط
SIGNUP_BONUS_POINTS = int(os.getenv("SIGNUP_BONUS_POINTS", "0"))         # مكافأة التسجيل (0 = مُعطَّل)

# خدمات جنان برو — النقاط مُعطَّلة تماماً فيها
_PRO_SERVICE_PREFIXES = ("jenan_pro_", "pro_", "software_", "erp_", "pos_")

_SB_URL: str = ""
_SB_KEY: str = ""


def _init():
    """تهيئة بيانات Supabase عند الاستيراد."""
    global _SB_URL, _SB_KEY
    _SB_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    _SB_KEY = os.getenv("SUPABASE_ANON_KEY", "")


_init()


def _headers(use_service_key: bool = False) -> dict:
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", _SB_KEY) if use_service_key else _SB_KEY
    return {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }


def points_to_sar(points: int) -> float:
    """تحويل نقاط إلى ريال سعودي."""
    return round(points * POINTS_TO_SAR_RATE, 2)


def sar_to_points(sar: float) -> int:
    """تحويل ريال سعودي إلى نقاط (للعرض فقط)."""
    return int(sar / POINTS_TO_SAR_RATE)


def is_pro_service(service_id: str) -> bool:
    """هل هذه الخدمة تابعة لجنان برو؟ (النقاط مُعطَّلة فيها)."""
    sid = (service_id or "").lower()
    return any(sid.startswith(p) for p in _PRO_SERVICE_PREFIXES)


def _generate_code_locally(user_id: str) -> str:
    """توليد كود احتياطي إذا لم تكن Supabase متاحة (MD5 مُقتطع)."""
    raw = hashlib.sha256(f"jenan_ref_{user_id}".encode()).hexdigest()
    return raw[:8].upper()


def _sanitize_code(code: str) -> Optional[str]:
    """التحقق من صحة تنسيق كود الإحالة (8 أحرف A-Z0-9)."""
    code = (code or "").strip().upper()
    if re.fullmatch(r"[A-Z0-9]{6,10}", code):
        return code
    return None


# ══════════════════════════════════════════════════════════════════
# إنشاء / استرجاع ملف المستخدم
# ══════════════════════════════════════════════════════════════════

async def get_or_create_profile(user_id: str, referred_by_code: Optional[str] = None) -> dict:
    """
    جلب ملف المستخدم من users_profile أو إنشاؤه إن لم يكن موجوداً.
    referred_by_code: كود الإحالة الذي قدم به المستخدم (اختياري).
    """
    if not _SB_URL:
        return _mock_profile(user_id)

    async with httpx.AsyncClient(timeout=10) as client:
        # 1. محاولة الجلب أولاً
        r = await client.get(
            f"{_SB_URL}/rest/v1/users_profile",
            params={"user_id": f"eq.{user_id}", "limit": "1"},
            headers=_headers(),
        )
        if r.status_code == 200 and r.json():
            return r.json()[0]

        # 2. إنشاء ملف جديد
        # استدعاء دالة SQL لتوليد كود فريد
        rc = await client.post(
            f"{_SB_URL}/rest/v1/rpc/generate_referral_code",
            json={},
            headers=_headers(use_service_key=True),
        )
        ref_code = rc.json() if rc.status_code == 200 else _generate_code_locally(user_id)

        # التحقق من كود الإحالة المُقدَّم
        safe_referred_by = _sanitize_code(referred_by_code) if referred_by_code else None

        payload = {
            "user_id":       user_id,
            "referral_code": ref_code,
            "referred_by":   safe_referred_by,
            "points_balance": SIGNUP_BONUS_POINTS,
            "total_earned":   SIGNUP_BONUS_POINTS,
        }
        cr = await client.post(
            f"{_SB_URL}/rest/v1/users_profile",
            json=payload,
            headers=_headers(use_service_key=True),
        )
        if cr.status_code in (200, 201):
            profile = cr.json()[0] if isinstance(cr.json(), list) else cr.json()

            # تسجيل الإحالة إن وُجد كود
            if safe_referred_by:
                await _register_referral(user_id, safe_referred_by)

            # مكافأة التسجيل إن كانت مفعّلة
            if SIGNUP_BONUS_POINTS > 0:
                await _log_points(user_id, SIGNUP_BONUS_POINTS, "signup_bonus", "مكافأة التسجيل")

            return profile

        logger.error(f"[referral] فشل إنشاء ملف المستخدم: {cr.status_code} {cr.text[:200]}")
        return _mock_profile(user_id)


async def _register_referral(referred_id: str, referral_code: str):
    """تسجيل علاقة الإحالة في جدول referrals."""
    # 1. البحث عن المُحيل بالكود
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(
            f"{_SB_URL}/rest/v1/users_profile",
            params={"referral_code": f"eq.{referral_code}", "limit": "1"},
            headers=_headers(),
        )
        if r.status_code != 200 or not r.json():
            logger.warning(f"[referral] كود غير موجود: {referral_code}")
            return

        referrer = r.json()[0]
        referrer_id = referrer["user_id"]

        # منع الإحالة الذاتية
        if referrer_id == referred_id:
            logger.warning(f"[referral] محاولة إحالة ذاتية: {referred_id}")
            return

        # 2. إدراج سجل الإحالة
        payload = {
            "referrer_id":   referrer_id,
            "referred_id":   referred_id,
            "referral_code": referral_code,
            "reward_status": "pending",
        }
        await client.post(
            f"{_SB_URL}/rest/v1/referrals",
            json=payload,
            headers=_headers(use_service_key=True),
        )
        logger.info(f"[referral] إحالة مُسجَّلة: {referrer_id} ← {referred_id}")


# ══════════════════════════════════════════════════════════════════
# إطلاق مكافأة الإحالة (يُستدعى من webhook الدفع)
# ══════════════════════════════════════════════════════════════════

async def trigger_referral_reward(referred_id: str, payment_id: str) -> dict:
    """
    يُستدعى عند اكتمال أول دفعة للمستخدم المُحال.
    يمنح POINTS_PER_REFERRAL نقطة للمُحيل.
    """
    if not _SB_URL:
        return {"success": False, "reason": "supabase_not_configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{_SB_URL}/rest/v1/rpc/grant_referral_reward",
            json={
                "p_referred_id": referred_id,
                "p_payment_id":  payment_id,
                "p_reward_pts":  POINTS_PER_REFERRAL,
            },
            headers=_headers(use_service_key=True),
        )
        result = r.json() if r.status_code == 200 else {"success": False, "raw": r.text}
        logger.info(f"[referral] trigger_reward → {result}")
        return result


# ══════════════════════════════════════════════════════════════════
# استرداد النقاط في الدفع
# ══════════════════════════════════════════════════════════════════

async def calculate_points_discount(user_id: str, amount_sar: float, service_id: str) -> dict:
    """
    حساب قيمة خصم النقاط المتاح.
    يعيد: {eligible, max_points_usable, max_discount_sar, balance, reason}
    """
    # ⛔ خدمات جنان برو — النقاط مُعطَّلة
    if is_pro_service(service_id):
        return {
            "eligible":          False,
            "reason":            "pro_service",
            "message":           "النقاط غير متاحة لخدمات جنان برو",
            "max_points_usable": 0,
            "max_discount_sar":  0.0,
            "balance":           0,
        }

    profile = await get_or_create_profile(user_id)
    balance = profile.get("points_balance", 0)

    if balance <= 0:
        return {
            "eligible":          False,
            "reason":            "zero_balance",
            "message":           "لا يوجد رصيد نقاط",
            "max_points_usable": 0,
            "max_discount_sar":  0.0,
            "balance":           0,
        }

    # الحد الأقصى للخصم: 50% من قيمة الفاتورة
    max_discount_sar   = round(amount_sar * MAX_REDEEM_RATIO, 2)
    max_points_from_cap = sar_to_points(max_discount_sar)
    max_points_usable  = min(balance, max_points_from_cap)
    actual_discount    = points_to_sar(max_points_usable)

    return {
        "eligible":          True,
        "balance":           balance,
        "max_points_usable": max_points_usable,
        "max_discount_sar":  actual_discount,
        "points_rate":       f"100 نقطة = 10 ريال",
        "message":           f"يمكنك استخدام حتى {max_points_usable} نقطة (خصم {actual_discount} ريال)",
    }


async def redeem_points_for_payment(user_id: str, points: int, payment_id: str, service_id: str) -> dict:
    """
    استرداد النقاط في الدفع فعلياً (خصم من الرصيد).
    """
    if is_pro_service(service_id):
        return {"success": False, "reason": "pro_service_blocked"}

    if not _SB_URL:
        return {"success": False, "reason": "supabase_not_configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{_SB_URL}/rest/v1/rpc/redeem_points",
            json={"p_user_id": user_id, "p_points": points, "p_payment_id": payment_id},
            headers=_headers(use_service_key=True),
        )
        result = r.json() if r.status_code == 200 else {"success": False, "raw": r.text}
        logger.info(f"[referral] redeem_points({user_id}, {points}) → {result}")
        return result


# ══════════════════════════════════════════════════════════════════
# سجل المعاملات
# ══════════════════════════════════════════════════════════════════

async def get_points_history(user_id: str, limit: int = 20) -> list:
    """جلب آخر معاملات النقاط للمستخدم."""
    if not _SB_URL:
        return []
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(
            f"{_SB_URL}/rest/v1/points_log",
            params={
                "user_id":  f"eq.{user_id}",
                "order":    "created_at.desc",
                "limit":    str(limit),
            },
            headers=_headers(),
        )
        return r.json() if r.status_code == 200 else []


async def get_referrals_list(user_id: str) -> list:
    """قائمة الإحالات الصادرة من المستخدم."""
    if not _SB_URL:
        return []
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(
            f"{_SB_URL}/rest/v1/referrals",
            params={"referrer_id": f"eq.{user_id}", "order": "created_at.desc"},
            headers=_headers(),
        )
        return r.json() if r.status_code == 200 else []


# ══════════════════════════════════════════════════════════════════
# دوال مساعدة داخلية
# ══════════════════════════════════════════════════════════════════

async def _log_points(user_id: str, points: int, action_type: str, description: str):
    if not _SB_URL:
        return
    async with httpx.AsyncClient(timeout=5) as client:
        await client.post(
            f"{_SB_URL}/rest/v1/points_log",
            json={"user_id": user_id, "action_type": action_type,
                  "points": points, "description": description},
            headers=_headers(use_service_key=True),
        )


def _mock_profile(user_id: str) -> dict:
    """بيانات وهمية لوضع التطوير (Supabase غير متاحة)."""
    return {
        "user_id":       user_id,
        "referral_code": _generate_code_locally(user_id),
        "referred_by":   None,
        "points_balance": 0,
        "total_earned":   0,
        "total_spent":    0,
    }
