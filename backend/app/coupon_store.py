from datetime import datetime
from typing import Optional

from sqlalchemy.orm.attributes import flag_modified

from app import db
from app.models import User

COUPON_SETTINGS_KEY = "__coupon_settings"


def normalize_coupon_code(value: str) -> str:
    return str(value or "").strip().upper()


def _coupon_owner() -> Optional[User]:
    return (
        User.query.filter(User.is_admin.is_(True), User.is_active.is_(True))
        .order_by(User.id.asc())
        .first()
    )


def _owner_billing(owner: User) -> dict:
    return dict(owner.billing_address or {}) if isinstance(owner.billing_address, dict) else {}


def _clean_percent(value) -> int:
    try:
        percent = int(round(float(value)))
    except Exception:
        percent = 0
    return max(1, min(percent, 100))


def _serialize_coupon(raw: dict) -> dict:
    return {
        "code": normalize_coupon_code(raw.get("code")),
        "percent": _clean_percent(raw.get("percent")),
        "active": bool(raw.get("active", True)),
        "deleted": bool(raw.get("deleted", False)),
        "created_at": raw.get("created_at"),
        "updated_at": raw.get("updated_at"),
    }


def list_coupons(include_deleted: bool = False) -> list[dict]:
    owner = _coupon_owner()
    if not owner:
        return []

    billing = _owner_billing(owner)
    coupons = billing.get(COUPON_SETTINGS_KEY) or []
    if not isinstance(coupons, list):
        return []

    return [
        coupon
        for coupon in (_serialize_coupon(item) for item in coupons if isinstance(item, dict))
        if coupon["code"] and (include_deleted or not coupon.get("deleted"))
    ]


def save_coupons(coupons: list[dict]) -> list[dict]:
    owner = _coupon_owner()
    if not owner:
        raise ValueError("No hay usuario admin activo para guardar cupones")

    normalized = []
    seen = set()
    for item in coupons:
        coupon = _serialize_coupon(item)
        if not coupon["code"] or coupon["code"] in seen:
            continue
        seen.add(coupon["code"])
        normalized.append(coupon)

    billing = _owner_billing(owner)
    billing[COUPON_SETTINGS_KEY] = normalized
    owner.billing_address = billing
    flag_modified(owner, "billing_address")
    db.session.add(owner)
    db.session.commit()
    return normalized


def upsert_coupon(code: str, percent, active=True) -> dict:
    normalized_code = normalize_coupon_code(code)
    if not normalized_code:
        raise ValueError("El código del cupón es requerido")

    clean_percent = _clean_percent(percent)
    now = datetime.utcnow().isoformat()
    coupons = list_coupons(include_deleted=True)
    next_coupon = None

    for idx, coupon in enumerate(coupons):
        if coupon["code"] != normalized_code:
            continue
        next_coupon = {
            **coupon,
            "percent": clean_percent,
            "active": bool(active),
            "deleted": False,
            "updated_at": now,
        }
        coupons[idx] = next_coupon
        break

    if next_coupon is None:
        next_coupon = {
            "code": normalized_code,
            "percent": clean_percent,
            "active": bool(active),
            "deleted": False,
            "created_at": now,
            "updated_at": now,
        }
        coupons.append(next_coupon)

    save_coupons(coupons)
    return next_coupon


def set_coupon_active(code: str, active: bool) -> Optional[dict]:
    normalized_code = normalize_coupon_code(code)
    coupons = list_coupons()
    updated = None
    now = datetime.utcnow().isoformat()

    for idx, coupon in enumerate(coupons):
        if coupon["code"] != normalized_code:
            continue
        updated = {**coupon, "active": bool(active), "updated_at": now}
        coupons[idx] = updated
        break

    if updated:
        save_coupons(coupons)
    return updated


def delete_coupon(code: str) -> Optional[dict]:
    normalized_code = normalize_coupon_code(code)
    coupons = list_coupons(include_deleted=True)
    updated = None
    now = datetime.utcnow().isoformat()

    for idx, coupon in enumerate(coupons):
        if coupon["code"] != normalized_code:
            continue
        updated = {
            **coupon,
            "active": False,
            "deleted": True,
            "updated_at": now,
        }
        coupons[idx] = updated
        break

    if updated:
        save_coupons(coupons)
    return updated


def find_active_coupon(code: str) -> Optional[dict]:
    normalized_code = normalize_coupon_code(code)
    if not normalized_code:
        return None

    for coupon in list_coupons():
        if coupon["code"] == normalized_code and coupon.get("active"):
            return coupon
    return None


def calculate_discount(subtotal, code: str) -> Optional[dict]:
    coupon = find_active_coupon(code)
    if not coupon:
        return None

    try:
        base = float(subtotal or 0)
    except Exception:
        base = 0
    base = max(0, base)

    percent = _clean_percent(coupon.get("percent"))
    discount = round(base * percent / 100)
    total = max(0, round(base - discount))

    return {
        "code": coupon["code"],
        "percent": percent,
        "subtotal": round(base),
        "discount": discount,
        "total": total,
    }
