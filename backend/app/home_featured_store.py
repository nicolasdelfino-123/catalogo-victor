import json
import os

MAX_HOME_FEATURED = 12


def _storage_path():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_dir = os.path.join(root, "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "home_featured_ids.json")


def _normalize_ids(ids):
    normalized = []
    seen = set()
    for raw in ids or []:
        try:
            num = int(raw)
        except Exception:
            continue
        if num <= 0 or num in seen:
            continue
        seen.add(num)
        normalized.append(num)
        if len(normalized) >= MAX_HOME_FEATURED:
            break
    return normalized


def load_home_featured_ids():
    path = _storage_path()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return _normalize_ids(data if isinstance(data, list) else [])
    except Exception:
        return []


def save_home_featured_ids(ids):
    normalized = _normalize_ids(ids)
    path = _storage_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=True)
    return normalized


def set_home_featured_status(product_id, checked):
    ids = load_home_featured_ids()
    try:
        pid = int(product_id)
    except Exception:
        return ids
    if pid <= 0:
        return ids

    if bool(checked):
        if pid not in ids:
            if len(ids) >= MAX_HOME_FEATURED:
                raise ValueError("Solo podés seleccionar hasta 12 productos para Inicio")
            ids.append(pid)
    else:
        ids = [item for item in ids if item != pid]

    return save_home_featured_ids(ids)


def is_home_featured_product_id(product_id):
    try:
        pid = int(product_id)
    except Exception:
        return False
    if pid <= 0:
        return False
    return pid in set(load_home_featured_ids())
