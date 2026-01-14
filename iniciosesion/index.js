// Importar funciones de Supabase
// Usar variables globales ya cargadas en el HTML
const auth = window.auth;
const supabase = window.supabase;

// Elementos del DOM
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userInfo = document.getElementById('user-info');
const loginFormElement = document.getElementById('login-form-element');
const registerFormElement = document.getElementById('register-form-element');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleRegisterBtn = document.getElementById('google-register-btn');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const userEmailSpan = document.getElementById('user-email');

// Función para mostrar mensajes
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
        element.style.display = 'none';
        element.className = 'message';
    }, 5000);
}

// Función para cambiar entre formularios
function switchForm(showForm, hideForm) {
    showForm.style.display = 'block';
    hideForm.style.display = 'none';
    
    // Limpiar mensajes
    loginMessage.style.display = 'none';
    registerMessage.style.display = 'none';
    
    // Limpiar formularios
    loginFormElement.reset();
    registerFormElement.reset();
}

// Event listeners para cambiar entre formularios
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(registerForm, loginForm);
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm, registerForm);
});

// Event listeners para Google
googleLoginBtn.addEventListener('click', async () => {
    try {
        showMessage(loginMessage, 'Conectando con Google...', 'success');
        const { data, error } = await auth.signInWithGoogle();
        
        if (error) {
            showMessage(loginMessage, `Error: ${error.message}`, 'error');
        }
    } catch (error) {
        showMessage(loginMessage, 'Error de conexión con Google', 'error');
        console.error('Error Google login:', error);
    }
});

googleRegisterBtn.addEventListener('click', async () => {
    try {
        showMessage(registerMessage, 'Conectando con Google...', 'success');
        const { data, error } = await auth.signInWithGoogle();
        
        if (error) {
            showMessage(registerMessage, `Error: ${error.message}`, 'error');
        }
    } catch (error) {
        showMessage(registerMessage, 'Error de conexión con Google', 'error');
        console.error('Error Google register:', error);
    }
});

// Manejar inicio de sesión
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Validación básica
    if (!email || !password) {
        showMessage(loginMessage, 'Por favor completa todos los campos', 'error');
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage(loginMessage, 'Por favor ingresa un correo electrónico válido', 'error');
        return;
    }
    
    try {
        showMessage(loginMessage, 'Iniciando sesión...', 'success');
        
        const { data, error } = await auth.signIn(email, password);
        
        if (error) {
            showMessage(loginMessage, `Error: ${error.message}`, 'error');
        } else {
            showMessage(loginMessage, '¡Sesión iniciada correctamente!', 'success');
            // Actualizar UI después de un breve delay
            setTimeout(() => {
                updateAuthUI(data.user);
            }, 1000);
        }
    } catch (error) {
        showMessage(loginMessage, 'Error de conexión. Intenta nuevamente.', 'error');
        console.error('Error de login:', error);
    }
});

// Manejar registro
registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validación básica
    if (!email || !password || !confirmPassword) {
        showMessage(registerMessage, 'Por favor completa todos los campos', 'error');
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage(registerMessage, 'Por favor ingresa un correo electrónico válido', 'error');
        return;
    }
    
    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
        showMessage(registerMessage, 'Las contraseñas no coinciden', 'error');
        return;
    }
    
    // Validar longitud de contraseña
    if (password.length < 6) {
        showMessage(registerMessage, 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        showMessage(registerMessage, 'Creando cuenta...', 'success');
        
        const { data, error } = await auth.signUp(email, password);
        
        if (error) {
            showMessage(registerMessage, `Error: ${error.message}`, 'error');
        } else {
            showMessage(registerMessage, '¡Cuenta creada! Revisa tu correo para confirmar.', 'success');
            // Limpiar formulario
            registerFormElement.reset();
            // Cambiar al formulario de login después de 2 segundos
            setTimeout(() => {
                switchForm(loginForm, registerForm);
            }, 2000);
        }
    } catch (error) {
        showMessage(registerMessage, 'Error de conexión. Intenta nuevamente.', 'error');
        console.error('Error de registro:', error);
    }
});

// Manejar cierre de sesión
logoutBtn.addEventListener('click', async () => {
    try {
        const { error } = await auth.signOut();
        
        if (error) {
            console.error('Error al cerrar sesión:', error);
        } else {
            updateAuthUI(null);
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Función para actualizar la UI según el estado de autenticación
function updateAuthUI(user) {
    if (user) {
        // Usuario autenticado
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        userInfo.style.display = 'block';
        userEmailSpan.textContent = user.email;
    } else {
        // Usuario no autenticado
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        userInfo.style.display = 'none';
    }
}

// Verificar estado de autenticación al cargar la página
async function checkAuthStatus() {
    try {
        const { user, error } = await auth.getCurrentUser();
        
        if (error) {
            console.error('Error al verificar autenticación:', error);
            updateAuthUI(null);
        } else {
            updateAuthUI(user);
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        updateAuthUI(null);
    }
}

// Escuchar cambios de autenticación
auth.onAuthStateChange((event, session) => {
    updateAuthUI(session?.user || null);
});

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});
