from app import db
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.dialects.postgresql import JSONB

from datetime import datetime
from zoneinfo import ZoneInfo

AR_TZ = ZoneInfo("America/Argentina/Cordoba")

def now_cba_naive():
    # datetime naive pero en hora local de Córdoba
    return datetime.now(AR_TZ).replace(tzinfo=None)

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
   
    password = db.Column(db.String(255), nullable=False)  # En vez de 60
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=True)

    # EXISTENTE (direccion única vieja): podés mantenerla por compatibilidad
    address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ➕ NUEVO: DNI (rápido acceso)
    dni: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # ➕ NUEVO: direcciones completas separadas (mismo shape que tus forms)
    # { name, lastname, dni, country, address, apartment, city, province, postalCode, phone, email }
    billing_address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    shipping_address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)

    role: Mapped[str] = mapped_column(String(10), nullable=False, default="user")
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_cba_naive)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_premium: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    must_reset_password: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)

    def serialize(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'phone': self.phone,
            'address': self.address, # legacy
            'dni': self.dni,
            'billing_address': self.billing_address or {},
            'shipping_address': self.shipping_address or {},
            'role': self.role,
            'last_login': self.last_login,
            'is_active': self.is_active,
            'is_premium': self.is_premium,
            'is_admin': self.is_admin,
            'must_reset_password': self.must_reset_password,
        }



class Category(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # Relación con productos
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")
    
    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
        }






class Product(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(2000), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(40000), nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(String(40000), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_url: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("category.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)

    flavors: Mapped[Optional[list[str]]] = mapped_column(JSONB, nullable=True, default=list)
    flavor_enabled: Mapped[bool] = mapped_column(Boolean(), nullable=True, default=False)
    flavor_catalog: Mapped[Optional[list[dict]]] = mapped_column(JSONB, nullable=True, default=list)
    flavor_stock_mode: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)

    puffs: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    nicotine_mg: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    volume_ml: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    volume_options: Mapped[Optional[list[dict]]] = mapped_column(JSONB, nullable=True, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_cba_naive)

    # Relaciones
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    cart_items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="product")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product")

    price_wholesale: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


  
    def serialize(self):
        # Armar lista de URLs de imágenes (principal + asociadas)
        image_urls = []
        if self.image_url:
            image_urls.append(self.image_url)

        try:
            # Traer IDs de imágenes vinculadas al producto
            rows = (
                db.session.query(ProductImage.id)
                .filter_by(product_id=self.id)
                .order_by(ProductImage.id.asc())
                .all()
            )
            for (img_id,) in rows:
                url = f"/public/img/{img_id}"
                if url not in image_urls:
                    image_urls.append(url)
        except Exception:
            pass  # si no hay app context o algo similar

        # Casts defensivos
        try:
            price_val = float(self.price) if self.price is not None else 0.0
        except Exception:
            price_val = 0.0
        try:
            stock_val = int(self.stock or 0)
        except Exception:
            stock_val = 0

        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'short_description': self.short_description,
            'price': price_val,
            'stock': stock_val,
            'image_url': self.image_url,          # principal (compat)
            'image_urls': image_urls,             # todas las fotos
            'brand': self.brand,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'is_active': self.is_active,
            'flavors': self.flavors or [],
            'flavor_enabled': self.flavor_enabled,
            'flavor_catalog': self.flavor_catalog or [],
            'flavor_stock_mode': self.flavor_stock_mode,
            'puffs': self.puffs,
            'nicotine_mg': self.nicotine_mg,
            'volume_ml': self.volume_ml,
            'volume_options': self.volume_options or [],
            'created_at': self.created_at.isoformat(),
            'price_wholesale': float(self.price_wholesale) if self.price_wholesale else None,
        }
  


        # --- Modelo de imagen persistida en BD ---
class ProductImage(db.Model):
    __tablename__ = "product_images"
    __table_args__ = (db.Index('ix_product_images_product_id', 'product_id'),)

    id = db.Column(db.Integer, primary_key=True)
    # Relación opcional al producto (puede ser null si subís imágenes antes de crear el producto)
    product_id = db.Column(
    db.Integer,
    db.ForeignKey('product.id', ondelete='CASCADE'),
    nullable=True
)


    # Datos binarios + metadatos
    mime_type = db.Column(db.String(64), nullable=False)     # p.ej. "image/webp" o "image/jpeg"
    bytes = db.Column(db.LargeBinary, nullable=False)        # la imagen en sí (optimizada)
    width = db.Column(db.Integer, nullable=True)
    height = db.Column(db.Integer, nullable=True)

    # Para cache/ETag y deduplicación opcional
    digest = db.Column(db.String(64), index=True, nullable=True, unique=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_cba_naive)

    def serialize(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "mime_type": self.mime_type,
            "width": self.width,
            "height": self.height,
            "created_at": self.created_at.isoformat()
        }

class CartItem(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("product.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # NUEVO: sabor elegido
    selected_flavor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_cba_naive)
    user: Mapped["User"] = relationship("User")
    product: Mapped["Product"] = relationship("Product", back_populates="cart_items")

    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'selected_flavor': self.selected_flavor,
            'product': self.product.serialize() if self.product else None,
            'created_at': self.created_at.isoformat(),
        }



class Order(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), nullable=True)  # Puede ser guest
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    shipping_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True, index=True)
    external_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 👇 DATOS COMPLETOS DEL CLIENTE EN EL MOMENTO DEL PEDIDO
    customer_first_name: Mapped[str] = mapped_column(String(100), nullable=True)
    customer_last_name: Mapped[str] = mapped_column(String(100), nullable=True)
    customer_email: Mapped[str] = mapped_column(String(100), nullable=True)
    customer_phone: Mapped[str] = mapped_column(String(40), nullable=True)
    customer_dni: Mapped[str] = mapped_column(String(20), nullable=True)
    customer_comment: Mapped[Optional[str]] = mapped_column(String(5000), nullable=True)
    tracking_code: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    public_order_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # 👇 DIRECCIÓN DE ENVÍO (y facturación si es igual)
    shipping_address: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict  # estructura: {address, apartment, city, province, country, postalCode}
    )

    # 👇 OPCIONAL: por si en un futuro tenés facturación distinta
    billing_address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_cba_naive)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=now_cba_naive, onupdate=now_cba_naive)

    # Relaciones
    user: Mapped[Optional["User"]] = relationship("User")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'total_amount': self.total_amount,
            'status': self.status,
            'payment_method': self.payment_method,
            'payment_id': self.payment_id,
            'external_reference': self.external_reference,
            'public_order_number': self.public_order_number,
            'customer_first_name': self.customer_first_name,
            'customer_last_name': self.customer_last_name,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'customer_dni': self.customer_dni,
            'shipping_address': self.shipping_address,
            'shipping_cost': self.shipping_cost,
            'customer_comment': self.customer_comment,
            'billing_address': self.billing_address,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'order_items': [item.serialize() for item in self.order_items],
            'tracking_code': self.tracking_code,

        }


class OrderItem(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("order.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("product.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)  # Precio al momento de la compra
    
    # ➕ NUEVO: sabor elegido
    selected_flavor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    selected_size_ml: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Relaciones
    order: Mapped["Order"] = relationship("Order", back_populates="order_items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")
    
    def serialize(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'price': self.price,
            'product_name': self.product.name if self.product else None,
            'product_brand': self.product.brand if self.product else None,
            'product_volume_ml': self.product.volume_ml if self.product else None,
            'selected_flavor': self.selected_flavor,
            'selected_size_ml': self.selected_size_ml if self.selected_size_ml is not None else (self.product.volume_ml if self.product else None),
            'subtotal': self.quantity * self.price,
        }
