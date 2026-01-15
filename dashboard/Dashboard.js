// Importar funciones de Supabase
const { auth } = window.supabase;
const db = window.supabase;

// Variables globales
let currentUser = null;
let userData = null;
let ingresos = [];
let gastos = [];

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

// Elements for financial summary
const balanceTotalEl = document.getElementById('balanceTotal');
const balanceChangeArrowEl = document.getElementById('balanceChangeArrow');
const balanceChangePercentageEl = document.getElementById('balanceChangePercentage');
const totalIngresosEl = document.getElementById('totalIngresos');
const totalGastosEl = document.getElementById('totalGastos');
const userSalaryEl = document.getElementById('userSalary');
const finesDisplayEl = document.getElementById('finesDisplay');

// Elements for edit payment modal
const editPaymentBtn = document.getElementById('edit-payment-btn');
const editPaymentModal = document.getElementById('edit-payment-modal');
const closePaymentModal = document.getElementById('close-payment-modal');
const cancelEditPayment = document.getElementById('cancel-edit-payment');
const editPaymentForm = document.getElementById('edit-payment-form');
const editPaymentType = document.getElementById('edit-payment-type');
const editPaymentAmount = document.getElementById('edit-payment-amount');

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
        console.log('Obteniendo datos del usuario:', currentUser.id); // Debug
        const { data, error } = await db
            .from('usuarios')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        
        if (error) {
            console.error('Error al obtener datos del usuario:', error);
            return null;
        }
        
        console.log('Datos del usuario obtenidos:', data); // Debug
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
    if (welcomeName && userData.nombre_completo) {
        welcomeName.textContent = userData.nombre_completo;
    }
    
    // Actualizar nombre en el header
    if (userNameInline && userData.nombre_completo) {
        userNameInline.textContent = userData.nombre_completo;
    }
    
    // Actualizar dropdown
    if (dropdownUserName && userData.nombre_completo) {
        dropdownUserName.textContent = userData.nombre_completo;
    }
    if (dropdownUserEmail && currentUser.email) {
        dropdownUserEmail.textContent = currentUser.email;
    }
    
    // Actualizar avatar
    if (userAvatar) {
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
    }
    
    // Actualizar fines
    if (userData.tipo_fines) {
        let finesArray = [];
        if (Array.isArray(userData.tipo_fines)) {
            finesArray = userData.tipo_fines;
        } else if (typeof userData.tipo_fines === 'string') {
            finesArray = [userData.tipo_fines];
        }
        
        // Mostrar fines en el mensaje de personalización
        if (finesDisplayEl && finesArray.length > 0) {
            finesDisplayEl.textContent = finesArray.join(', ');
        }
        
        // Actualizar lista de fines existente
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
        if (userSalaryEl) userSalaryEl.textContent = amountText;
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        
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
        const { data: { user }, error } = await supabase.auth.getUser();
        
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

// Función para cargar ingresos del usuario
async function loadIngresos() {
    try {
        console.log('Cargando ingresos para usuario:', currentUser.id); // Debug
        const { data, error } = await db
            .from('ingresos')
            .select('monto, fecha')
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Error en consulta de ingresos:', error);
            throw error;
        }
        ingresos = data || [];
        console.log('Ingresos cargados:', ingresos); // Debug
    } catch (error) {
        console.error('Error cargando ingresos:', error);
        ingresos = [];
    }
}

// Función para cargar gastos del usuario
async function loadGastos() {
    try {
        console.log('Cargando gastos para usuario:', currentUser.id); // Debug
        const { data, error } = await db
            .from('gastos')
            .select('amount, date')
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Error en consulta de gastos:', error);
            throw error;
        }
        gastos = data || [];
        console.log('Gastos cargados:', gastos); // Debug
    } catch (error) {
        console.error('Error cargando gastos:', error);
        gastos = [];
    }
}

// Función para actualizar el resumen financiero
function updateFinancialSummary() {
    console.log('Datos cargados:', { ingresos, gastos, userData }); // Debug
    
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaActual = hoy.toISOString().split('T')[0];

    // Filtrar ingresos del mes actual
    const ingresosMes = ingresos.filter(ingreso => 
        ingreso.fecha >= inicioMes.toISOString().split('T')[0] && 
        ingreso.fecha <= fechaActual
    );

    // Filtrar gastos del mes actual
    const gastosMes = gastos.filter(gasto => 
        gasto.date >= inicioMes.toISOString().split('T')[0] && 
        gasto.date <= fechaActual
    );

    // Calcular totales
    const ingresosRegistros = ingresosMes.reduce((sum, ingreso) => sum + parseFloat(ingreso.monto), 0);
    const sueldoUsuario = userData && userData.monto_pago ? parseFloat(userData.monto_pago) : 0;
    
    // Total de ingresos = sueldo + ingresos registrados
    const totalIngresos = sueldoUsuario + ingresosRegistros;
    
    // Total de gastos
    const totalGastos = gastosMes.reduce((sum, gasto) => sum + parseFloat(gasto.amount), 0);
    
    // Balance = total ingresos - total gastos
    const balance = totalIngresos - totalGastos;

    console.log('Cálculo detallado:', {
        sueldoUsuario,
        ingresosRegistros,
        totalIngresos,
        totalGastos,
        balance,
        formula: `(${sueldoUsuario} + ${ingresosRegistros}) - ${totalGastos} = ${balance}`
    }); // Debug

    // Calcular cambio vs mes anterior
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    
    const ingresosMesAnterior = ingresos.filter(ingreso => {
        const fecha = new Date(ingreso.fecha);
        return fecha >= mesAnterior && fecha <= finMesAnterior;
    });
    const gastosMesAnterior = gastos.filter(gasto => {
        const fecha = new Date(gasto.date);
        return fecha >= mesAnterior && fecha <= finMesAnterior;
    });
    
    const ingresosRegistrosAnterior = ingresosMesAnterior.reduce((sum, ingreso) => sum + parseFloat(ingreso.monto), 0);
    const totalIngresosAnterior = sueldoUsuario + ingresosRegistrosAnterior; // El sueldo es constante
    const totalGastosAnterior = gastosMesAnterior.reduce((sum, gasto) => sum + parseFloat(gasto.amount), 0);
    const balanceAnterior = totalIngresosAnterior - totalGastosAnterior;
    
    let porcentajeCambio = 0;
    let flechaCambio = '↑';
    
    if (balanceAnterior !== 0) {
        porcentajeCambio = ((balance - balanceAnterior) / Math.abs(balanceAnterior)) * 100;
        flechaCambio = balance > balanceAnterior ? '↑' : '↓';
    }

    // Actualizar DOM
    if (balanceTotalEl) {
        balanceTotalEl.textContent = `$${balance.toFixed(2)}`;
    }
    
    if (balanceChangeArrowEl) {
        balanceChangeArrowEl.textContent = flechaCambio;
        balanceChangeArrowEl.style.color = balance > balanceAnterior ? '#28a745' : '#dc3545';
    }
    
    if (balanceChangePercentageEl) {
        balanceChangePercentageEl.textContent = `${Math.abs(porcentajeCambio).toFixed(1)}%`;
        balanceChangePercentageEl.style.color = balance > balanceAnterior ? '#28a745' : '#dc3545';
    }
    
    if (totalIngresosEl) {
        totalIngresosEl.textContent = `$${totalIngresos.toFixed(2)}`;
    }
    
    if (totalGastosEl) {
        totalGastosEl.textContent = `$${totalGastos.toFixed(2)}`;
    }
}

// Función para inicializar el dashboard
async function initDashboard() {
    try {
        // Verificar autenticación
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;
        
        // Obtener datos del usuario y guardarlos en variable global
        userData = await getUserData();
        if (userData) {
            updateUI(userData);
        }
        
        // Cargar datos financieros
        await Promise.all([
            loadIngresos(),
            loadGastos()
        ]);
        
        // Actualizar resumen financiero solo si los elementos existen
        if (balanceTotalEl || totalIngresosEl || totalGastosEl) {
            updateFinancialSummary();
        }
        
        // Ocultar loading
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        showMessage('Error al cargar el dashboard', 'error');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Función para cerrar dropdown
function closeDropdown() {
    document.querySelector('.user-dropdown').classList.remove('active');
}

// Función para abrir modal de edición de pago
function openEditPaymentModal() {
    if (!userData) return;
    
    // Llenar el formulario con datos actuales
    editPaymentType.value = userData.tipo_pago || '';
    editPaymentAmount.value = userData.monto_pago || '';
    
    // Mostrar modal
    editPaymentModal.classList.add('active');
}

// Función para cerrar modal de edición de pago
function closeEditPaymentModal() {
    editPaymentModal.classList.remove('active');
    editPaymentForm.reset();
}

// Función para guardar cambios de pago
async function savePaymentChanges(e) {
    e.preventDefault();
    
    try {
        const newPaymentType = editPaymentType.value;
        const newPaymentAmount = parseFloat(editPaymentAmount.value);
        
        if (!newPaymentType || !newPaymentAmount || newPaymentAmount <= 0) {
            showMessage('Por favor completa todos los campos correctamente', 'error');
            return;
        }
        
        // Actualizar en Supabase
        const { error } = await db
            .from('usuarios')
            .update({
                tipo_pago: newPaymentType,
                monto_pago: newPaymentAmount
            })
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        // Actualizar datos locales
        userData.tipo_pago = newPaymentType;
        userData.monto_pago = newPaymentAmount;
        
        // Actualizar UI
        updateUI(userData);
        updateFinancialSummary();
        
        // Cerrar modal
        closeEditPaymentModal();
        
        showMessage('Datos de pago actualizados correctamente', 'success');
        
    } catch (error) {
        console.error('Error al actualizar datos de pago:', error);
        showMessage('Error al actualizar los datos', 'error');
    }
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

// Event listeners para modal de edición de pago
if (editPaymentBtn) editPaymentBtn.addEventListener('click', openEditPaymentModal);
if (closePaymentModal) closePaymentModal.addEventListener('click', closeEditPaymentModal);
if (cancelEditPayment) cancelEditPayment.addEventListener('click', closeEditPaymentModal);
if (editPaymentForm) editPaymentForm.addEventListener('submit', savePaymentChanges);

// Cerrar modal al hacer clic fuera
if (editPaymentModal) {
    editPaymentModal.addEventListener('click', (e) => {
        if (e.target === editPaymentModal) {
            closeEditPaymentModal();
        }
    });
}

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
                window.location.href = 'http://localhost/PROYECTO%203PARCIAL/dashboard/gastos/gastos.html';
            } else if (linkText === 'Ingresos') {
                window.location.href = 'http://localhost/PROYECTO%203PARCIAL/dashboard/ingresos/ingresos.html';
            } else if (linkText === 'Pareja') {
                window.location.href = 'http://localhost/PROYECTO%203PARCIAL/dashboard/pareja/pareja.html';
            } else if (linkText === 'Negocios') {
                window.location.href = 'http://localhost/PROYECTO%203PARCIAL/dashboard/negocios/negocios.html';
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
