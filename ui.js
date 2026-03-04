// Utilitários de UI e Logs

const debugConsole = document.getElementById('debug-console');

export function logDebug(msg, isError = false) {
    console.log(msg);
    if (debugConsole) {
        if (isError) debugConsole.style.display = 'block';
        
        const line = document.createElement('div');
        line.textContent = `> ${msg}`;
        if (isError) line.style.color = 'red';
        debugConsole.appendChild(line);
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }
}

export function showToast(message, type = 'success') {
    const toastId = type === 'success' ? 'successToast' : 'errorToast';
    const bodyId = type === 'success' ? 'successToastBody' : 'errorToastBody';
    
    const toastEl = document.getElementById(toastId);
    const toastBody = document.getElementById(bodyId);
    
    if (toastEl && toastBody) {
        toastBody.textContent = message;
        // @ts-ignore
        const toast = new bootstrap.Toast(toastEl, {
            animation: true,
            autohide: true,
            delay: 4000 // Fecha automaticamente após 4 segundos
        });
        toast.show();
    } else {
        alert(message);
    }
}

export function toggleLoginState(isLoggedIn, user = null) {
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    const userEmailSpan = document.getElementById('userEmail');

    if (isLoggedIn && user) {
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        
        // Esconde Login
        if (loginScreen) {
            loginScreen.classList.add('d-none');
            loginScreen.classList.remove('d-flex');
            loginScreen.style.setProperty('display', 'none', 'important');
        }
        
        // Mostra App
        if (appContent) {
            appContent.classList.remove('d-none');
            appContent.classList.add('d-block');
            appContent.style.setProperty('display', 'block', 'important');
        }
    } else {
        // Mostra Login
        if (loginScreen) {
            loginScreen.classList.remove('d-none');
            loginScreen.classList.add('d-flex');
            loginScreen.style.setProperty('display', 'flex', 'important');
        }
        
        // Esconde App
        if (appContent) {
            appContent.classList.add('d-none');
            appContent.classList.remove('d-block');
            appContent.style.setProperty('display', 'none', 'important');
        }
    }
}

export function setLoadingButton(btnId, isLoading, text = "Aguarde...") {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = text;
    } else {
        btn.disabled = false;
        if (btn.dataset.originalText) {
            btn.textContent = btn.dataset.originalText;
        }
    }
}

export function showLoadingOverlay(show = true) {
    let overlay = document.getElementById('loading-overlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            overlay.style.zIndex = '10000';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2 text-muted">Autenticando...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    } else {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}
