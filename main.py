from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.auth import router as auth_router
from backend.foro_service import router as foro_router
from backend.chat_service import router as chat_router

# Crear aplicación
app = FastAPI(title="Analizador IA + Foro", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configurar templates
templates = Jinja2Templates(directory="templates")

# Inicializar base de datos
init_db()

# Incluir routers
app.include_router(auth_router, prefix="/auth", tags=["Autenticación"])
app.include_router(foro_router, prefix="/foro", tags=["Foro"])
app.include_router(chat_router, prefix="/chat", tags=["Chat IA"])

# Ruta principal
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "message": "Servidor funcionando correctamente"}