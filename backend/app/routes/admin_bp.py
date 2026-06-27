"""
Panel de administración para gestionar productos
Este archivo contendrá las rutas administrativas para CRUD de productos
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Product, Category, User,ProductImage,now_cba_naive
from app.best_sellers_store import set_best_seller_status
from app.home_featured_store import load_home_featured_ids, set_home_featured_status
from flask import current_app, send_from_directory, url_for
from werkzeug.utils import secure_filename
from PIL import Image, ImageOps # pip install pillow
from flask import url_for
# backend/app/routes/admin_bp.py
from flask import Blueprint, request, jsonify, current_app, url_for
import os, io, hashlib, uuid
from app.models import Order, OrderItem  # asegurate que esté arriba también
from flask import redirect
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import text
import json




admin_bp = Blueprint('admin', __name__)
MULTI_CATEGORY_META_TYPE = "multi_category_meta"
ADMIN_HIDDEN_ORDER_KEY = "__admin_hidden"
ADMIN_HIDDEN_PRODUCT_KEY = "is_active_product"
ADMIN_SETTINGS_TABLE = "admin_settings"
PRICE_ADJUSTMENT_ROLLBACK_KEY = "price_adjustment_rollback"
PRICE_ADJUSTMENT_HISTORY_KEY = "price_adjustment_history"

# Catálogo de categorías esperado por el frontend actual.
# Mantener IDs estables evita romper FK y filtros ya existentes.
CATEGORY_ID_TO_NAME = {
    8: "Últimos Ingresos",
    1: "Fragancias Masculinas",
    2: "Fragancias Femeninas",
    3: "Fragancias Unisex",
    4: "Perfumes Árabes",
    5: "Perfumes de Diseñador",
    6: "Perfumes de Nicho",
    7: "Combos",
}

def _ensure_category_exists(category_id: int):
    category_id = int(category_id)
    category = Category.query.get(category_id)
    if category:
        return category

    # Si no existe el ID exacto, lo creamos con nombre estable para evitar FK errors.
    name = CATEGORY_ID_TO_NAME.get(category_id, f"Categoría {category_id}")
    by_name = Category.query.filter_by(name=name).first()
    if by_name:
        return by_name

    category = Category(
        id=category_id,
        name=name,
        description=f"Categoría auto-creada ({name})"
    )
    db.session.add(category)
    db.session.flush()
    return category


def _is_order_hidden_from_admin(order):
    return isinstance(order.billing_address, dict) and bool(order.billing_address.get(ADMIN_HIDDEN_ORDER_KEY))


def _visible_admin_orders_query():
    return Order.query.order_by(Order.created_at.desc())


def _serialize_admin_order(o):
    billing_address = dict(o.billing_address or {}) if isinstance(o.billing_address, dict) else o.billing_address
    if isinstance(billing_address, dict):
        billing_address.pop(ADMIN_HIDDEN_ORDER_KEY, None)

    return {
        "id": o.id,
        "status": o.status,
        "public_order_number": o.public_order_number,
        "total_amount": float(o.total_amount or 0),
        "coupon": billing_address.get("coupon") if isinstance(billing_address, dict) else None,
        "shipping_cost": float(o.shipping_cost or 0),
        "payment_method": o.payment_method,
        "payment_id": o.payment_id,
        "external_reference": o.external_reference,
        "customer_first_name": o.customer_first_name,
        "customer_last_name": o.customer_last_name,
        "customer_email": o.customer_email,
        "customer_phone": o.customer_phone,
        "customer_comment": o.customer_comment,
        "shipping_address": o.shipping_address,
        "billing_address": billing_address,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "order_items": [item.serialize() for item in o.order_items],
        "customer_dni": o.customer_dni,
        "customer_postal_code": (
            o.shipping_address.get("postalCode") if isinstance(o.shipping_address, dict) else None
        ),
    }


def _with_home_featured_flags(serialized_products):
    ids = load_home_featured_ids()
    positions = {product_id: index for index, product_id in enumerate(ids)}
    for item in serialized_products:
        try:
            product_id = int(item.get("id"))
        except Exception:
            product_id = 0
        item["is_home_featured"] = product_id in positions
        item["home_featured_position"] = positions.get(product_id)
    return serialized_products

# === Helpers de sabores/stock por sabor ===
def _normalize_catalog(catalog):
    norm = []
    for x in (catalog or []):
        if isinstance(x, dict):
            if x.get('__type') == MULTI_CATEGORY_META_TYPE:
                continue
            name = str(x.get('name','')).strip()
            active = bool(x.get('active', True))
            try:
                stock = int(x.get('stock', 0))
            except Exception:
                stock = 0
        else:
            # por si llega string suelto
            name, active, stock = str(x).strip(), True, 0
        if not name:
            continue
        norm.append({'name': name, 'active': active, 'stock': max(stock, 0)})
    return norm


def _normalize_category_ids(raw_ids, fallback_category_id=None):
    normalized = []

    if isinstance(raw_ids, (list, tuple, set)):
        source = list(raw_ids)
    elif raw_ids in (None, ""):
        source = []
    else:
        source = [raw_ids]

    if fallback_category_id not in (None, ""):
        source.insert(0, fallback_category_id)

    for raw_id in source:
        try:
            category_id = int(raw_id)
        except Exception:
            continue
        if category_id <= 0 or category_id in normalized:
            continue
        safe_category = _ensure_category_exists(category_id)
        normalized.append(int(safe_category.id))

    return normalized


def _extract_multi_category_ids_from_catalog(catalog, fallback_category_id=None):
    category_ids = []
    for item in (catalog or []):
        if not isinstance(item, dict):
            continue
        if item.get('__type') != MULTI_CATEGORY_META_TYPE:
            continue
        for raw_id in (item.get('category_ids') or []):
            try:
                category_id = int(raw_id)
            except Exception:
                continue
            if category_id > 0 and category_id not in category_ids:
                category_ids.append(category_id)

    if fallback_category_id not in (None, ""):
        try:
            fallback_id = int(fallback_category_id)
        except Exception:
            fallback_id = None
        if fallback_id and fallback_id not in category_ids:
            category_ids.insert(0, fallback_id)

    return category_ids


def _merge_catalog_with_multi_category_meta(catalog, category_ids):
    visible_catalog = _normalize_catalog(catalog)
    normalized_category_ids = _normalize_category_ids(category_ids)
    if not normalized_category_ids:
        return visible_catalog
    return visible_catalog + [{
        '__type': MULTI_CATEGORY_META_TYPE,
        'category_ids': normalized_category_ids,
    }]


def _is_product_hidden_from_admin(product):
    return any(
        isinstance(item, dict)
        and item.get('__type') == MULTI_CATEGORY_META_TYPE
        and item.get(ADMIN_HIDDEN_PRODUCT_KEY) is False
        for item in (product.flavor_catalog or [])
    )


def _catalog_with_product_hidden_marker(catalog):
    rows = [dict(item) if isinstance(item, dict) else item for item in (catalog or [])]
    for item in rows:
        if isinstance(item, dict) and item.get('__type') == MULTI_CATEGORY_META_TYPE:
            item[ADMIN_HIDDEN_PRODUCT_KEY] = False
            return rows
    return rows + [{'__type': MULTI_CATEGORY_META_TYPE, ADMIN_HIDDEN_PRODUCT_KEY: False}]

def _sum_active_stock(catalog):
    return sum(int(f.get('stock', 0)) for f in (catalog or []) if f.get('active'))

def _normalize_volume_options(rows):
    normalized = []
    for row in (rows or []):
        if not isinstance(row, dict):
            continue

        try:
            ml = int(float(row.get('ml')))
        except Exception:
            continue
        if ml <= 0:
            continue

        price = None
        raw_price = row.get('price')
        if raw_price not in ("", None):
            try:
                val = float(raw_price)
                price = val if val > 0 else None
            except Exception:
                price = None

        price_wholesale = None
        raw_wh = row.get('price_wholesale')
        if raw_wh not in ("", None):
            try:
                val = float(raw_wh)
                price_wholesale = val if val > 0 else None
            except Exception:
                price_wholesale = None

        stock = 0
        raw_stock = row.get('stock')
        if raw_stock not in ("", None):
            try:
                stock = max(0, int(float(raw_stock)))
            except Exception:
                stock = 0

        normalized.append({
            'ml': ml,
            'price': price,
            'price_wholesale': price_wholesale,
            'stock': stock,
        })

    # evita duplicados por ml (último valor gana)
    by_ml = {}
    for item in normalized:
        by_ml[item['ml']] = item
    return [by_ml[k] for k in sorted(by_ml.keys())]

def _sum_volume_stock(rows):
    return sum(max(0, int(x.get('stock', 0) or 0)) for x in (rows or []))


def _ensure_admin_settings_table():
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS admin_settings (
            "key" VARCHAR(120) PRIMARY KEY,
            value TEXT NOT NULL
        )
    """))


def _get_admin_setting(key, default=None):
    _ensure_admin_settings_table()
    row = db.session.execute(
        text('SELECT value FROM admin_settings WHERE "key" = :key'),
        {"key": key},
    ).fetchone()
    if not row:
        return default
    try:
        return json.loads(row[0])
    except Exception:
        return default


def _set_admin_setting(key, value):
    _ensure_admin_settings_table()
    serialized = json.dumps(value, ensure_ascii=False)
    dialect_name = db.session.bind.dialect.name if db.session.bind else ""
    if dialect_name == "postgresql":
        db.session.execute(
            text("""
                INSERT INTO admin_settings ("key", value)
                VALUES (:key, :value)
                ON CONFLICT ("key") DO UPDATE SET value = EXCLUDED.value
            """),
            {"key": key, "value": serialized},
        )
        return

    existing = db.session.execute(
        text('SELECT 1 FROM admin_settings WHERE "key" = :key'),
        {"key": key},
    ).fetchone()
    if existing:
        db.session.execute(
            text('UPDATE admin_settings SET value = :value WHERE "key" = :key'),
            {"key": key, "value": serialized},
        )
        return

    db.session.execute(
        text('INSERT INTO admin_settings ("key", value) VALUES (:key, :value)'),
        {"key": key, "value": serialized},
    )


def _delete_admin_setting(key):
    _ensure_admin_settings_table()
    db.session.execute(
        text('DELETE FROM admin_settings WHERE "key" = :key'),
        {"key": key},
    )


def _product_category_ids(product):
    return _extract_multi_category_ids_from_catalog(product.flavor_catalog, product.category_id)


def _round_price_without_cents(value, factor):
    try:
        parsed = float(value)
    except Exception:
        return value
    if parsed <= 0:
        return parsed
    return float(round(parsed * factor))


def _adjust_volume_prices_by_scope(volume_options, factor, price_scope):
    adjusted = []
    changed = False
    for row in (volume_options or []):
        if not isinstance(row, dict):
            continue
        next_row = dict(row)
        if price_scope in ("both", "retail") and next_row.get("price") not in ("", None):
            next_row["price"] = _round_price_without_cents(next_row.get("price"), factor)
            changed = True
        if price_scope in ("both", "wholesale") and next_row.get("price_wholesale") not in ("", None):
            next_row["price_wholesale"] = _round_price_without_cents(next_row.get("price_wholesale"), factor)
            changed = True
        adjusted.append(next_row)
    return adjusted, changed


def _price_scope_label(price_scope):
    if price_scope == "retail":
        return "solo minorista"
    if price_scope == "wholesale":
        return "solo mayorista"
    return "minorista y mayorista"


def _serialize_price_adjustment(setting):
    if not isinstance(setting, dict):
        return None
    target_type = setting.get("target_type")
    category_label = setting.get("category_label") or ""
    brand = setting.get("brand") or ""
    return {
        "id": setting.get("id"),
        "target_type": target_type,
        "target_label": brand if target_type == "brand" else category_label,
        "category_ids": setting.get("category_ids") or [],
        "category_label": category_label,
        "brand": brand,
        "price_scope": setting.get("price_scope") or "both",
        "price_scope_label": _price_scope_label(setting.get("price_scope") or "both"),
        "percent": setting.get("percent"),
        "affected_count": setting.get("affected_count") or 0,
        "created_at": setting.get("created_at"),
    }


def _get_price_adjustment_history():
    history = _get_admin_setting(PRICE_ADJUSTMENT_HISTORY_KEY, [])
    return history if isinstance(history, list) else []


def _set_price_adjustment_history(history):
    _set_admin_setting(PRICE_ADJUSTMENT_HISTORY_KEY, history[:50])


def _public_price_adjustment_record(record):
    public = _serialize_price_adjustment(record)
    if not public:
        return None
    public["status"] = record.get("status") or "confirmed"
    return public


def _serialize_price_adjustment_history():
    return [
        item
        for item in (_public_price_adjustment_record(record) for record in _get_price_adjustment_history())
        if item
    ]


def _restore_price_adjustment_record(record):
    restored_count = 0
    for snapshot in (record.get("snapshots") or []):
        product_id = snapshot.get("id")
        if not product_id:
            continue
        product = Product.query.get(product_id)
        if not product:
            continue
        if "price" in snapshot:
            product.price = float(snapshot.get("price") or 0)
        if "price_wholesale" in snapshot:
            raw_wholesale = snapshot.get("price_wholesale")
            product.price_wholesale = float(raw_wholesale) if raw_wholesale not in ("", None) else None
        if "volume_options" in snapshot:
            product.volume_options = _normalize_volume_options(snapshot.get("volume_options") or [])
            flag_modified(product, "volume_options")
        db.session.add(product)
        restored_count += 1
    return restored_count

# Middleware para verificar que el usuario sea admin
def admin_required():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return user and user.is_admin

# =======================
#       PRODUCTOS
# =======================

@admin_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403
    try:
        data = request.get_json() or {}

        # stock puede venir calculado si flavor_stock_mode = true
        required = ['name', 'price', 'category_id']
        for r in required:
            if r not in data:
                return jsonify({'error': f'Falta el campo requerido: {r}'}), 400

        # ===== precio mayorista opcional =====
        price_wholesale = None
        if data.get('price_wholesale') not in ("", None):
            try:
                price_wholesale = float(data['price_wholesale'])
            except:
                price_wholesale = None

        requested_category_ids = _normalize_category_ids(
            data.get('category_ids'),
            data.get('category_id'),
        )
        if not requested_category_ids:
            return jsonify({'error': 'Falta al menos una categoría válida'}), 400

        # ===== soporte de stock por sabor =====
        catalog = _normalize_catalog(data.get('flavor_catalog'))
        flavor_stock_mode = bool(data.get('flavor_stock_mode', False))
        flavor_enabled = bool(data.get('flavor_enabled', False))
        active_flavors = [f['name'] for f in catalog if f.get('active')] if catalog else (data.get('flavors') or [])

        volume_ml = None
        if data.get('volume_ml') not in ("", None):
            try:
                volume_ml = max(0, int(float(data.get('volume_ml'))))
            except Exception:
                volume_ml = None
        volume_options = _normalize_volume_options(data.get('volume_options'))

        # stock total coherente
        if flavor_stock_mode:
            computed_stock = _sum_active_stock(catalog)
        elif len(volume_options) > 0:
            computed_stock = _sum_volume_stock(volume_options)
        else:
            try:
                computed_stock = int(data.get('stock', 0))
            except Exception:
                computed_stock = 0

        safe_category = _ensure_category_exists(int(requested_category_ids[0]))

        product = Product(
            name=data['name'],
            description=data.get('description', ''),
            short_description=data.get('short_description', ''),
            price=float(data['price']),
            price_wholesale=price_wholesale,   # ✅ AHORA SE GUARDA
            stock=computed_stock,
            category_id=safe_category.id,
            image_url=data.get('image_url', ''),
            brand=data.get('brand', ''),
            is_active=bool(data.get('is_active', True)),

            # sabores visibles (strings)
            flavors=active_flavors,
            flavor_enabled=flavor_enabled,

            # catálogo completo + modo
            flavor_catalog=_merge_catalog_with_multi_category_meta(catalog, requested_category_ids),
            flavor_stock_mode=flavor_stock_mode,

            # puffs opcional (no molesta si queda)
            puffs=(int(data['puffs']) if str(data.get('puffs','')).strip().isdigit() else None),
            volume_ml=volume_ml,
            volume_options=volume_options,

            created_at=now_cba_naive(),
        )
        db.session.add(product)
        db.session.flush()
        if 'is_home_featured' in data:
            try:
                set_home_featured_status(product.id, bool(data.get('is_home_featured')))
            except ValueError as exc:
                db.session.rollback()
                return jsonify({'error': str(exc)}), 400
        if 'is_best_seller' in data:
            set_best_seller_status(product.id, bool(data.get('is_best_seller')))
        db.session.commit()
        return jsonify({'message': 'Producto creado exitosamente', 'product': product.serialize()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al crear producto: {str(e)}'}), 500


@admin_bp.route('/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403
    try:
        data = request.get_json() or {}
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Producto no encontrado'}), 404

        current_category_ids = _extract_multi_category_ids_from_catalog(
            product.flavor_catalog,
            product.category_id,
        )

        # Actualizaciones parciales de campos de texto simples
        for field in ['name', 'description', 'short_description', 'brand', 'image_url']:
            if field in data:
                setattr(product, field, data[field] or '')

        # numéricos / flags base
      

        if 'price' in data:
            product.price = float(data['price'])

        # ✅ guardar precio mayorista
        if 'price_wholesale' in data:
            try:
                product.price_wholesale = float(data['price_wholesale']) if data['price_wholesale'] not in ("", None) else None
            except:
                product.price_wholesale = None

        next_category_ids = None
        if 'category_ids' in data or 'category_id' in data:
            next_category_ids = _normalize_category_ids(
                data.get('category_ids'),
                data.get('category_id', product.category_id),
            )
            if not next_category_ids:
                return jsonify({'error': 'Debe quedar al menos una categoría válida'}), 400
            safe_category = _ensure_category_exists(int(next_category_ids[0]))
            product.category_id = safe_category.id
        if 'is_active' in data:
            product.is_active = bool(data['is_active'])
        if 'is_best_seller' in data:
            set_best_seller_status(product.id, bool(data.get('is_best_seller')))
        if 'is_home_featured' in data:
            try:
                set_home_featured_status(product.id, bool(data.get('is_home_featured')))
            except ValueError as exc:
                return jsonify({'error': str(exc)}), 400
            # 👇 NUEVO: puffs (caladas)
        if 'puffs' in data:
            v = str(data.get('puffs','')).strip()
            product.puffs = int(v) if v.isdigit() else None
        if 'volume_ml' in data:
            try:
                raw = data.get('volume_ml')
                product.volume_ml = None if raw in ("", None) else max(0, int(float(raw)))
            except Exception:
                product.volume_ml = None
        volume_options_updated = False
        if 'volume_options' in data:
            product.volume_options = _normalize_volume_options(data.get('volume_options'))
            volume_options_updated = True
        # 🔥 AGREGAR ESTO
        if volume_options_updated and product.volume_options and len(product.volume_options) > 0:
            first = product.volume_options[0]
            if first.get('price') is not None:
                product.price = float(first.get('price'))
            if first.get('price_wholesale') is not None:
                product.price_wholesale = float(first.get('price_wholesale'))


        # ===== NUEVO: catálogo y modo =====
        if ('flavor_catalog' in data) or ('flavor_stock_mode' in data) or ('flavor_enabled' in data) or ('flavors' in data):
            catalog = _normalize_catalog(data.get('flavor_catalog') if 'flavor_catalog' in data else product.flavor_catalog)
            effective_category_ids = next_category_ids or current_category_ids or [product.category_id]
            product.flavor_catalog = _merge_catalog_with_multi_category_meta(catalog, effective_category_ids)
            flag_modified(product, "flavor_catalog")

            if 'flavor_stock_mode' in data:
                product.flavor_stock_mode = bool(data['flavor_stock_mode'])

            if 'flavor_enabled' in data:
                product.flavor_enabled = bool(data['flavor_enabled'])

            # flavors visibles = nombres de los activos del catálogo (si hay), sino respeta 'flavors'
            if catalog:
                product.flavors = [f['name'] for f in catalog if f.get('active')]
            elif 'flavors' in data:
                product.flavors = data.get('flavors', []) or []

            # stock total coherente
            if product.flavor_stock_mode:
                product.stock = _sum_active_stock(catalog)
            elif 'stock' in data:
                try:
                    product.stock = int(data['stock'])
                except Exception:
                    product.stock = 0
            elif volume_options_updated:
                product.stock = _sum_volume_stock(product.volume_options or [])
        else:
            if next_category_ids is not None:
                visible_catalog = _normalize_catalog(product.flavor_catalog)
                product.flavor_catalog = _merge_catalog_with_multi_category_meta(visible_catalog, next_category_ids)
                flag_modified(product, "flavor_catalog")
            # sin cambios de catálogo: respetar 'stock' si vino
            if 'stock' in data:
                try:
                    product.stock = int(data['stock'])
                except Exception:
                    product.stock = 0
            elif volume_options_updated and not product.flavor_stock_mode:
                product.stock = _sum_volume_stock(product.volume_options or [])
        db.session.add(product)
        product.created_at = now_cba_naive()
        db.session.commit()
        return jsonify({'message': 'Producto actualizado exitosamente', 'product': product.serialize()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al actualizar producto: {str(e)}'}), 500


@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403
    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Producto no encontrado'}), 404

        product.flavor_catalog = _catalog_with_product_hidden_marker(product.flavor_catalog)
        flag_modified(product, "flavor_catalog")
        set_home_featured_status(product_id, False)

        db.session.commit()
        return jsonify({'message': 'Producto ocultado', 'product_id': product_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al eliminar producto: {str(e)}'}), 500



@admin_bp.route('/products', methods=['GET'])
@jwt_required()
def get_all_products_admin():
    """Obtener todos los productos (incluyendo inactivos) para admin"""
    if not admin_required():
        return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador.'}), 403
    
    try:
        products = [product for product in Product.query.all() if not _is_product_hidden_from_admin(product)]
        return jsonify(_with_home_featured_flags([product.serialize() for product in products])), 200
        
    except Exception as e:
        return jsonify({'error': f'Error al obtener productos: {str(e)}'}), 500


# =======================
#   AJUSTE MASIVO PRECIOS
# =======================

@admin_bp.route('/price-adjustment', methods=['GET'])
@jwt_required()
def get_price_adjustment():
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403
    try:
        pending = _get_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY)
        return jsonify({
            "pending": bool(pending),
            "adjustment": _serialize_price_adjustment(pending) if pending else None,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error al obtener ajuste de precios: {str(e)}'}), 500


@admin_bp.route('/price-adjustment/history', methods=['GET'])
@jwt_required()
def get_price_adjustment_history():
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403
    try:
        return jsonify({"history": _serialize_price_adjustment_history()}), 200
    except Exception as e:
        return jsonify({'error': f'Error al obtener historial de precios: {str(e)}'}), 500


@admin_bp.route('/price-adjustment/apply', methods=['POST'])
@jwt_required()
def apply_price_adjustment():
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403

    try:
        if _get_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY):
            return jsonify({'error': 'Ya hay un ajuste pendiente. Confirmalo o deshacelo antes de aplicar otro.'}), 400

        data = request.get_json() or {}
        target_type = (data.get("target_type") or "").strip().lower()
        price_scope = (data.get("price_scope") or "both").strip().lower()

        try:
            percent = float(data.get("percent"))
        except Exception:
            percent = 0

        if percent == 0 or percent <= -100 or percent > 1000:
            return jsonify({'error': 'El porcentaje debe ser distinto de 0, mayor a -100 y menor o igual a 1000.'}), 400
        if target_type not in ("category", "brand"):
            return jsonify({'error': 'El destino debe ser categoría o marca.'}), 400
        if price_scope not in ("both", "retail", "wholesale"):
            return jsonify({'error': 'El alcance de precios es inválido.'}), 400

        products = []
        category_ids = []
        category_label = ""
        brand = ""

        if target_type == "brand":
            brand = str(data.get("brand") or "").strip()
            if not brand:
                return jsonify({'error': 'Falta la marca.'}), 400
            products = Product.query.filter(Product.brand == brand).all()
        else:
            category_ids = _normalize_category_ids(data.get("category_ids") or [])
            category_label = str(data.get("category_label") or "").strip()
            if not category_ids:
                return jsonify({'error': 'Falta al menos una categoría válida.'}), 400
            category_id_set = set(category_ids)
            products = [
                product
                for product in Product.query.all()
                if category_id_set.intersection(_product_category_ids(product))
            ]

        products = [product for product in products if not _is_product_hidden_from_admin(product)]
        if not products:
            return jsonify({'error': 'No hay productos para ajustar con esa selección.'}), 400

        factor = 1 + (percent / 100)
        snapshots = []

        for product in products:
            snapshots.append({
                "id": product.id,
                "price": float(product.price or 0),
                "price_wholesale": float(product.price_wholesale) if product.price_wholesale is not None else None,
                "volume_options": json.loads(json.dumps(product.volume_options or [], ensure_ascii=False)),
            })

            if price_scope in ("both", "retail"):
                product.price = _round_price_without_cents(product.price, factor)
            if price_scope in ("both", "wholesale") and product.price_wholesale is not None:
                product.price_wholesale = _round_price_without_cents(product.price_wholesale, factor)

            next_volume_options, volume_changed = _adjust_volume_prices_by_scope(
                product.volume_options or [],
                factor,
                price_scope,
            )
            if volume_changed:
                product.volume_options = _normalize_volume_options(next_volume_options)
                flag_modified(product, "volume_options")

            db.session.add(product)

        now = now_cba_naive()
        adjustment = {
            "id": uuid.uuid4().hex,
            "target_type": target_type,
            "category_ids": category_ids,
            "category_label": category_label,
            "brand": brand,
            "price_scope": price_scope,
            "percent": percent,
            "affected_count": len(products),
            "created_at": now.isoformat(),
            "status": "pending",
            "snapshots": snapshots,
        }

        _set_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY, adjustment)
        history = _get_price_adjustment_history()
        history.insert(0, adjustment)
        _set_price_adjustment_history(history)

        db.session.commit()
        return jsonify({
            "adjustment": _serialize_price_adjustment(adjustment),
            "history": _serialize_price_adjustment_history(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al aplicar ajuste de precios: {str(e)}'}), 500


@admin_bp.route('/price-adjustment/confirm', methods=['POST'])
@jwt_required()
def confirm_price_adjustment():
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403

    try:
        pending = _get_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY)
        if not pending:
            return jsonify({'error': 'No hay un ajuste pendiente para confirmar.'}), 400

        history = _get_price_adjustment_history()
        for item in history:
            if item.get("id") == pending.get("id"):
                item["status"] = "confirmed"
                break
        _set_price_adjustment_history(history)
        _delete_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY)
        db.session.commit()
        return jsonify({"history": _serialize_price_adjustment_history()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al confirmar ajuste de precios: {str(e)}'}), 500


@admin_bp.route('/price-adjustment/undo', methods=['POST'])
@jwt_required()
def undo_price_adjustment():
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403

    try:
        data = request.get_json() or {}
        requested_id = data.get("id")
        pending = _get_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY)
        history = _get_price_adjustment_history()

        record = None
        if requested_id:
            record = next((item for item in history if item.get("id") == requested_id), None)
        else:
            record = pending

        if not record:
            return jsonify({'error': 'No se encontró el ajuste para deshacer.'}), 404
        if record.get("status") == "undone":
            return jsonify({'error': 'Ese ajuste ya fue deshecho.'}), 400

        _restore_price_adjustment_record(record)

        for item in history:
            if item.get("id") == record.get("id"):
                item["status"] = "undone"
                break

        if pending and pending.get("id") == record.get("id"):
            _delete_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY)

        _set_price_adjustment_history(history)
        db.session.commit()
        return jsonify({"history": _serialize_price_adjustment_history()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al deshacer ajuste de precios: {str(e)}'}), 500


@admin_bp.route('/price-adjustment/history/<adjustment_id>', methods=['DELETE'])
@jwt_required()
def delete_price_adjustment_history_item(adjustment_id):
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403

    try:
        pending = _get_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY)
        if pending and pending.get("id") == adjustment_id:
            _delete_admin_setting(PRICE_ADJUSTMENT_ROLLBACK_KEY)

        history = [
            item
            for item in _get_price_adjustment_history()
            if item.get("id") != adjustment_id
        ]
        _set_price_adjustment_history(history)
        db.session.commit()
        return jsonify({"history": _serialize_price_adjustment_history()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al eliminar historial de precios: {str(e)}'}), 500


# =======================
#       CATEGORÍAS
# =======================

@admin_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Crear una nueva categoría (solo admin)"""
    if not admin_required():
        return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador.'}), 403
    
    try:
        data = request.get_json() or {}
        
        if 'name' not in data:
            return jsonify({'error': 'Campo requerido: name'}), 400
        
        category = Category(
            name=data['name'],
            description=data.get('description', '')
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'message': 'Categoría creada exitosamente',
            'category': category.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al crear categoría: {str(e)}'}), 500




@admin_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_image():
    """
    Sube una imagen desde Admin, la optimiza y la guarda en la BD (ProductImage).
    Devuelve la URL interna: /public/img/<id>
    Campos aceptados (form-data):
      - image: archivo
      - product_id (opcional): int para asociar al producto
      - format (opcional): 'webp' | 'jpeg' (default: webp)
      - max_size (opcional): lado mayor, int (default: 1600)
    """
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403

    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'Falta el archivo "image"'}), 400

    # Parámetros opcionales
    target_format = (request.form.get('format') or 'webp').lower()
    max_size = int(request.form.get('max_size') or 1600)
    product_id = request.form.get('product_id')
    product_id = int(product_id) if product_id and product_id.isdigit() else None

    # Leer bytes originales (para digest/ETag)
    original_bytes = file.read()
    if not original_bytes:
        return jsonify({'error': 'Archivo vacío'}), 400

    # Abrir con Pillow y normalizar orientación
    try:
        img = Image.open(io.BytesIO(original_bytes))
        img = ImageOps.exif_transpose(img)
        # Convertimos a RGB para evitar problemas de modo (p.ej. PNG con alpha → lo podés mantener si querés)
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGB')
    except Exception as e:
        return jsonify({'error': f'No se pudo leer la imagen: {str(e)}'}), 400

    # Resize "thumbnail" mantiene aspect ratio
    img.thumbnail((max_size, max_size))

    # Serializar optimizada a bytes en memoria
    out = io.BytesIO()
    if target_format == 'jpeg':
        # JPEG progresivo
        img = img.convert('RGB')
        img.save(out, format='JPEG', quality=82, optimize=True, progressive=True)
        mime = 'image/jpeg'
    else:
        # WEBP (recomendado: más liviano, soporte general actual)
        # Si hay alpha y querés preservarla:
        if img.mode == 'RGBA':
            img.save(out, format='WEBP', quality=80, method=6, lossless=False)
        else:
            img.save(out, format='WEBP', quality=80, method=6)
        mime = 'image/webp'

    optimized_bytes = out.getvalue()
    width, height = img.size

    # Digest para ETag/caché y deduplicación opcional
    digest = hashlib.sha256(optimized_bytes).hexdigest()

    # Guardar en BD
    db_image = ProductImage(
        product_id=product_id,
        mime_type=mime,
        bytes=optimized_bytes,
        width=width,
        height=height,
        digest=digest,
        created_at=now_cba_naive(),
    )
    db.session.add(db_image)
    db.session.commit()

    # URL interna que sirve desde la BD
    img_url = url_for('public.serve_image', image_id=db_image.id)

# Si vino product_id, asociamos la imagen y, SOLO si no hay principal o si el admin lo pide,
# la dejamos como principal (no pisamos siempre).
    if product_id:
        product = Product.query.get(product_id)
        if product:
            set_as_main = (request.form.get('as_main') in ('1', 'true', 'yes')) or not product.image_url
            if set_as_main:
                product.image_url = img_url
            db.session.commit()

    return jsonify({'url': img_url, 'image_id': db_image.id}), 201


# --- NUEVO: asociar imágenes huérfanas a un producto ---
@admin_bp.route('/products/<int:product_id>/attach-images', methods=['POST'])
@jwt_required()
def attach_images(product_id):
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403

    data = request.get_json() or {}
    image_ids = data.get('image_ids') or []
    main_id = data.get('main_id')  # opcional: id de la imagen principal

    if not isinstance(image_ids, list):
        return jsonify({'error': 'image_ids debe ser lista de enteros'}), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Producto no encontrado'}), 404

    # Buscar y asociar
    imgs = ProductImage.query.filter(ProductImage.id.in_(image_ids)).all()
    for im in imgs:
        im.product_id = product_id
    db.session.commit()

    # Si mandaste main_id, setear imagen principal (sin pisar si ya hay una a menos que la pidas)
    if main_id:
        try:
            main_id = int(main_id)
            # armamos la misma URL que devolvés al subir (/public/img/<id>)
            product.image_url = f"/public/img/{main_id}"
            db.session.commit()
        except Exception:
            db.session.rollback()

    return jsonify({
        'message': f'{len(imgs)} imágenes asociadas al producto {product_id}.',
        'attached_ids': [im.id for im in imgs],
        'product_id': product_id
    }), 200


# --- NUEVO: eliminar imagen por ID ---
@admin_bp.route('/images/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(image_id):
    if not admin_required():
        return jsonify({'error': 'Acceso denegado.'}), 403

    img = ProductImage.query.get(image_id)
    if not img:
        return jsonify({'error': 'Imagen no encontrada'}), 404

    # Guardamos el product_id antes de borrar para poder ajustar principal
    pid = img.product_id

    db.session.delete(img)
    db.session.commit()

    # Si estaba asociada a un producto y la principal del producto apuntaba a esta imagen,
    # reasignar principal a otra imagen del mismo producto (si existe), o dejar None.
    if pid:
        product = Product.query.get(pid)
        if product:
            # ¿La principal apuntaba a /public/img/<image_id>?
            current = (product.image_url or '').strip()
            is_same = current.endswith(f"/public/img/{image_id}") or current == f"/public/img/{image_id}"
            if is_same:
                # Buscar otra imagen del producto
                next_img = ProductImage.query.filter_by(product_id=pid).order_by(ProductImage.id.asc()).first()
                product.image_url = f"/public/img/{next_img.id}" if next_img else None
                db.session.commit()

    return jsonify({'message': f'Imagen {image_id} eliminada'}), 200


# =======================
#        PEDIDOS (ADMIN)
# =======================



@admin_bp.route("/orders", methods=["GET"])
@jwt_required()
def admin_get_orders():
    """Obtener todos los pedidos (para el panel de administración)."""
    if not admin_required():
        return jsonify({"error": "Acceso denegado. Se requieren permisos de administrador."}), 403

    try:
        orders = [o for o in _visible_admin_orders_query().all() if not _is_order_hidden_from_admin(o)]
        serialized = [_serialize_admin_order(o) for o in orders]

        return jsonify(serialized), 200

    except Exception as e:
        return jsonify({"error": f"Error al obtener pedidos: {str(e)}"}), 500


@admin_bp.route("/orders/<int:order_id>", methods=["DELETE"])
@jwt_required()
def admin_hide_order(order_id):
    """Oculta un pedido del panel admin sin borrarlo de la base de datos."""
    if not admin_required():
        return jsonify({"error": "Acceso denegado"}), 403

    try:
        order = Order.query.get(order_id)
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404

        billing_address = order.billing_address if isinstance(order.billing_address, dict) else {}
        order.billing_address = {**billing_address, ADMIN_HIDDEN_ORDER_KEY: True}
        order.updated_at = now_cba_naive()
        flag_modified(order, "billing_address")
        db.session.commit()

        return jsonify({
            "message": f"Pedido #{order.public_order_number or order.id} ocultado del panel admin",
            "order_id": order_id,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al ocultar pedido: {str(e)}"}), 500



@admin_bp.route("/orders/<int:order_id>/status", methods=["PUT"])
@jwt_required()
def admin_update_order_status(order_id):
    if not admin_required():
        return jsonify({"error": "Acceso denegado"}), 403

    try:
        data = request.get_json() or {}
        new_status = (data.get("status") or "").strip().lower()
        tracking_code = (data.get("tracking_code") or "").strip()

        valid_statuses = ["pending", "pagado", "enviado", "cancelado"]
        if new_status not in valid_statuses:
            return jsonify({"error": f"Estado inválido"}), 400

        order = Order.query.get(order_id)
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404

        order.status = new_status
        if tracking_code:
            order.tracking_code = tracking_code
        order.updated_at = now_cba_naive()
        db.session.commit()

        # ✅ Enviar mail si se marca como enviado
        if new_status == "enviado" and order.customer_email:
            from flask_mail import Message
            from app import mail

            # Construir el cuerpo del mensaje según haya código o no
            if tracking_code:
                tracking_line = f"El código de seguimiento es: {tracking_code}.\n\n"
            else:
                tracking_line = ""

            msg = Message(
                subject="Tu pedido está en camino 🚚",
                recipients=[order.customer_email],
                body=(
                    f"Hola {order.customer_first_name or ''},\n\n"
                    f"Tu pedido #{order.public_order_number or order.id} fue enviado.\n"
                    f"{tracking_line}"
                    "¡Gracias por tu compra!\nZarpados."
                ),
            )

            mail.send(msg)

        return jsonify({
           "message": f"Pedido #{order.public_order_number or order.id} actualizado a '{new_status}'",
            "order": order.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
# Alias temporal para compatibilidad con /admin/pedidos
from flask import redirect

# Alias temporal para compatibilidad con /admin/pedidos
@admin_bp.route("/pedidos", methods=["GET"])
@jwt_required()
def alias_pedidos():
    if not admin_required():
        return jsonify({"error": "Acceso denegado"}), 403
    try:
        orders = [o for o in _visible_admin_orders_query().all() if not _is_order_hidden_from_admin(o)]
        serialized = [_serialize_admin_order(o) for o in orders]
        return jsonify(serialized), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener pedidos: {str(e)}"}), 500
