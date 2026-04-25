# Analizador IA + Foro Político

Aplicación web que permite analizar textos políticos con IA (Mistral) y un foro comunitario.

## Características

- 🤖 **Analizador IA**: Analiza textos políticos en 5 dimensiones usando Mistral AI
- 💬 **Foro Comunitario**: Espacio para debates políticos (solo usuarios verificados pueden publicar)
- 🔐 **Autenticación**: Registro con verificación manual por administrador
- 📊 **Límites**: 3 consultas gratis por día para usuarios no registrados

## Tecnologías

- FastAPI (Backend)
- PostgreSQL (Base de datos)
- SQLAlchemy (ORM)
- Mistral AI (IA)
- Tailwind CSS (Frontend)

## Requisitos

- Python 3.11+
- PostgreSQL 15+
- Docker (opcional, para desarrollo)

## Instalación local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/analizador-platforma.git
cd analizador-platforma

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (crear archivo .env)
MISTRAL_API_KEY=tu_api_key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/analizador_db

# Ejecutar servidor
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000