import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# Configuración de correo
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
VERIFICATION_BASE_URL = os.getenv("VERIFICATION_BASE_URL", "https://analizador-platforma.onrender.com")

def enviar_correo_verificacion(email_destino: str, token: str):
    """Envía un correo con el enlace de verificación"""
    
    if not SMTP_USER or not SMTP_PASSWORD:
        print("⚠️ No se envió correo: falta configurar SMTP_USER o SMTP_PASSWORD")
        return False
    
    asunto = "Verifica tu cuenta - Analizador IA"
    
    enlace = f"{VERIFICATION_BASE_URL}/auth/verificar?token={token}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Verifica tu cuenta</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #667eea;">¡Bienvenido a Analizador IA!</h2>
            <p>Gracias por registrarte. Para comenzar a usar tu cuenta, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
            <p style="text-align: center;">
                <a href="{enlace}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verificar mi cuenta</a>
            </p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">{enlace}</p>
            <p>Si no solicitaste este registro, ignora este mensaje.</p>
            <hr>
            <p style="font-size: 12px; color: #888;">Analizador IA - Tu plataforma de análisis político</p>
        </div>
    </body>
    </html>
    """
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = asunto
    msg["From"] = SMTP_USER
    msg["To"] = email_destino
    
    # Adjuntar versión HTML
    parte_html = MIMEText(html, "html")
    msg.attach(parte_html)
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, email_destino, msg.as_string())
        print(f"✅ Correo de verificación enviado a {email_destino}")
        return True
    except Exception as e:
        print(f"❌ Error enviando correo: {e}")
        return False