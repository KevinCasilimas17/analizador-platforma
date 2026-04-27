// ==================== VARIABLES GLOBALES ====================
let usuarioActual = null;
let postsCache = [];
let sessionId = null;
let chatHistory = [];
let currentChatId = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Generar session ID para usuarios no registrados
    await generarSessionId();
    
    // Configurar sidebar toggle para móvil
    configurarSidebarToggle();
    
    // Elementos del DOM para autenticación
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
    
    // Enter key en inputs de login
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

// ==================== SIDEBAR ====================
function configurarSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function actualizarSidebarUsuario() {
    const userInfoDiv = document.getElementById('userInfoSidebar');
    const loginBtn = document.getElementById('loginSidebarBtn');
    
    if (!userInfoDiv || !loginBtn) return;
    
    if (usuarioActual) {
        let statusText = '';
        let statusClass = '';
        if (usuarioActual.rol === 'admin') {
            statusText = '👑 Administrador';
        } else if (usuarioActual.verificado) {
            statusText = '✅ Verificado';
        } else {
            statusText = '⏳ Pendiente de verificación';
        }
        
        userInfoDiv.innerHTML = `
            <div class="user-name">${escapeHtml(usuarioActual.nombre)} ${escapeHtml(usuarioActual.apellido)}</div>
            <div class="user-status">${statusText}</div>
            <button class="logout-sidebar-btn" onclick="logout()">Cerrar sesión</button>
        `;
        loginBtn.style.display = 'none';
    } else {
        userInfoDiv.innerHTML = '';
        loginBtn.style.display = 'flex';
    }
}

function abrirModalLogin() {
    const modal = document.getElementById('modalLogin');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalLogin() {
    const modal = document.getElementById('modalLogin');
    if (modal) modal.style.display = 'none';
    document.getElementById('modalLoginEmail').value = '';
    document.getElementById('modalLoginPassword').value = '';
}

function mostrarModalLogin() {
    cerrarModalRegistro();
    abrirModalLogin();
}

function abrirModalRegistro() {
    const modal = document.getElementById('modalRegister');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalRegistro() {
    const modal = document.getElementById('modalRegister');
    if (modal) modal.style.display = 'none';
    document.getElementById('modalRegNombre').value = '';
    document.getElementById('modalRegApellido').value = '';
    document.getElementById('modalRegCedula').value = '';
    document.getElementById('modalRegNumero').value = '';
    document.getElementById('modalRegCiudad').value = '';
    document.getElementById('modalRegEmail').value = '';
    document.getElementById('modalRegPassword').value = '';
}

function mostrarModalRegistro() {
    cerrarModalLogin();
    abrirModalRegistro();
}

async function loginDesdeModal() {
    const email = document.getElementById('modalLoginEmail').value;
    const password = document.getElementById('modalLoginPassword').value;
    
    if (!email || !password) {
        mostrarNotificacion('⚠️ Completa todos los campos');
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
            cerrarModalLogin();
            actualizarSidebarUsuario();
            mostrarNotificacion(`✅ Bienvenido ${usuarioActual.nombre}`);
            
            // Mostrar pantalla principal
            document.getElementById('authScreen').style.display = 'none';
            const mainAppScreen = document.getElementById('mainAppScreen');
            if (mainAppScreen) mainAppScreen.style.display = 'flex';
            
            // Actualizar header
            const userNameDisplay = document.getElementById('userNameDisplay');
            if (userNameDisplay) {
                userNameDisplay.textContent = `${usuarioActual.nombre} ${usuarioActual.apellido}`;
            }
            
            const rolBadge = document.getElementById('userRolBadge');
            if (rolBadge) {
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
            }
            
            // Configurar navegación
            configurarNavegacion();
            
            // Cargar chat por defecto
            cambiarModulo('chat');
        } else {
            const error = await response.json();
            mostrarNotificacion('❌ ' + error.detail);
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión: ' + error.message);
    }
}

async function registrarDesdeModal() {
    const nombre = document.getElementById('modalRegNombre').value;
    const apellido = document.getElementById('modalRegApellido').value;
    const cedula = document.getElementById('modalRegCedula').value;
    const numero = document.getElementById('modalRegNumero').value;
    const ciudad = document.getElementById('modalRegCiudad').value;
    const email = document.getElementById('modalRegEmail').value;
    const password = document.getElementById('modalRegPassword').value;
    
    if (!nombre || !apellido || !cedula || !numero || !ciudad || !email || !password) {
        mostrarNotificacion('⚠️ Completa todos los campos');
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
                '✅ Registro exitoso. Tu cuenta está pendiente de verificación.',
                [{ texto: 'Entendido', callback: () => {} }]
            );
            cerrarModalRegistro();
            abrirModalLogin();
        } else {
            const error = await response.json();
            mostrarNotificacion('❌ ' + error.detail);
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión: ' + error.message);
    }
}

function logout() {
    usuarioActual = null;
    actualizarSidebarUsuario();
    mostrarNotificacion('👋 Sesión cerrada');
    
    // Mostrar pantalla de autenticación
    document.getElementById('authScreen').style.display = 'flex';
    const mainAppScreen = document.getElementById('mainAppScreen');
    if (mainAppScreen) mainAppScreen.style.display = 'none';
    
    // Limpiar campos de login
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

// ==================== NAVEGACIÓN PRINCIPAL ====================
function configurarNavegacion() {
    const chatHeaderBtn = document.getElementById('chatHeaderBtn');
    const foroHeaderBtn = document.getElementById('foroHeaderBtn');
    
    if (chatHeaderBtn) {
        chatHeaderBtn.onclick = () => cambiarModulo('chat');
    }
    if (foroHeaderBtn) {
        foroHeaderBtn.onclick = () => cambiarModulo('foro');
    }
}

function cambiarModulo(modulo) {
    // Actualizar clases de los botones del header
    const chatBtn = document.getElementById('chatHeaderBtn');
    const foroBtn = document.getElementById('foroHeaderBtn');
    const moduleTitle = document.getElementById('currentModuleTitle');
    
    if (modulo === 'chat') {
        if (chatBtn) {
            chatBtn.classList.add('active');
            foroBtn?.classList.remove('active');
        }
        if (moduleTitle) moduleTitle.textContent = 'Analizador IA';
        cargarChat();
    } else if (modulo === 'foro') {
        if (foroBtn) {
            foroBtn.classList.add('active');
            chatBtn?.classList.remove('active');
        }
        if (moduleTitle) moduleTitle.textContent = 'Foro Comunitario';
        cargarForo();
    }
}

function cargarChat() {
    const contentDiv = document.getElementById('dynamicContent');
    contentDiv.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <h2>🤖 Analizador Político IA</h2>
                <p>Pega una noticia o texto político para analizarlo en 5 dimensiones</p>
                ${!usuarioActual ? '<small style="display: block; margin-top: 10px;">⚠️ Modo invitado: Tienes 3 consultas gratis por día. <a href="#" onclick="abrirModalLogin(); return false;">Inicia sesión</a> o <a href="#" onclick="abrirModalRegistro(); return false;">regístrate</a> para consultas ilimitadas.</small>' : ''}
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
                    Puedes leer y navegar por el foro, pero para publicar, comentar o dar like debes <a href="#" onclick="abrirModalLogin(); return false;">iniciar sesión</a>.
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
                    '<button class="new-post-btn disabled" disabled style="opacity:0.6;">+ Nueva publicación (solo verificados)</button>'}
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

function iniciarNuevoChat() {
    const chatMessages = document.getElementById('chat');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="bot-message">
                👋 Nuevo análisis iniciado. Pega una noticia para comenzar.
            </div>
        `;
        mostrarNotificacion('Nuevo chat iniciado');
    }
}

// ==================== AUTENTICACIÓN ORIGINAL (adaptada) ====================
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
    if (!toast) return;
    
    const messageDiv = toast.querySelector('.toast-message');
    const actionsDiv = toast.querySelector('.toast-actions');
    
    if (messageDiv) messageDiv.innerHTML = mensaje;
    if (actionsDiv) actionsDiv.innerHTML = '';
    
    if (acciones && actionsDiv) {
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
    
    if (!acciones) {
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
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
            
            // Actualizar sidebar
            actualizarSidebarUsuario();
            
            // Configurar navegación
            configurarNavegacion();
            
            // Cargar chat por defecto
            cargarChat();
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
                '✅ Registro exitoso. Tu cuenta está pendiente de verificación por el administrador.',
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

function configurarLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            usuarioActual = null;
            actualizarSidebarUsuario();
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('mainAppScreen').style.display = 'none';
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}