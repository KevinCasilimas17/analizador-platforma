// ==================== VARIABLES GLOBALES ====================
let usuarioActual = null;
let postsCache = [];
let sessionId = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Generar session ID para usuarios no registrados
    await generarSessionId();
    
    // Elementos del DOM
    const container = document.getElementById('container');
    const btnSignUp = document.getElementById('btnSignUp');
    const btnSignIn = document.getElementById('btnSignIn');
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    
    if (btnSignUp) {
        btnSignUp.addEventListener('click', () => {
            container.classList.add('toggle');
        });
    }
    
    if (btnSignIn) {
        btnSignIn.addEventListener('click', () => {
            container.classList.remove('toggle');
        });
    }
    
    if (btnLogin) {
        btnLogin.addEventListener('click', login);
    }
    
    if (btnRegister) {
        btnRegister.addEventListener('click', registrar);
    }
    
    // Enter key en inputs
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    if (loginEmail && loginPassword) {
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
});

async function generarSessionId() {
    try {
        const response = await fetch("/auth/session");
        const data = await response.json();
        sessionId = data.session_id;
        localStorage.setItem('sessionId', sessionId);
    } catch (error) {
        console.error("Error generando session ID:", error);
    }
}

function mostrarNotificacion(mensaje, acciones = null, tipo = 'info') {
    const toast = document.getElementById('notificationToast');
    const messageDiv = toast.querySelector('.toast-message');
    const actionsDiv = toast.querySelector('.toast-actions');
    
    messageDiv.innerHTML = mensaje;
    actionsDiv.innerHTML = '';
    
    if (acciones) {
        acciones.forEach(accion => {
            const btn = document.createElement('button');
            btn.textContent = accion.texto;
            btn.className = 'toast-btn';
            btn.onclick = () => {
                toast.style.display = 'none';
                if (accion.callback) accion.callback();
            };
            actionsDiv.appendChild(btn);
        });
    }
    
    toast.style.display = 'flex';
    
    // Auto-ocultar después de 5 segundos si no tiene acciones
    if (!acciones) {
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
}

function cerrarNotificacion() {
    document.getElementById('notificationToast').style.display = 'none';
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        mostrarNotificacion('⚠️ Por favor, completa todos los campos');
        return;
    }
    
    try {
        const response = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            usuarioActual = data.usuario;
            
            // Mostrar pantalla principal
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainAppScreen').style.display = 'flex';
            document.getElementById('userNameDisplay').textContent = `${usuarioActual.nombre} ${usuarioActual.apellido}`;
            
            // Mostrar badge según rol
            const rolBadge = document.getElementById('userRolBadge');
            if (usuarioActual.rol === 'admin') {
                rolBadge.textContent = '👑 Administrador';
                rolBadge.className = 'rol-badge admin';
            } else if (usuarioActual.verificado) {
                rolBadge.textContent = '✅ Verificado';
                rolBadge.className = 'rol-badge verificado';
            } else {
                rolBadge.textContent = '⏳ Pendiente de verificación';
                rolBadge.className = 'rol-badge pendiente';
            }
            
            // Cargar chat por defecto
            cargarChat();
            configurarTabs();
            configurarLogout();
        } else {
            const error = await response.json();
            mostrarNotificacion('❌ Error: ' + error.detail);
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión: ' + error.message);
    }
}

async function registrar() {
    const nombre = document.getElementById('regNombre').value;
    const apellido = document.getElementById('regApellido').value;
    const cedula = document.getElementById('regCedula').value;
    const numero = document.getElementById('regNumero').value;
    const ciudad = document.getElementById('regCiudad').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    if (!nombre || !apellido || !cedula || !numero || !ciudad || !email || !password) {
        mostrarNotificacion('⚠️ Por favor, completa todos los campos');
        return;
    }
    
    try {
        const response = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, apellido, cedula, numero, ciudad, email, password })
        });
        
        if (response.ok) {
            mostrarNotificacion(
                '✅ Registro exitoso. Tu cuenta está pendiente de verificación por el administrador. Recibirás un correo cuando sea aprobada.',
                [{ texto: 'Entendido', callback: () => {} }]
            );
            // Limpiar formulario y cambiar a login
            document.getElementById('regNombre').value = '';
            document.getElementById('regApellido').value = '';
            document.getElementById('regCedula').value = '';
            document.getElementById('regNumero').value = '';
            document.getElementById('regCiudad').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('container').classList.remove('toggle');
        } else {
            const error = await response.json();
            mostrarNotificacion('❌ Error: ' + error.detail);
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión: ' + error.message);
    }
}

function configurarTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tabName === 'chat') {
                cargarChat();
            } else if (tabName === 'foro') {
                cargarForo();
            }
        });
    });
}

function configurarLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            usuarioActual = null;
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('mainAppScreen').style.display = 'none';
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        });
    }
}

function cargarChat() {
    const contentDiv = document.getElementById('dynamicContent');
    contentDiv.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <h2>🤖 Analizador Político IA</h2>
                <p>Pega una noticia o texto político para analizarlo en 5 dimensiones</p>
                ${!usuarioActual ? '<small style="display: block; margin-top: 10px;">⚠️ Modo invitado: Tienes 3 consultas gratis por día. <a href="#" onclick="document.getElementById(\'btnSignUp\').click(); return false;">Regístrate</a> para consultas ilimitadas.</small>' : ''}
                ${usuarioActual && !usuarioActual.verificado && usuarioActual.rol !== 'admin' ? '<small style="display: block; margin-top: 10px;">⏳ Tu cuenta está pendiente de verificación. Mientras tanto, puedes usar el chat sin límites.</small>' : ''}
            </div>
            <div id="chat" class="chat-messages">
                <div class="bot-message">
                    👋 ¡Bienvenido! Pega una noticia, discurso o texto político y lo analizaré.
                </div>
            </div>
            <div class="chat-input-container">
                <textarea id="mensaje" placeholder="Escribe o pega una noticia..." rows="3"></textarea>
                <button id="enviarBtn" onclick="enviarMensaje()">Enviar</button>
            </div>
        </div>
    `;
    
    if (typeof inicializarChat === 'function') {
        inicializarChat();
    }
}

function cargarForo() {
    const contentDiv = document.getElementById('dynamicContent');
    
    let warningMessage = '';
    if (!usuarioActual) {
        warningMessage = `
            <div class="warning-banner">
                <span>🔔</span>
                <div>
                    <strong>No has iniciado sesión</strong><br>
                    Puedes leer y navegar por el foro, pero para publicar, comentar o dar like debes <a href="#" onclick="document.getElementById('btnSignUp').click(); return false;">registrarte</a> y ser verificado por nuestro equipo.
                </div>
            </div>
        `;
    } else if (usuarioActual && !usuarioActual.verificado && usuarioActual.rol !== 'admin') {
        warningMessage = `
            <div class="warning-banner warning-pending">
                <span>⏳</span>
                <div>
                    <strong>Cuenta pendiente de verificación</strong><br>
                    Tu cuenta está siendo revisada por el administrador. Una vez verificada, podrás publicar en el foro.
                </div>
            </div>
        `;
    }
    
    contentDiv.innerHTML = `
        <div class="foro-container">
            ${warningMessage}
            <div class="foro-header">
                <h2>💬 Foro Comunitario</h2>
                ${(usuarioActual && (usuarioActual.verificado || usuarioActual.rol === 'admin')) ? 
                    '<button onclick="mostrarFormularioPost()" class="new-post-btn">+ Nueva publicación</button>' : 
                    '<button class="new-post-btn disabled" disabled title="Debes estar verificado para publicar">+ Nueva publicación (solo verificados)</button>'}
            </div>
            <div id="listaPosts" class="posts-list">
                <div class="loading">Cargando publicaciones...</div>
            </div>
        </div>
    `;
    
    if (typeof cargarPosts === 'function') {
        cargarPosts();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}