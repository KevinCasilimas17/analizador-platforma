import os
import hashlib
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback para desarrollo local con PostgreSQL
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/analizador_db"

# Para desarrollo local con SQLite (opcional, si no tienes PostgreSQL local)
if DATABASE_URL.startswith("sqlite"):
    print("⚠️ Usando SQLite en desarrollo local")
    os.makedirs("database", exist_ok=True)
else:
    print(f"✅ Conectando a PostgreSQL: {DATABASE_URL[:30]}...")

# Configurar engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==================== MODELOS ====================

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    cedula = Column(String, unique=True, nullable=False)
    numero = Column(String, nullable=False)
    ciudad = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    rol = Column(String, default="usuario")  # 'usuario', 'verificado', 'admin'
    verificado = Column(Boolean, default=False)
    fecha_registro = Column(DateTime, default=datetime.utcnow)


class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String, nullable=False)
    contenido = Column(Text, nullable=False)
    likes = Column(Integer, default=0)
    fecha = Column(DateTime, default=datetime.utcnow)


class Comentario(Base):
    __tablename__ = "comentarios"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    contenido = Column(Text, nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)


class AnalisisRegistrado(Base):
    __tablename__ = "analisis_registrados"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    texto_original = Column(Text, nullable=False)
    resultado_analisis = Column(Text, nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)


class AnalisisNoRegistrado(Base):
    __tablename__ = "analisis_no_registrados"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    texto_original = Column(Text, nullable=False)
    resultado_analisis = Column(Text, nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)


# ==================== FUNCIONES DE UTILIDAD ====================

def get_db() -> Session:
    """Obtener sesión de base de datos (para inyección en endpoints)"""
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


def init_db():
    """Inicializar la base de datos y crear tablas"""
    Base.metadata.create_all(bind=engine)
    
    # Crear usuario administrador si no existe
    db = SessionLocal()
    try:
        admin_exists = db.query(Usuario).filter(Usuario.email == "admin@analizador.com").first()
        if not admin_exists:
            admin = Usuario(
                nombre="Admin",
                apellido="Principal",
                cedula="00000000",
                numero="0000000000",
                ciudad="Sistema",
                email="admin@analizador.com",
                password=hashlib.sha256("admin123".encode()).hexdigest(),
                rol="admin",
                verificado=True
            )
            db.add(admin)
            db.commit()
            print("✅ Usuario administrador creado: admin@analizador.com / admin123")
    finally:
        db.close()
    
    print("✅ Base de datos PostgreSQL inicializada correctamente")


def hash_password(password: str) -> str:
    """Hashear contraseña con SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()