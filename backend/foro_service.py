from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db, Usuario, Post, Comentario
from datetime import datetime

router = APIRouter()


# Modelos
class PostCreate(BaseModel):
    titulo: str
    contenido: str
    usuario_id: int


class ComentarioCreate(BaseModel):
    contenido: str
    usuario_id: int
    post_id: int


def verificar_permiso_publicar(usuario_id: int, db: Session):
    """Verificar si el usuario puede publicar en el foro"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    if usuario.rol != "admin" and not usuario.verificado:
        raise HTTPException(status_code=403, detail="Debes estar verificado para publicar en el foro")
    
    return True


@router.get("/posts")
async def get_posts(db: Session = Depends(get_db)):
    """Obtener todas las publicaciones del foro (público)"""
    
    posts = db.query(Post).join(Usuario, Post.usuario_id == Usuario.id).filter(
        (Usuario.verificado == True) | (Usuario.rol == "admin")
    ).order_by(Post.fecha.desc()).all()
    
    resultado = []
    for post in posts:
        # Obtener autor
        autor = db.query(Usuario).filter(Usuario.id == post.usuario_id).first()
        
        # Contar comentarios
        comentarios_count = db.query(Comentario).filter(Comentario.post_id == post.id).count()
        
        resultado.append({
            "id": post.id,
            "titulo": post.titulo,
            "contenido": post.contenido,
            "likes": post.likes,
            "fecha": post.fecha.isoformat() if post.fecha else None,
            "autor": f"{autor.nombre} {autor.apellido}" if autor else "Desconocido",
            "comentarios": comentarios_count
        })
    
    return resultado


@router.post("/posts")
async def create_post(post: PostCreate, db: Session = Depends(get_db)):
    """Crear una nueva publicación (solo verificado o admin)"""
    verificar_permiso_publicar(post.usuario_id, db)
    
    nuevo_post = Post(
        usuario_id=post.usuario_id,
        titulo=post.titulo,
        contenido=post.contenido
    )
    
    db.add(nuevo_post)
    db.commit()
    
    return {"message": "Publicación creada exitosamente"}


@router.get("/posts/{post_id}/comentarios")
async def get_comentarios(post_id: int, db: Session = Depends(get_db)):
    """Obtener comentarios de una publicación (público)"""
    
    comentarios = db.query(Comentario).filter(Comentario.post_id == post_id).order_by(Comentario.fecha.asc()).all()
    
    resultado = []
    for comentario in comentarios:
        autor = db.query(Usuario).filter(Usuario.id == comentario.usuario_id).first()
        resultado.append({
            "id": comentario.id,
            "contenido": comentario.contenido,
            "fecha": comentario.fecha.isoformat() if comentario.fecha else None,
            "autor": f"{autor.nombre} {autor.apellido}" if autor else "Desconocido"
        })
    
    return resultado


@router.post("/comentarios")
async def create_comentario(comentario: ComentarioCreate, db: Session = Depends(get_db)):
    """Crear un nuevo comentario (solo verificado o admin)"""
    verificar_permiso_publicar(comentario.usuario_id, db)
    
    nuevo_comentario = Comentario(
        post_id=comentario.post_id,
        usuario_id=comentario.usuario_id,
        contenido=comentario.contenido
    )
    
    db.add(nuevo_comentario)
    db.commit()
    
    return {"message": "Comentario agregado exitosamente"}


@router.post("/posts/{post_id}/like")
async def dar_like(post_id: int, usuario_id: int, db: Session = Depends(get_db)):
    """Dar like a una publicación (solo registrados)"""
    
    # Verificar que el usuario existe
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Debes iniciar sesión para dar like")
    
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    
    post.likes += 1
    db.commit()
    
    return {"message": "Like agregado"}