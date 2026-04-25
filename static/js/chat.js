let procesando = false;
let controller = null;
let consultasRestantes = null;

function inicializarChat() {
    const input = document.getElementById("mensaje");
    const boton = document.getElementById("enviarBtn");
    
    if (!input) return;
    
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviarMensaje();
        }
    });
}

async function enviarMensaje() {
    if (procesando) return;
    
    const input = document.getElementById("mensaje");
    const texto = input.value.trim();
    if (!texto) return;
    
    procesando = true;
    const boton = document.getElementById("enviarBtn");
    boton.innerHTML = "⏹";
    boton.disabled = true;
    input.disabled = true;
    
    agregarMensaje("user", texto);
    input.value = "";
    
    const loading = document.createElement("div");
    loading.className = "bot-message loading";
    loading.innerText = "🔍 Analizando con Mistral AI...";
    document.getElementById("chat").appendChild(loading);
    scrollToBottom();
    
    controller = new AbortController();
    
    // Preparar datos para enviar
    let formData = new URLSearchParams();
    formData.append("texto", texto);
    
    if (usuarioActual) {
        formData.append("usuario_id", usuarioActual.id);
        formData.append("es_registrado", "true");
    } else {
        formData.append("session_id", sessionId);
        formData.append("es_registrado", "false");
    }
    
    try {
        const response = await fetch("/chat/analizar", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData,
            signal: controller.signal
        });
        
        const data = await response.json();
        loading.remove();
        
        if (data.limite_alcanzado) {
            agregarMensaje("bot", data.resultado);
            // Mostrar notificación de registro
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion(
                    '⚠️ Has alcanzado el límite de consultas gratuitas. Regístrate para obtener consultas ilimitadas.',
                    [
                        { texto: 'Registrarse', callback: () => document.getElementById('btnSignUp').click() },
                        { texto: 'Seguir leyendo', callback: () => {} }
                    ]
                );
            }
        } else {
            agregarMensaje("bot", data.resultado);
            
            if (data.consultas_restantes !== null && !usuarioActual) {
                agregarMensaje("bot", `ℹ️ Te quedan ${data.consultas_restantes} consultas gratis hoy. <a href="#" onclick="document.getElementById('btnSignUp').click(); return false;">Regístrate</a> para consultas ilimitadas.`);
            }
        }
        
    } catch (error) {
        if (error.name === "AbortError") {
            loading.innerText = "⏹ Análisis detenido";
        } else {
            loading.innerText = "❌ Error al conectar con el servidor";
            console.error(error);
        }
    }
    
    finalizarProceso();
}

function agregarMensaje(tipo, contenido) {
    const chat = document.getElementById("chat");
    const div = document.createElement("div");
    div.className = tipo === "user" ? "user-message" : "bot-message";
    div.innerHTML = contenido.replace(/\n/g, "<br>");
    chat.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const chat = document.getElementById("chat");
    if (chat) {
        chat.scrollTop = chat.scrollHeight;
    }
}

function finalizarProceso() {
    procesando = false;
    const input = document.getElementById("mensaje");
    const boton = document.getElementById("enviarBtn");
    if (input) {
        input.disabled = false;
        input.focus();
    }
    if (boton) {
        boton.innerHTML = "Enviar";
        boton.disabled = false;
    }
}