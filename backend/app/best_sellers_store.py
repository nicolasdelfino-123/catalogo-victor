import json
import os


def _storage_path():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_dir = os.path.join(root, "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "best_seller_ids.json")


def _normalize_ids(ids):
    normalized = []
    seen = set()
    for raw in (ids or []):
        try:
            num = int(raw)
        except Exception:
            continue
        if num <= 0 or num in seen:
            continue
        seen.add(num)
        normalized.append(num)
    return normalized


def load_best_seller_ids():
    path = _storage_path()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return _normalize_ids(data if isinstance(data, list) else [])
    except Exception:
        return []


def save_best_seller_ids(ids):
    normalized = _normalize_ids(ids)
    path = _storage_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=True)
    return normalized


def set_best_seller_status(product_id, checked):
    ids = set(load_best_seller_ids())
    try:
        pid = int(product_id)
    except Exception:
        return sorted(ids)
    if pid <= 0:
        return sorted(ids)
    if bool(checked):
        ids.add(pid)
    else:
        ids.discard(pid)
    return save_best_seller_ids(sorted(ids))


def is_best_seller_product_id(product_id):
    try:
        pid = int(product_id)
    except Exception:
        return False
    if pid <= 0:
        return False
    return pid in set(load_best_seller_ids())
