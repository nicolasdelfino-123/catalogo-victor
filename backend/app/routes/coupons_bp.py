from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.coupon_store import calculate_discount, delete_coupon, list_coupons, set_coupon_active, upsert_coupon
from app.models import User

coupons_bp = Blueprint("coupons", __name__)


def _admin_required():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return user and user.is_admin


@coupons_bp.route("/admin/coupons", methods=["GET"])
@jwt_required()
def admin_list_coupons():
    if not _admin_required():
        return jsonify({"error": "Acceso denegado"}), 403
    return jsonify(list_coupons()), 200


@coupons_bp.route("/admin/coupons", methods=["POST"])
@jwt_required()
def admin_upsert_coupon():
    if not _admin_required():
        return jsonify({"error": "Acceso denegado"}), 403

    data = request.get_json() or {}
    try:
        coupon = upsert_coupon(
            data.get("code"),
            data.get("percent"),
            data.get("active", True),
        )
        return jsonify({"coupon": coupon, "coupons": list_coupons()}), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"No se pudo guardar el cupón: {str(exc)}"}), 500


@coupons_bp.route("/admin/coupons/<path:code>", methods=["PATCH"])
@jwt_required()
def admin_toggle_coupon(code):
    if not _admin_required():
        return jsonify({"error": "Acceso denegado"}), 403

    data = request.get_json() or {}
    coupon = set_coupon_active(code, bool(data.get("active", False)))
    if not coupon:
        return jsonify({"error": "Cupón no encontrado"}), 404

    return jsonify({"coupon": coupon, "coupons": list_coupons()}), 200


@coupons_bp.route("/admin/coupons/<path:code>", methods=["DELETE"])
@jwt_required()
def admin_disable_coupon(code):
    if not _admin_required():
        return jsonify({"error": "Acceso denegado"}), 403

    coupon = delete_coupon(code)
    if not coupon:
        return jsonify({"error": "Cupón no encontrado"}), 404

    return jsonify({"coupon": coupon, "coupons": list_coupons()}), 200


@coupons_bp.route("/public/coupons/validate", methods=["POST"])
def public_validate_coupon():
    data = request.get_json() or {}
    result = calculate_discount(data.get("subtotal"), data.get("code"))
    if not result:
        return jsonify({"valid": False, "error": "Cupón inválido o inactivo"}), 404

    return jsonify({"valid": True, **result}), 200
