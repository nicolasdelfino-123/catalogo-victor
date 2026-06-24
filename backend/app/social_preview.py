import os
import re
from urllib.parse import urljoin

from flask import Response, current_app, render_template_string, request, send_from_directory

from app.models import Product, ProductImage


CRAWLER_USER_AGENTS = (
    "whatsapp",
    "facebookexternalhit",
    "facebot",
    "telegrambot",
    "twitterbot",
    "linkedinbot",
    "slackbot",
    "discordbot",
    "pinterest",
    "skypeuripreview",
    "vkshare",
    "embedly",
    "quora link preview",
)


def is_social_crawler() -> bool:
    user_agent = (request.headers.get("User-Agent") or "").lower()
    return any(bot in user_agent for bot in CRAWLER_USER_AGENTS)


def _site_root() -> str:
    configured = (
        os.getenv("SITE_URL")
        or os.getenv("PUBLIC_SITE_URL")
        or os.getenv("FRONTEND_URL")
        or os.getenv("VITE_PUBLIC_SITE_URL")
        or ""
    ).strip()
    root = configured or request.url_root
    return root.rstrip("/") + "/"


def _strip_html(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()


def _absolute_url(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if value.startswith("//"):
        return f"https:{value}"
    if re.match(r"^https?://", value, re.IGNORECASE):
        return value

    if value.startswith("/admin/uploads/"):
        value = value.replace("/admin", "/public", 1)
    elif value.startswith("/uploads/"):
        value = f"/public{value}"

    return urljoin(_site_root(), value.lstrip("/"))


def _product_image_url(product: Product) -> str:
    if product.image_url:
        return _absolute_url(product.image_url)

    image = (
        ProductImage.query.filter_by(product_id=product.id)
        .order_by(ProductImage.id.asc())
        .first()
    )
    if image:
        return _absolute_url(f"/public/img/{image.id}")

    return _absolute_url("/logo_victor_si.png")


def _product_description(product: Product) -> str:
    description = _strip_html(product.short_description or product.description or "")
    if description:
        return description[:220]
    return product.brand or "VJ Parfum & Decants"


def _is_product_hidden(product: Product) -> bool:
    return any(
        isinstance(item, dict)
        and item.get("__type") == "multi_category_meta"
        and item.get("is_active_product") is False
        for item in (product.flavor_catalog or [])
    )


def render_product_social_preview(product_id: int, wholesale: bool = False):
    product = Product.query.filter(
        Product.id == product_id,
        Product.is_active == True,
    ).first()

    if not product or _is_product_hidden(product):
        return send_from_directory(current_app.static_folder, "index.html")

    product_path = f"/{'mayorista/' if wholesale else ''}product/{product.id}"
    product_url = urljoin(_site_root(), product_path.lstrip("/"))
    image_url = _product_image_url(product)
    title = product.name
    description = _product_description(product)

    html = render_template_string(
        """<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }}</title>
  <link rel="canonical" href="{{ product_url }}">
  <meta name="description" content="{{ description }}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="VJ Parfum & Decants">
  <meta property="og:title" content="{{ title }}">
  <meta property="og:description" content="{{ description }}">
  <meta property="og:image" content="{{ image_url }}">
  <meta property="og:image:secure_url" content="{{ image_url }}">
  <meta property="og:url" content="{{ product_url }}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{ title }}">
  <meta name="twitter:description" content="{{ description }}">
  <meta name="twitter:image" content="{{ image_url }}">
</head>
<body>
  <script>window.location.replace({{ product_url|tojson }});</script>
  <noscript><a href="{{ product_url }}">Ver producto</a></noscript>
</body>
</html>""",
        title=title,
        description=description,
        image_url=image_url,
        product_url=product_url,
    )
    return Response(html, mimetype="text/html")
