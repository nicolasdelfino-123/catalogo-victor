from datetime import datetime
from typing import Optional

from sqlalchemy.orm.attributes import flag_modified

from app import db
from app.models import Product, User

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


def _normalize_scope_type(value) -> str:
    scope_type = str(value or "all").strip().lower()
    return scope_type if scope_type in {"brand", "category", "best_seller"} else "all"


def _normalize_scope_values(values) -> list[str]:
    if values in (None, ""):
        return []
    if not isinstance(values, list):
        values = [values]

    normalized = []
    seen = set()
    for value in values:
        text = str(value or "").strip()
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(text)
    return normalized


def _normalize_scope_match_value(value) -> str:
    return " ".join(str(value or "").strip().casefold().split())


def _category_match_keys(value) -> set[str]:
    text = _normalize_scope_match_value(value)
    if not text:
        return set()

    keys = {text}
    numeric = text
    if numeric.isdigit():
        keys.add(f"id:{numeric}")

    plain = (
        text.replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
    )
    if "mascul" in plain or "hombre" in plain:
        keys.add("id:1")
    if "femen" in plain or "mujer" in plain:
        keys.add("id:2")
    if "unisex" in plain:
        keys.add("id:3")
    if "arabe" in plain or "arabes" in plain:
        keys.add("id:4")
    if "disen" in plain:
        keys.add("id:5")
    if "nicho" in plain:
        keys.add("id:6")
    if "combo" in plain:
        keys.add("id:7")
    if "ultimo ingreso" in plain or "ultimos ingresos" in plain:
        keys.add("id:8")
    return keys


def _serialize_coupon(raw: dict) -> dict:
    scope_type = _normalize_scope_type(raw.get("scope_type"))
    scope_values = _normalize_scope_values(raw.get("scope_values"))
    if scope_type in {"all", "best_seller"}:
        scope_values = []

    return {
        "code": normalize_coupon_code(raw.get("code")),
        "percent": _clean_percent(raw.get("percent")),
        "active": bool(raw.get("active", True)),
        "deleted": bool(raw.get("deleted", False)),
        "scope_type": scope_type,
        "scope_values": scope_values,
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


def upsert_coupon(code: str, percent, active=True, scope_type="all", scope_values=None) -> dict:
    normalized_code = normalize_coupon_code(code)
    if not normalized_code:
        raise ValueError("El código del cupón es requerido")

    clean_percent = _clean_percent(percent)
    clean_scope_type = _normalize_scope_type(scope_type)
    clean_scope_values = _normalize_scope_values(scope_values)
    if clean_scope_type in {"brand", "category"} and not clean_scope_values:
        raise ValueError("Seleccioná al menos una marca o categoría para este cupón")
    if clean_scope_type in {"all", "best_seller"}:
        clean_scope_values = []

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
            "scope_type": clean_scope_type,
            "scope_values": clean_scope_values,
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
            "scope_type": clean_scope_type,
            "scope_values": clean_scope_values,
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


def _get_item_product(item: dict) -> Optional[Product]:
    product_id = item.get("product_id") or item.get("productId") or item.get("id")
    try:
        product_id = int(product_id)
    except (TypeError, ValueError):
        return None
    return Product.query.get(product_id)


def _item_matches_coupon_scope(item: dict, coupon: dict) -> bool:
    scope_type = coupon.get("scope_type") or "all"
    if scope_type == "all":
        return True

    if scope_type == "best_seller":
        raw_value = item.get("is_best_seller")
        if raw_value is not None:
            return bool(raw_value)
        product = _get_item_product(item)
        return bool(product.serialize().get("is_best_seller")) if product else False

    scope_values = {_normalize_scope_match_value(value) for value in coupon.get("scope_values") or []}
    scope_values.discard("")
    if not scope_values:
        return False

    product = None
    if scope_type == "brand":
        brand = str(item.get("brand") or item.get("product_brand") or item.get("marca") or "").strip()
        if not brand:
            product = _get_item_product(item)
            brand = str(product.brand if product else "").strip()
        return _normalize_scope_match_value(brand) in scope_values

    if scope_type == "category":
        scope_values = set()
        for value in coupon.get("scope_values") or []:
            scope_values.update(_category_match_keys(value))
        if not scope_values:
            return False

        raw_category_ids = item.get("category_ids")
        if raw_category_ids is None:
            raw_category_ids = []
        elif not isinstance(raw_category_ids, list):
            raw_category_ids = [raw_category_ids]

        raw_category_id = item.get("category_id")
        if raw_category_id not in (None, ""):
            raw_category_ids.append(raw_category_id)

        category_names = item.get("category_names")
        if category_names is None:
            category_names = []
        elif not isinstance(category_names, list):
            category_names = [category_names]

        category_name = item.get("category_name")
        if category_name not in (None, ""):
            category_names.append(category_name)

        if not raw_category_ids and not category_names:
            product = _get_item_product(item)
            if product:
                serialized = product.serialize()
                raw_category_ids = serialized.get("category_ids") or [serialized.get("category_id")]
                category_names = serialized.get("category_names") or [serialized.get("category_name")]

        item_values = set()
        for value in [*raw_category_ids, *category_names]:
            item_values.update(_category_match_keys(value))
        return bool(item_values & scope_values)

    return False


def _calculate_eligible_subtotal(items, coupon: dict, fallback_subtotal: float) -> float:
    if (coupon.get("scope_type") or "all") == "all":
        return fallback_subtotal
    if not isinstance(items, list):
        return 0

    eligible = 0.0
    for item in items:
        if not isinstance(item, dict) or not _item_matches_coupon_scope(item, coupon):
            continue
        try:
            qty = int(item.get("quantity", 1) or 1)
        except (TypeError, ValueError):
            qty = 1
        try:
            price = float(item.get("price") or 0)
        except (TypeError, ValueError):
            price = 0
        eligible += max(0, qty) * max(0, price)
    return max(0, eligible)


def calculate_discount(subtotal, code: str, items=None) -> Optional[dict]:
    coupon = find_active_coupon(code)
    if not coupon:
        return None

    try:
        base = float(subtotal or 0)
    except Exception:
        base = 0
    base = max(0, base)

    percent = _clean_percent(coupon.get("percent"))
    eligible_base = _calculate_eligible_subtotal(items, coupon, base)
    if eligible_base <= 0:
        return None

    discount = round(eligible_base * percent / 100)
    total = max(0, round(base - discount))

    return {
        "code": coupon["code"],
        "percent": percent,
        "subtotal": round(base),
        "eligible_subtotal": round(eligible_base),
        "discount": discount,
        "total": total,
        "scope_type": coupon.get("scope_type") or "all",
        "scope_values": coupon.get("scope_values") or [],
    }
