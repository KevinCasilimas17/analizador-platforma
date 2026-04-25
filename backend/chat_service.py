import os
from fastapi import APIRouter, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from mistralai import Mistral
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db, AnalisisRegistrado, AnalisisNoRegistrado
from datetime import datetime

load_dotenv()

router = APIRouter()

# Configurar cliente de Mistral
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
if not MISTRAL_API_KEY:
    raise ValueError("❌ Falta la variable MISTRAL_API_KEY en el archivo .env")

client = Mistral(api_key=MISTRAL_API_KEY)
MODELO = "mistral-small-latest"


def analizar_texto(texto: str) -> str:
    """Analizar texto político con Mistral AI"""
    
    prompt = f"""
Eres un analista político experto y neutral. Analiza el siguiente texto en 5 dimensiones:

1. **Carga ideológica**: ¿Qué sesgos o inclinaciones políticas tiene el texto? (leve/moderado/severo)
2. **Coherencia argumentativa**: ¿Los argumentos son lógicos y consistentes?
3. **Manipulación emocional**: ¿Usa lenguaje para provocar emociones? (leve/moderado/severo)
4. **Uso de falacias**: ¿Identificas falacias lógicas? ¿Cuáles?
5. **Claridad conceptual**: ¿Los conceptos están bien definidos?

Para cada dimensión, da una explicación breve.

Luego, proporciona:
- Un resumen general del análisis (2-3 líneas)
- 3 preguntas críticas que este texto no responde

Texto a analizar:
---
{texto}
---
"""

    try:
        response = client.chat.complete(
            model=MODELO,
            messages=[
                {
                    "role": "system", 
                    "content": "Eres un analista político experto. Respondes siempre en español, con claridad y objetividad. No inventas información."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        return response.choices[0].message.content
    
    except Exception as e:
        print(f"❌ Error llamando a Mistral: {e}")
        return f"Error al analizar: {str(e)}"


@router.post("/analizar")
async def analizar(
    texto: str = Form(...),
    usuario_id: int = Form(None),
    session_id: str = Form(None),
    es_registrado: bool = Form(False),
    db: Session = Depends(get_db)
):
    """Endpoint para analizar un texto desde el chat"""
    
    if not texto or texto.strip() == "":
        return JSONResponse(
            status_code=400,
            content={"resultado": "❌ El texto está vacío.", "limite_alcanzado": False}
        )
    
    # Verificar límites para usuarios no registrados
    if not es_registrado or usuario_id is None:
        hoy = datetime.utcnow().date()
        consultas_hoy = db.query(AnalisisNoRegistrado).filter(
            AnalisisNoRegistrado.session_id == session_id,
            func.date(AnalisisNoRegistrado.fecha) == hoy
        ).count()
        
        if consultas_hoy >= 3:
            return JSONResponse(
                status_code=403,
                content={
                    "resultado": "⚠️ **Has alcanzado el límite de consultas gratuitas (3 por día).**\n\nRegístrate para obtener consultas ilimitadas y guardar tu historial.",
                    "limite_alcanzado": True,
                    "requiere_registro": True
                }
            )
    
    try:
        resultado = analizar_texto(texto)
        
        # Guardar en base de datos
        if es_registrado and usuario_id:
            analisis = AnalisisRegistrado(
                usuario_id=usuario_id,
                texto_original=texto,
                resultado_analisis=resultado
            )
            db.add(analisis)
            db.commit()
        else:
            analisis = AnalisisNoRegistrado(
                session_id=session_id,
                texto_original=texto,
                resultado_analisis=resultado
            )
            db.add(analisis)
            db.commit()
        
        # Calcular consultas restantes para no registrados
        consultas_restantes = None
        if not es_registrado or usuario_id is None:
            hoy = datetime.utcnow().date()
            consultas_hoy = db.query(AnalisisNoRegistrado).filter(
                AnalisisNoRegistrado.session_id == session_id,
                func.date(AnalisisNoRegistrado.fecha) == hoy
            ).count()
            consultas_restantes = 3 - consultas_hoy
        
        return {
            "resultado": resultado,
            "limite_alcanzado": False,
            "consultas_restantes": consultas_restantes
        }
    
    except Exception as e:
        print(f"❌ Error en /analizar: {e}")
        return JSONResponse(
            status_code=500,
            content={"resultado": f"❌ Error interno: {str(e)}", "limite_alcanzado": False}
        )