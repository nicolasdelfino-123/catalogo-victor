import os
from dotenv import load_dotenv

# Cargar .env lo antes posible
load_dotenv()

class Config:
    # --- Core / Seguridad ---
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-secret-key")
    # Expiración global de tokens JWT (fijo: 7 días)
    from datetime import timedelta
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Base de datos ---
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///default.db")

    # --- Email (siempre desde .env) ---
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    # Fallback: si no pasás MAIL_DEFAULT_SENDER, usa el username
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", os.getenv("MAIL_USERNAME"))
    MAIL_ASCII_ATTACHMENTS = False

    # --- Otros ---
    MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
    MERCADOPAGO_PUBLIC_KEY = os.getenv("MERCADOPAGO_PUBLIC_KEY")

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(os.path.dirname(BASE_DIR), 'uploads')
    SEND_FILE_MAX_AGE_DEFAULT = 60 * 60 * 24 * 365  # 1 año

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class TestingConfig(Config):
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "testing-secret"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
