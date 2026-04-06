import os
from flask import Flask
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from flask_mail import Mail
from dotenv import load_dotenv

load_dotenv()
from app.config import DevelopmentConfig, ProductionConfig, TestingConfig

# Instancias que se inicializan más adelante
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
migrate = Migrate()
mail = Mail()

def create_app():
    """
    We define static_folder because Flask is going to serve the front end files (Only in PRODUCTION!)
    since we are running everything from a single Dockerfile in production
    """
    enviroment = os.getenv("FLASK_ENV", "production")

    if enviroment == "production":
        static_folder = "/var/www/catalogo/catalogo-attar/frontend/dist"
    else:
        static_folder = "frontend/dist"

    app = Flask(__name__, static_folder=static_folder, static_url_path="/")

    # Configuración básica según entorno
 
    if enviroment == "development":
        app.config.from_object(DevelopmentConfig)
    elif enviroment == "testing":
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(ProductionConfig)
    # 🚫 Silenciar prints en producción
    if enviroment == "production":
        import sys
        sys.stdout = open(os.devnull, 'w')  # silencia print()

    # 🔑 Sobrescribir la DB con la URI del .env si existe
    sqlalchemy_uri = os.getenv("SQLALCHEMY_DATABASE_URI")
    if sqlalchemy_uri:
        app.config["SQLALCHEMY_DATABASE_URI"] = sqlalchemy_uri
    else:
        print("⚠️  No se encontró SQLALCHEMY_DATABASE_URI en .env, usando configuración por defecto")

    # Extensiones
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db, compare_type=True)
    mail.init_app(app)
    print("MAIL_USER:", app.config.get("MAIL_USERNAME"))
    print("MAIL_PASS_LEN:", len(str(app.config.get("MAIL_PASSWORD") or "")))
    print("MAIL_DEFAULT_SENDER:", app.config.get("MAIL_DEFAULT_SENDER"))

    # Creamos carpeta de base de datos si no existe
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'mydatabase.db')
    print(f"Ruta de la base de datos: {db_path}")
    if not os.path.exists(os.path.dirname(db_path)):
        os.makedirs(os.path.dirname(db_path))

    # Registramos blueprints existentes
    from app.routes.user_bp import user_bp
    from app.routes.public_bp import public_bp
    from app.routes.admin_bp import admin_bp
    from app.routes.mercadopago_bp import mercadopago_bp

    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(public_bp, url_prefix='/public')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(mercadopago_bp, url_prefix='/api/mercadopago')

    # ⚠️ No hay api.py adicional; /me/address no existe. Usar /user/address en el front.
    return app
