// Importar funciones de Supabase
const auth = window.auth;
const db = window.supabase;

// Variables globales
let currentUser = null;
let userData = null;

// Elementos del DOM
const loadingOverlay = document.getElementById('loading-overlay');
const welcomeName = document.getElementById('welcome-name');
const userAvatar = document.getElementById('user-avatar');

// Elements for user data
const userDropdownTrigger = document.getElementById('user-dropdown-trigger');
const dropdownMenu = document.getElementById('dropdown-menu');
const dropdownUserName = document.getElementById('dropdown-user-name');
const dropdownUserEmail = document.getElementById('dropdown-user-email');
const userNameInline = document.getElementById('user-name-inline');
const editProfileDropdown = document.getElementById('edit-profile-dropdown');
const logoutDropdown = document.getElementById('logout-dropdown');
const finesList = document.getElementById('fines-list');
const paymentType = document.getElementById('payment-type');
const paymentAmount = document.getElementById('payment-amount');

// Función para mostrar mensajes
function showMessage(text, type) {
    // Crear elemento de mensaje temporal
    const messageEl = document.createElement('div');
    messageEl.className = `dashboard-message ${type}`;
    messageEl.textContent = text;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        messageEl.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    } else if (type === 'error') {
        messageEl.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
    } else {
        messageEl.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 300);
    }, 3000);
}

// Función para obtener datos del usuario
async function getUserData() {
    try {
        const { data, error } = await db
            .from('usuarios')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        
        if (error) {
            console.error('Error al obtener datos del usuario:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Función para actualizar UI con datos del usuario
function updateUI(userData) {
    if (!userData) return;
    
    // Actualizar información básica
    welcomeName.textContent = userData.nombre_completo || 'Usuario';
    
    // Actualizar nombre en el header
    if (userNameInline) userNameInline.textContent = userData.nombre_completo || 'Usuario';
    
    // Actualizar dropdown
    dropdownUserName.textContent = userData.nombre_completo || 'Usuario';
    dropdownUserEmail.textContent = currentUser.email;
    
    // Actualizar avatar
    if (userData.foto_perfil) {
        userAvatar.src = userData.foto_perfil;
    } else {
        // Avatar con iniciales
        const initials = (userData.nombre_completo || 'U').split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        userAvatar.src = '';
        userAvatar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        userAvatar.style.color = 'white';
        userAvatar.textContent = initials;
    }
    
    // Actualizar fines
    if (userData.tipo_fines) {
        let finesArray = [];
        if (Array.isArray(userData.tipo_fines)) {
            finesArray = userData.tipo_fines;
        } else if (typeof userData.tipo_fines === 'string') {
            finesArray = [userData.tipo_fines];
        }
        
        // Limpiar y actualizar lista de fines
        if (finesList) {
            finesList.innerHTML = '';
            finesArray.forEach(fine => {
                const tag = document.createElement('span');
                tag.className = 'fine-tag';
                tag.textContent = fine;
                finesList.appendChild(tag);
            });
        }
    }
    
    // Actualizar información de pago
    if (userData.tipo_pago) {
        const paymentTypes = {
            'mensual': 'Mensual',
            'quincenal': 'Quincenal',
            'semestral': 'Semestral',
            'anual': 'Anual'
        };
        const paymentText = paymentTypes[userData.tipo_pago] || userData.tipo_pago;
        if (paymentType) paymentType.textContent = paymentText;
    }
    
    if (userData.monto_pago) {
        const amountText = `$${parseFloat(userData.monto_pago).toFixed(2)}`;
        if (paymentAmount) paymentAmount.textContent = amountText;
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        const { error } = await auth.signOut();
        
        if (error) {
            console.error('Error al cerrar sesión:', error);
            showMessage('Error al cerrar sesión', 'error');
        } else {
            showMessage('Sesión cerrada correctamente', 'success');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showMessage('Error de conexión', 'error');
    }
}

// Función para editar perfil
function editProfile() {
    window.location.href = '../recopilaciondatosusuario/datosdeusuario.html';
}

// Función para verificar autenticación
async function checkAuth() {
    try {
        const { user, error } = await auth.getCurrentUser();
        
        if (error || !user) {
            showMessage('No hay sesión activa. Redirigiendo...', 'error');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return false;
        }
        
        currentUser = user;
        
        // Verificar si el usuario tiene perfil completo
        const hasCompleteProfile = await checkUserProfile(user);
        
        if (!hasCompleteProfile) {
            showMessage('Por favor completa tu perfil primero', 'info');
            setTimeout(() => {
                window.location.href = '../recopilaciondatosusuario/datosdeusuario.html';
            }, 2000);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        showMessage('Error de autenticación', 'error');
        return false;
    }
}

// Función para verificar si el usuario tiene perfil completo
async function checkUserProfile(user) {
    try {
        const { data, error } = await db
            .from('usuarios')
            .select('nombre_completo, tipo_fines, tipo_pago, monto_pago')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (error) {
            console.error('Error al verificar perfil:', error);
            return false;
        }
        
        // Verificar que tenga los campos necesarios
        if (!data) return false;
        
        const hasName = !!data.nombre_completo && data.nombre_completo.trim() !== '';
        const hasFines = !!data.tipo_fines && (
            (Array.isArray(data.tipo_fines) && data.tipo_fines.length > 0) ||
            (typeof data.tipo_fines === 'string' && data.tipo_fines.trim() !== '')
        );
        const hasPayment = !!data.tipo_pago && ['mensual', 'quincenal', 'semestral', 'anual'].includes(data.tipo_pago);
        const hasAmount = !!data.monto_pago && parseFloat(data.monto_pago) > 0;
        
        return hasName && hasFines && hasPayment && hasAmount;
    } catch (error) {
        console.error('Error al verificar perfil:', error);
        return false;
    }
}

// Función para inicializar el dashboard
async function initDashboard() {
    try {
        // Ocultar loading
        loadingOverlay.style.display = 'none';
        
        // Verificar autenticación
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;
        
        // Obtener datos del usuario
        userData = await getUserData();
        
        if (userData) {
            updateUI(userData);
        } else {
            // Si no hay datos, mostrar error (no debería pasar si checkAuth funcionó)
            showMessage('Error al cargar datos del usuario', 'error');
        }
        
    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        showMessage('Error al cargar el dashboard', 'error');
        loadingOverlay.style.display = 'none';
    }
}

// Función para cerrar dropdown
function closeDropdown() {
    document.querySelector('.user-dropdown').classList.remove('active');
}

// Función para toggle dropdown
function toggleDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    dropdown.classList.toggle('active');
}

// Event listeners para navegación
if (userDropdownTrigger) userDropdownTrigger.addEventListener('click', toggleDropdown);
if (editProfileDropdown) editProfileDropdown.addEventListener('click', editProfile);
if (logoutDropdown) logoutDropdown.addEventListener('click', logout);

// Event listeners para navegación del sidebar
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover clase active de todos los items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Agregar clase active al item clickeado
            link.closest('.nav-item').classList.add('active');
            
            // Navegación
            const linkText = link.querySelector('span').textContent;
            console.log(`Navegando a: ${linkText}`);
            
            if (linkText === 'Gastos') {
                window.location.href = 'gastos/gastos.html';
            }
        });
    });
});

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-dropdown')) {
        closeDropdown();
    }
});

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .dashboard-message {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;
document.head.appendChild(style);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initDashboard);
