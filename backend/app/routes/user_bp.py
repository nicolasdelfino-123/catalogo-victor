from flask import Blueprint, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from app import db, bcrypt, mail
from app.models import User, Product, CartItem, Order, OrderItem
from datetime import timedelta
import secrets
import os


user_bp = Blueprint('user', __name__)


# RUTA CREAR USUARIO
@user_bp.route('/signup', methods=['POST'])
def create_user():
    try:
        email = request.json.get('email')
        password = request.json.get('password')
        name = request.json.get('name')

        if not email or not password or not name:
            return jsonify({'error': 'Email, password y nombre son necesarios'}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Este email ya esta en uso.'}), 409

        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

        new_user = User(email=email, password=password_hash, name=name)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({'message': 'User created successfully.','user_created':new_user.serialize()}), 201

    except Exception as e:
        return jsonify({'error': 'Error in user creation: ' + str(e)}), 500


# RUTA LOG-IN ( CON TOKEN DE RESPUESTA )
@user_bp.route('/login', methods=['POST'])
def get_token():
    try:
        email = request.json.get('email')
        password = request.json.get('password')
        
        print(f"=== LOGIN ATTEMPT ===")
        print(f"Email: {email}")
        print(f"Password received: {'Yes' if password else 'No'}")

        if not email or not password:
            print("ERROR: Email or password missing")
            return jsonify({'error': 'Email and password are required.'}), 400
        
        login_user = User.query.filter_by(email=email).first()
        print(f"User found in DB: {'Yes' if login_user else 'No'}")

        if not login_user:
            print("ERROR: User not found")
            return jsonify({'error': 'El email proporcionado no corresponde a ninguno registrado'}), 404

        password_from_db = login_user.password
        print(f"Password hash from DB: {password_from_db[:20]}...")
        
        true_o_false = bcrypt.check_password_hash(password_from_db, password)
        print(f"Password verification result: {true_o_false}")
        
        if true_o_false:
            expires = timedelta(minutes=30)

            user_id = login_user.id
            role = login_user.role
            additional_claims = { "role": role}

            access_token = create_access_token(identity=str(user_id), additional_claims=additional_claims, expires_delta=expires)

            print(f"LOGIN SUCCESS for user {user_id}")
            return jsonify({ 'access_token':access_token, 'role': role}), 200

        else:
            print("ERROR: Password incorrect")
            return {"Error":"Contraseña  incorrecta"}, 401
    
    except Exception as e:
        print(f"EXCEPCIÓN en login: {str(e)}")
        import traceback
        print(f"Traceback completo: {traceback.format_exc()}")
        return jsonify({"Error":"Error interno del servidor: " + str(e)}), 500
    
    
@user_bp.route('/users')
@jwt_required()
def show_users():
    current_user_id = get_jwt_identity()
    if current_user_id:
        users = User.query.all()
        user_list = []
        for user in users:
            user_dict = {
                'id': user.id,
                'email': user.email
            }
            user_list.append(user_dict)
        return jsonify(user_list), 200
    else:
        return {"Error": "Token inválido o no proporcionado"}, 401


# === RUTAS PARA CARRITO DE COMPRAS ===

@user_bp.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    """Obtener carrito del usuario"""
    try:
        current_user_id = get_jwt_identity()
        cart_items = CartItem.query.filter_by(user_id=current_user_id).all()
        
        return jsonify([item.serialize() for item in cart_items]), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener carrito: ' + str(e)}), 500

@user_bp.route('/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    """Agregar producto al carrito"""
    try:
        current_user_id = get_jwt_identity()
        product_id = request.json.get('product_id')
        quantity = request.json.get('quantity', 1)
        
        if not product_id:
            return jsonify({'error': 'ID del producto es requerido'}), 400
            
        # Verificar que el producto existe
        product = Product.query.get(product_id)
        if not product or not product.is_active:
            return jsonify({'error': 'Producto no encontrado'}), 404
            
        # Verificar stock
        if product.stock < quantity:
            return jsonify({'error': 'Stock insuficiente'}), 400
        
        # Verificar si ya existe en el carrito
        existing_item = CartItem.query.filter_by(
            user_id=current_user_id, 
            product_id=product_id
        ).first()
        
        if existing_item:
            # Actualizar cantidad
            new_quantity = existing_item.quantity + quantity
            if product.stock < new_quantity:
                return jsonify({'error': 'Stock insuficiente'}), 400
            existing_item.quantity = new_quantity
        else:
            # Crear nuevo item
            cart_item = CartItem(
                user_id=current_user_id,
                product_id=product_id,
                quantity=quantity
            )
            db.session.add(cart_item)
        
        db.session.commit()
        return jsonify({'message': 'Producto agregado al carrito'}), 201
        
    except Exception as e:
        return jsonify({'error': 'Error al agregar al carrito: ' + str(e)}), 500

@user_bp.route('/cart/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    """Actualizar cantidad de un item del carrito"""
    try:
        current_user_id = get_jwt_identity()
        quantity = request.json.get('quantity')
        
        if not quantity or quantity <= 0:
            return jsonify({'error': 'Cantidad debe ser mayor a 0'}), 400
            
        cart_item = CartItem.query.filter_by(
            id=item_id, 
            user_id=current_user_id
        ).first()
        
        if not cart_item:
            return jsonify({'error': 'Item del carrito no encontrado'}), 404
            
        # Verificar stock
        if cart_item.product.stock < quantity:
            return jsonify({'error': 'Stock insuficiente'}), 400
            
        cart_item.quantity = quantity
        db.session.commit()
        
        return jsonify({'message': 'Carrito actualizado'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al actualizar carrito: ' + str(e)}), 500

@user_bp.route('/cart/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    """Eliminar item del carrito"""
    try:
        current_user_id = get_jwt_identity()
        
        cart_item = CartItem.query.filter_by(
            id=item_id, 
            user_id=current_user_id
        ).first()
        
        if not cart_item:
            return jsonify({'error': 'Item del carrito no encontrado'}), 404
            
        db.session.delete(cart_item)
        db.session.commit()
        
        return jsonify({'message': 'Item eliminado del carrito'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al eliminar del carrito: ' + str(e)}), 500

@user_bp.route('/cart/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    """Vaciar carrito completo"""
    try:
        current_user_id = get_jwt_identity()
        
        CartItem.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        
        return jsonify({'message': 'Carrito vaciado'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al vaciar carrito: ' + str(e)}), 500


# === RUTAS PARA ÓRDENES ===

@user_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    try:
        current_user_id = int(get_jwt_identity())  # ← Convertir a int
        orders = Order.query.filter_by(user_id=current_user_id).order_by(Order.created_at.desc()).all()
        
        return jsonify([order.serialize() for order in orders]), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener órdenes: ' + str(e)}), 500

@user_bp.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    """Crear nueva orden desde el carrito"""
    try:
        current_user_id = get_jwt_identity()
        shipping_address = request.json.get('shipping_address')
        payment_method = request.json.get('payment_method')
        
        if not shipping_address or not payment_method:
            return jsonify({'error': 'Dirección de envío y método de pago son requeridos'}), 400
        
        # Obtener items del carrito
        cart_items = CartItem.query.filter_by(user_id=current_user_id).all()
        
        if not cart_items:
            return jsonify({'error': 'El carrito está vacío'}), 400
        
        # Verificar stock y calcular total
        total_amount = 0
        order_items_data = []
        
        for cart_item in cart_items:
            product = cart_item.product
            if not product.is_active:
                return jsonify({'error': f'El producto {product.name} no está disponible'}), 400
            if product.stock < cart_item.quantity:
                return jsonify({'error': f'Stock insuficiente para {product.name}'}), 400
            
            subtotal = product.price * cart_item.quantity
            total_amount += subtotal
            
            order_items_data.append({
                'product_id': product.id,
                'quantity': cart_item.quantity,
                'price': product.price
            })
        
        # Crear la orden
        order = Order(
            user_id=current_user_id,
            total_amount=total_amount,
            shipping_address=shipping_address,
            payment_method=payment_method,
            status='pending'
        )
        db.session.add(order)
        db.session.flush()  # Para obtener el ID de la orden
        
        # Crear los items de la orden y actualizar stock
        for item_data in order_items_data:
            product = Product.query.get(item_data['product_id'])

            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data['product_id'],
                quantity=item_data['quantity'],
                price=item_data['price'],
                selected_size_ml=product.volume_ml if product else None
            )
            db.session.add(order_item)
            
            # Actualizar stock
            if product:
                product.stock -= item_data['quantity']
        
        # Vaciar carrito
        CartItem.query.filter_by(user_id=current_user_id).delete()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Orden creada exitosamente',
            'order': order.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error al crear orden: ' + str(e)}), 500

@user_bp.route('/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_by_id(order_id):
    """Obtener una orden específica"""
    try:
        current_user_id = get_jwt_identity()
        order = Order.query.filter_by(id=order_id, user_id=current_user_id).first()
        
        if not order:
            return jsonify({'error': 'Orden no encontrada'}), 404
            
        return jsonify(order.serialize()), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener orden: ' + str(e)}), 500


# === PERFIL Y DIRECCIONES (NUEVO) ===

@user_bp.route("/me", methods=["GET"])
@jwt_required()
def me_get():
    try:
        current_user_id = int(get_jwt_identity())  # ← Convertir a int
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        return jsonify(user.serialize()), 200
        
    except Exception as e:
        print(f"ERROR en /user/me: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@user_bp.route("/me", methods=["PUT"])
@jwt_required()
def me_update():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    data = request.get_json() or {}

    # actualizar nombre (si viene)
    nombre_nuevo = data.get("name")
    if nombre_nuevo:
        user.name = nombre_nuevo

    # 👇 NUEVO: Si viene el campo must_reset_password, actualizarlo
    if "must_reset_password" in data:
        user.must_reset_password = bool(data["must_reset_password"])

    # cambio de contraseña (opcional)
    current = data.get("current_password")
    new = data.get("new_password")
    confirm = data.get("confirm_password")

    if any([current, new, confirm]):
        if not (current and new and confirm):
            return jsonify({"error": "Completá todos los campos de contraseña"}), 400
        if new != confirm:
            return jsonify({"error": "La nueva contraseña no coincide"}), 400
        if not bcrypt.check_password_hash(user.password, current):
            return jsonify({"error": "Contraseña actual incorrecta"}), 400
        user.password = bcrypt.generate_password_hash(new).decode("utf-8")

    elif data.get("password"):
        user.password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    db.session.commit()
    return jsonify(user.serialize()), 200


@user_bp.route("/address", methods=["GET"])
@jwt_required()
def address_get():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify({
        "billing_address": user.billing_address or {},
        "shipping_address": user.shipping_address or {},
        "dni": user.dni or ""
    }), 200

@user_bp.route("/address", methods=["PUT"])
@jwt_required()
def address_update():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    data = request.get_json() or {}
    addr_type = data.get("type")
    payload = data.get("payload")

    if addr_type not in ("shipping", "billing"):
        return jsonify({"error": "tipo inválido"}), 400

    if payload.get("dni"):
        user.dni = payload["dni"]

    if addr_type == "billing":
        user.billing_address = payload
    else:  # shipping
        user.shipping_address = payload

    db.session.commit()
    return jsonify({"ok": True})

# NUEVO: Registro con envío de email
@user_bp.route('/register-email', methods=['POST'])
def register_email():
    try:
        email = request.json.get('email')
        
        if not email:
            return jsonify({'error': 'Email es requerido'}), 400

        # Verificar si el usuario ya existe
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Este email ya está registrado'}), 409

        # Generar token único
        token = secrets.token_urlsafe(32)
        
        # Crear usuario temporal sin contraseña
        temp_user = User(
            email=email,
            password='temp_password',  # Contraseña temporal
            name='Usuario Temporal',
            is_active=False  # Inactivo hasta confirmar email
        )
        
        db.session.add(temp_user)
        db.session.commit()
        
        # Guardar token en algún lugar (podrías crear una tabla tokens o usar Redis)
        # Por simplicidad, vamos a usar el campo name temporalmente
        temp_user.name = f'temp_token:{token}'
        db.session.commit()
        
        # Enviar email
        msg = Message(
            'Confirma tu registro en Zarpados Vapers',
            recipients=[email],
            charset='utf-8'
        )
        
        # Crear URL del frontend para setup password
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        if "localhost" in frontend_url:
            frontend_url = "http://localhost:5174"
        else:
            frontend_url = "https://www.zarpados.com.ar"

        setup_url = f"{frontend_url}/setup-password?token={token}"
        
        msg.html = """
        <h2>¡Bienvenido a Zarpados Vapers!</h2>
        <p>Hace clic en el siguiente enlace para establecer tu contraseña:</p>
        <a href="{}" style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Establecer Contraseña
        </a>
        <p>Si no solicitaste este registro, ignora este email.</p>
        """.format(setup_url)
        
        mail.send(msg)
        
        return jsonify({
            'message': 'Email enviado correctamente',
            'email': email
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al procesar registro: {str(e)}'}), 500

# NUEVO: Establecer contraseña desde email
@user_bp.route('/setup-password', methods=['POST'])
def setup_password():
    try:
        token = request.json.get('token')
        password = request.json.get('password')
        name = request.json.get('name')
        
        if not all([token, password, name]):
            return jsonify({'error': 'Token, contraseña y nombre son requeridos'}), 400
        
        # Buscar usuario por token
        user = User.query.filter(User.name.like(f'temp_token:{token}%')).first()
        
        if not user:
            return jsonify({'error': 'Token inválido o expirado'}), 400
        
        # Actualizar usuario
        user.password = bcrypt.generate_password_hash(password).decode('utf-8')
        user.name = name
        user.is_active = True
        
        db.session.commit()
        
        return jsonify({'message': 'Contraseña establecida correctamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al establecer contraseña: {str(e)}'}), 500

# NUEVO: Forgot Password - Enviar email de recuperación
@user_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        email = request.json.get('email')
        
        if not email:
            return jsonify({'error': 'Email es requerido'}), 400

        # Verificar si el usuario existe
        user = User.query.filter_by(email=email).first()
        if not user:
            # Por seguridad, no revelamos si el email existe o no
            return jsonify({'message': 'Si el email existe, recibirás un enlace de recuperación'}), 200

        # Generar token único para reset
        reset_token = secrets.token_urlsafe(32)
        
        # Guardar token en el campo address temporalmente 
        user.address = f'reset_token:{reset_token}'
        db.session.commit()
        
        # Enviar email de recuperación
        msg = Message(
            'Recupera tu contraseña - Zarpados Vapers',
            recipients=[email],
            charset='utf-8'
        )
        
        # Crear URL del frontend para reset password
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        if "localhost" in frontend_url:
            frontend_url = "http://localhost:5174"
        else:
            frontend_url = "https://www.zarpados.com.ar"

        reset_url = f"{frontend_url}/reset-password/{reset_token}"

        
        msg.html = """
        <h2>Recuperación de Contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña en Zarpados Vapers.</p>
        <p>Hace clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="{}" style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Restablecer Contraseña
        </a>
        <p>Si no solicitaste este cambio, ignora este email.</p>
        <p>Este enlace expirará en 24 horas.</p>
        """.format(reset_url)
        
        mail.send(msg)
        
        return jsonify({
            'message': 'Si el email existe, recibirás un enlace de recuperación'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error al procesar solicitud: {str(e)}'}), 500


# NUEVO: Reset Password - Cambiar contraseña con token
@user_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        token = request.json.get('token')
        new_password = request.json.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token y nueva contraseña son requeridos'}), 400

        # Buscar usuario con el token en el campo address
        users = User.query.filter(User.address.like(f'%reset_token:{token}%')).all()
        
        if not users:
            return jsonify({'error': 'Token inválido o expirado'}), 400

        user = users[0]
        
        # Actualizar contraseña
        password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        user.password = password_hash
        user.address = None  # Limpiar token del campo address
        user.is_active = True  # Activar usuario si no estaba activo
        
        db.session.commit()
        
        return jsonify({'message': 'Contraseña restablecida correctamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al restablecer contraseña: {str(e)}'}), 500
