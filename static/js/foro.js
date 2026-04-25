let postActualId = null;

async function cargarPosts() {
    try {
        const response = await fetch("/foro/posts");
        const posts = await response.json();
        postsCache = posts;
        renderizarPosts(posts);
    } catch (error) {
        console.error("Error cargando posts:", error);
        document.getElementById("listaPosts").innerHTML = '<div class="error">Error al cargar las publicaciones</div>';
    }
}

function renderizarPosts(posts) {
    const container = document.getElementById("listaPosts");
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="no-posts">No hay publicaciones aún. ¡Sé el primero en publicar!</div>';
        return;
    }
    
    let html = '';
    posts.forEach(post => {
        html += `
            <div class="post-card" onclick="verPost(${post.id})">
                <div class="post-header">
                    <h3>${escapeHtml(post.titulo)}</h3>
                    <span class="post-date">${post.fecha}</span>
                </div>
                <p class="post-author">Por ${escapeHtml(post.autor)}</p>
                <p class="post-preview">${escapeHtml(post.contenido.substring(0, 200))}${post.contenido.length > 200 ? '...' : ''}</p>
                <div class="post-stats">
                    <span>👍 ${post.likes}</span>
                    <span>💬 ${post.comentarios} comentarios</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function mostrarFormularioPost() {
    if (!usuarioActual) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(
                '🔒 Debes iniciar sesión para publicar en el foro',
                [
                    { texto: 'Iniciar sesión', callback: () => document.getElementById('btnSignIn').click() },
                    { texto: 'Registrarse', callback: () => document.getElementById('btnSignUp').click() },
                    { texto: 'Seguir leyendo', callback: () => {} }
                ]
            );
        }
        return;
    }
    
    if (!usuarioActual.verificado && usuarioActual.rol !== 'admin') {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(
                '⏳ Tu cuenta está pendiente de verificación por el administrador. Una vez verificada, podrás publicar en el foro.',
                [{ texto: 'Entendido', callback: () => {} }]
            );
        }
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Nueva publicación</h3>
            <input type="text" id="postTitulo" placeholder="Título" class="modal-input">
            <textarea id="postContenido" placeholder="Escribe tu análisis o pregunta..." rows="5" class="modal-textarea"></textarea>
            <div class="modal-buttons">
                <button onclick="crearPost()" class="modal-btn-primary">Publicar</button>
                <button onclick="cerrarModal()" class="modal-btn-secondary">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function crearPost() {
    const titulo = document.getElementById("postTitulo").value;
    const contenido = document.getElementById("postContenido").value;
    
    if (!titulo || !contenido) {
        alert("Completa todos los campos");
        return;
    }
    
    try {
        const response = await fetch("/foro/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                titulo: titulo,
                contenido: contenido,
                usuario_id: usuarioActual.id
            })
        });
        
        if (response.ok) {
            cerrarModal();
            cargarPosts();
        } else {
            const error = await response.json();
            alert("Error: " + error.detail);
        }
    } catch (error) {
        alert("Error de conexión");
    }
}

function cerrarModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

async function verPost(postId) {
    const post = postsCache.find(p => p.id === postId);
    if (!post) return;
    
    try {
        const response = await fetch(`/foro/posts/${postId}/comentarios`);
        const comentarios = await response.json();
        
        const puedeInteractuar = usuarioActual && (usuarioActual.verificado || usuarioActual.rol === 'admin');
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="post-detail">
                    <h3>${escapeHtml(post.titulo)}</h3>
                    <p class="post-meta">Por ${escapeHtml(post.autor)} · ${post.fecha}</p>
                    <p class="post-content">${escapeHtml(post.contenido)}</p>
                    <div class="post-actions">
                        ${puedeInteractuar ? 
                            `<button onclick="darLike(${post.id})" class="like-btn">👍 ${post.likes}</button>` :
                            `<button class="like-btn disabled" disabled title="Debes iniciar sesión y estar verificado para dar like">👍 ${post.likes}</button>`}
                    </div>
                    
                    <div class="comentarios-section">
                        <h4>Comentarios (${comentarios.length})</h4>
                        <div id="comentariosList" class="comentarios-list"></div>
                        
                        ${puedeInteractuar ? `
                            <div class="nuevo-comentario">
                                <textarea id="comentarioContenido" placeholder="Escribe un comentario..." rows="3"></textarea>
                                <button onclick="agregarComentario(${post.id})" class="comment-btn">Comentar</button>
                            </div>
                        ` : `
                            <div class="warning-box">
                                <p>🔒 <a href="#" onclick="document.getElementById('btnSignUp').click(); return false;">Inicia sesión</a> y sé verificado para comentar.</p>
                            </div>
                        `}
                    </div>
                </div>
                <button onclick="cerrarModal()" class="modal-close">✖</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Renderizar comentarios
        const comentariosList = document.getElementById("comentariosList");
        if (comentarios.length === 0) {
            comentariosList.innerHTML = '<p class="no-comentarios">No hay comentarios aún. ¡Sé el primero!</p>';
        } else {
            comentariosList.innerHTML = comentarios.map(c => `
                <div class="comentario">
                    <p class="comentario-autor">${escapeHtml(c.autor)} · ${c.fecha}</p>
                    <p class="comentario-contenido">${escapeHtml(c.contenido)}</p>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error("Error cargando comentarios:", error);
    }
}

async function agregarComentario(postId) {
    const contenido = document.getElementById("comentarioContenido").value;
    if (!contenido) {
        alert("Escribe un comentario");
        return;
    }
    
    try {
        const response = await fetch("/foro/comentarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contenido: contenido,
                usuario_id: usuarioActual.id,
                post_id: postId
            })
        });
        
        if (response.ok) {
            cerrarModal();
            verPost(postId);
        } else {
            const error = await response.json();
            alert("Error: " + error.detail);
        }
    } catch (error) {
        alert("Error de conexión");
    }
}

async function darLike(postId) {
    if (!usuarioActual) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(
                '🔒 Debes iniciar sesión para dar like',
                [
                    { texto: 'Iniciar sesión', callback: () => document.getElementById('btnSignIn').click() },
                    { texto: 'Registrarse', callback: () => document.getElementById('btnSignUp').click() }
                ]
            );
        }
        return;
    }
    
    try {
        const response = await fetch(`/foro/posts/${postId}/like?usuario_id=${usuarioActual.id}`, {
            method: "POST"
        });
        
        if (response.ok) {
            cargarPosts();
        } else {
            const error = await response.json();
            alert("Error: " + error.detail);
        }
    } catch (error) {
        console.error("Error dando like:", error);
    }
}