from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db, Usuario, hash_password
from backend.email_service import enviar_correo_verificacion
import secrets
import hashlib

router = APIRouter()

# Modelos de datos (ya los tienes, solo asegúrate que existan)
class UserRegister(BaseModel):
    nombre: str
    apellido: str
    cedula: str
    numero: str
    ciudad: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def generar_token_verificacion(email: str) -> str:
    """Genera un token único para verificar email"""
    data = f"{email}{secrets.token_hex(16)}"
    return hashlib.sha256(data.encode()).hexdigest()

@router.post("/register")
async def register(user: UserRegister, db: Session = Depends(get_db)):
    """Registrar un nuevo usuario y enviar correo de verificación"""
    
    # Verificar si ya existe el email
    existing_email = db.query(Usuario).filter(Usuario.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    # Verificar si ya existe la cédula
    existing_cedula = db.query(Usuario).filter(Usuario.cedula == user.cedula).first()
    if existing_cedula:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada")
    
    # Generar token de verificación
    token = generar_token_verificacion(user.email)
    
    # Crear nuevo usuario (pendiente de verificación)
    nuevo_usuario = Usuario(
        nombre=user.nombre,
        apellido=user.apellido,
        cedula=user.cedula,
        numero=user.numero,
        ciudad=user.ciudad,
        email=user.email,
        password=hash_password(user.password),
        rol="usuario",
        verificado=0  # No verificado hasta que confirme el email
    )
    
    db.add(nuevo_usuario)
    db.flush()  # Para obtener el ID sin commit aún
    
    # Guardar token en una tabla temporal (opcional, o usar un campo en usuario)
    # Por simplicidad, creamos una tabla de tokens (habrá que crearla en database.py)
    from backend.database import TokenVerificacion
    token_record = TokenVerificacion(
        usuario_id=nuevo_usuario.id,
        token=token
    )
    db.add(token_record)
    db.commit()
    
    # Enviar correo de verificación
    enviado = enviar_correo_verificacion(user.email, token)
    
    if not enviado:
        print(f"⚠️ No se pudo enviar correo a {user.email}")
    
    return {"message": "Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta."}

@router.get("/verificar")
async def verificar_cuenta(token: str = Query(...), db: Session = Depends(get_db)):
    """Verificar la cuenta de un usuario mediante token"""
    
    from backend.database import TokenVerificacion
    # Buscar el token
    token_record = db.query(TokenVerificacion).filter(TokenVerificacion.token == token).first()
    
    if not token_record:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    # Buscar el usuario
    usuario = db.query(Usuario).filter(Usuario.id == token_record.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Marcar como verificado
    usuario.verificado = 1
    usuario.rol = "verificado"  # Actualizar rol a verificado
    
    # Eliminar el token (ya no se necesita)
    db.delete(token_record)
    db.commit()
    
    return {"message": "Cuenta verificada exitosamente. Ya puedes iniciar sesión."}

# El login se mantiene igual, pero puedes agregar validación extra si quieres
# que solo puedan entrar usuarios verificados (opcional)
@router.post("/login")
async def login(user: UserLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.email == user.email,
        Usuario.password == hash_password(user.password)
    ).first()
    
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Opcional: si quieres que solo usuarios verificados puedan entrar
    # if usuario.verificado != 1:
    #     raise HTTPException(status_code=403, detail="Debes verificar tu correo electrónico antes de iniciar sesión")
    
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