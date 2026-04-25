from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db, Usuario, hash_password
import secrets

router = APIRouter()

# Modelos de datos
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    nombre: str
    apellido: str
    cedula: str
    numero: str
    ciudad: str
    email: str
    password: str

def generar_session_id():
    return secrets.token_hex(16)


@router.post("/register")
async def register(user: UserRegister, db: Session = Depends(get_db)):
    """Registrar un nuevo usuario"""
    
    # Verificar si ya existe el email
    existing_email = db.query(Usuario).filter(Usuario.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    # Verificar si ya existe la cédula
    existing_cedula = db.query(Usuario).filter(Usuario.cedula == user.cedula).first()
    if existing_cedula:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada")
    
    # Crear nuevo usuario
    nuevo_usuario = Usuario(
        nombre=user.nombre,
        apellido=user.apellido,
        cedula=user.cedula,
        numero=user.numero,
        ciudad=user.ciudad,
        email=user.email,
        password=hash_password(user.password),
        rol="usuario",
        verificado=False
    )
    
    db.add(nuevo_usuario)
    db.commit()
    
    return {"message": "Usuario registrado exitosamente. Espera la verificación del administrador."}


@router.post("/login")
async def login(user: UserLogin, db: Session = Depends(get_db)):
    """Iniciar sesión"""
    
    usuario = db.query(Usuario).filter(
        Usuario.email == user.email,
        Usuario.password == hash_password(user.password)
    ).first()
    
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    return {
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "apellido": usuario.apellido,
            "email": usuario.email,
            "rol": usuario.rol,
            "verificado": usuario.verificado
        }
    }


@router.get("/session")
async def get_session():
    """Obtener session_id para usuarios no registrados"""
    return {"session_id": generar_session_id()}


@router.get("/usuarios/pendientes")
async def get_usuarios_pendientes(db: Session = Depends(get_db)):
    """Obtener usuarios pendientes de verificación (solo admin)"""
    # En producción, aquí deberías verificar que quien llama es admin
    usuarios = db.query(Usuario).filter(
        Usuario.verificado == False,
        Usuario.rol == "usuario"
    ).order_by(Usuario.fecha_registro.desc()).all()
    
    return [
        {
            "id": u.id,
            "nombre": u.nombre,
            "apellido": u.apellido,
            "cedula": u.cedula,
            "numero": u.numero,
            "ciudad": u.ciudad,
            "email": u.email,
            "fecha_registro": u.fecha_registro.isoformat() if u.fecha_registro else None
        }
        for u in usuarios
    ]


@router.post("/usuarios/verificar/{usuario_id}")
async def verificar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Verificar un usuario (solo admin)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.verificado = True
    usuario.rol = "verificado"
    db.commit()
    
    return {"message": "Usuario verificado exitosamente"}