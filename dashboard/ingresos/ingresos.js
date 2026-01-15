// Importar funciones de Supabase
const { auth } = window.supabase;
const db = window.supabase;

// Variables globales
let currentUser = null;
let ingresos = [];

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

// Elementos del formulario de ingresos
const incomeForm = {
    amount: document.getElementById('income-amount'),
    category: document.getElementById('income-category'),
    date: document.getElementById('income-date'),
    description: document.getElementById('income-description'),
    addBtn: document.getElementById('add-income-btn'),
    clearBtn: document.getElementById('clear-form-btn')
};

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
    
    // Actualizar dropdown
    dropdownUserName.textContent = userData.nombre_completo || 'Usuario';
    dropdownUserEmail.textContent = currentUser.email;
    
    // Actualizar nombre en el header
    if (userNameInline) userNameInline.textContent = userData.nombre_completo || 'Usuario';
    
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
                window.location.href = '../../index.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showMessage('Error de conexión', 'error');
    }
}

// Función para editar perfil
function editProfile() {
    window.location.href = '../../recopilaciondatosusuario/datosdeusuario.html';
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

// Función para cargar ingresos
async function loadIngresos() {
    try {
        const { data, error } = await db
            .from('ingresos')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('fecha', { ascending: false })
            .order('creado_en', { ascending: false });

        if (error) throw error;
        ingresos = data || [];
        renderIngresos();
        updateSummaryCards();
    } catch (error) {
        console.error('Error cargando ingresos:', error);
        showMessage('Error al cargar los ingresos', 'error');
    }
}

// Función para agregar ingreso
async function addIncome() {
    const monto = incomeForm.amount.value;
    const categoria = incomeForm.category.value;
    const fecha = incomeForm.date.value;
    const descripcion = incomeForm.description.value;

    // Validaciones
    if (!monto || parseFloat(monto) <= 0) {
        showMessage('Por favor ingresa un monto válido', 'error');
        return;
    }

    if (!categoria) {
        showMessage('Por favor selecciona una categoría', 'error');
        return;
    }

    if (!fecha) {
        showMessage('Por favor selecciona una fecha', 'error');
        return;
    }

    try {
        const nuevoIngreso = {
            user_id: currentUser.id,
            monto: parseFloat(monto),
            categoria: categoria,
            fecha: fecha, // Mantener la fecha exacta como el usuario la seleccionó
            descripcion: descripcion || null
        };

        const { data, error } = await db
            .from('ingresos')
            .insert([nuevoIngreso])
            .select();

        if (error) throw error;

        ingresos.unshift(data[0]);
        renderIngresos();
        updateSummaryCards();
        clearIncomeForm();
        showMessage('Ingreso agregado exitosamente', 'success');
    } catch (error) {
        console.error('Error agregando ingreso:', error);
        showMessage('Error al agregar el ingreso', 'error');
    }
}

// Función para eliminar ingreso
async function deleteIncome(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este ingreso?')) {
        return;
    }

    try {
        const { error } = await db
            .from('ingresos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        ingresos = ingresos.filter(ingreso => ingreso.id !== id);
        renderIngresos();
        updateSummaryCards();
        showMessage('Ingreso eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error eliminando ingreso:', error);
        showMessage('Error al eliminar el ingreso', 'error');
    }
}

// Función para editar ingreso
async function editIncome(id) {
    const ingreso = ingresos.find(i => i.id === id);
    if (!ingreso) return;

    incomeForm.amount.value = ingreso.monto;
    incomeForm.category.value = ingreso.categoria;
    incomeForm.date.value = ingreso.fecha;
    incomeForm.description.value = ingreso.descripcion || '';

    await deleteIncome(id);
    
    document.querySelector('.add-income-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Función para renderizar ingresos
function renderIngresos() {
    const container = document.getElementById('income-list');
    
    if (ingresos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <p>No hay ingresos registrados</p>
                <span>Agrega tu primer ingreso para comenzar</span>
            </div>
        `;
        return;
    }

    container.innerHTML = ingresos.map(ingreso => `
        <div class="income-item">
            <div class="income-info">
                <div class="income-amount">+$${ingreso.monto.toFixed(2)}</div>
                <div class="income-description">${ingreso.descripcion || 'Sin descripción'}</div>
                <div class="income-category">${formatCategoria(ingreso.categoria)}</div>
            </div>
            <div class="income-actions">
                <div class="income-date">${formatDate(ingreso.fecha)}</div>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editIncome('${ingreso.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="btn-delete" onclick="deleteIncome('${ingreso.id}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Función para actualizar tarjetas de resumen
function updateSummaryCards() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    // Función para comparar fechas sin conversión de zona horaria
    const isSameDate = (dateString1, dateString2) => {
        return dateString1 === dateString2;
    };

    const ingresosHoy = ingresos.filter(i => 
        isSameDate(i.fecha, hoy.toISOString().split('T')[0])
    );
    const ingresosMes = ingresos.filter(i => 
        i.fecha >= inicioMes.toISOString().split('T')[0]
    );
    const ingresosSemana = ingresos.filter(i => 
        i.fecha >= inicioSemana.toISOString().split('T')[0]
    );

    const totalHoy = ingresosHoy.reduce((sum, i) => sum + i.monto, 0);
    const totalMes = ingresosMes.reduce((sum, i) => sum + i.monto, 0);
    const totalSemana = ingresosSemana.reduce((sum, i) => sum + i.monto, 0);

    // Calcular tendencia vs mes anterior
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const ingresosMesAnterior = ingresos.filter(i => {
        const fecha = new Date(i.fecha);
        return fecha >= mesAnterior && fecha <= finMesAnterior;
    });
    const totalMesAnterior = ingresosMesAnterior.reduce((sum, i) => sum + i.monto, 0);
    
    let tendencia = 0;
    if (totalMesAnterior > 0) {
        tendencia = ((totalMes - totalMesAnterior) / totalMesAnterior) * 100;
    }

    // Actualizar DOM
    document.getElementById('ingresos-hoy').textContent = `$${totalHoy.toFixed(2)}`;
    document.getElementById('total-mes-ingresos').textContent = `$${totalMes.toFixed(2)}`;
    document.getElementById('ingresos-semana').textContent = `$${totalSemana.toFixed(2)}`;
    
    const tendenciaElement = document.getElementById('tendencia-ingresos');
    tendenciaElement.textContent = `${tendencia >= 0 ? '+' : ''}${tendencia.toFixed(1)}%`;
    tendenciaElement.className = `trend-value ${tendencia >= 0 ? 'positive' : 'negative'}`;
}

// Función para limpiar formulario
function clearIncomeForm() {
    incomeForm.amount.value = '';
    incomeForm.category.value = '';
    incomeForm.date.value = '';
    incomeForm.description.value = '';
}

// Funciones de utilidad
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    // Si es un string de fecha YYYY-MM-DD, crear fecha local
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', options);
}

function formatCategoria(categoria) {
    return categoria.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Función para verificar autenticación
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            showMessage('No hay sesión activa. Redirigiendo...', 'error');
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 2000);
            return false;
        }
        
        currentUser = user;
        
        const hasCompleteProfile = await checkUserProfile(user);
        
        if (!hasCompleteProfile) {
            showMessage('Por favor completa tu perfil primero', 'info');
            setTimeout(() => {
                window.location.href = '../../recopilaciondatosusuario/datosdeusuario.html';
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

// Función para mostrar ingresos de hoy
function showTodayIncomeModal() {
    const hoy = new Date().toISOString().split('T')[0];
    const ingresosHoy = ingresos.filter(i => i.fecha === hoy);

    if (ingresosHoy.length === 0) {
        showMessage('No hay ingresos registrados hoy', 'info');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Ingresos de Hoy</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="today-expenses-list">
                    ${ingresosHoy.map(ingreso => `
                        <div class="today-expense-item">
                            <div class="today-expense-info">
                                <div class="today-expense-amount">+$${ingreso.monto.toFixed(2)}</div>
                                <div class="today-expense-description">${ingreso.descripcion || 'Sin descripción'}</div>
                                <div class="today-expense-category">${formatCategoria(ingreso.categoria)}</div>
                            </div>
                            <div class="today-expense-time">${new Date(ingreso.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <div class="modal-summary">
                    <div class="summary-item">
                        <span class="summary-label">Total</span>
                        <span class="summary-amount">$${ingresosHoy.reduce((sum, i) => sum + i.monto, 0).toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Cantidad</span>
                        <span class="summary-count">${ingresosHoy.length}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para inicializar el dashboard de ingresos
async function initIngresosDashboard() {
    try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;
        
        const userData = await getUserData();
        if (userData) {
            updateUI(userData);
        }
        
        // Establecer fecha por defecto
        incomeForm.date.value = new Date().toISOString().split('T')[0];
        
        // Cargar ingresos
        await loadIngresos();
        
        loadingOverlay.style.display = 'none';
        
    } catch (error) {
        console.error('Error al inicializar dashboard de ingresos:', error);
        showMessage('Error al cargar el dashboard', 'error');
        loadingOverlay.style.display = 'none';
    }
}

// Event listeners
if (incomeForm.addBtn) incomeForm.addBtn.addEventListener('click', addIncome);
if (incomeForm.clearBtn) incomeForm.clearBtn.addEventListener('click', clearIncomeForm);
if (incomeForm.amount) incomeForm.amount.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addIncome();
});
if (incomeForm.description) incomeForm.description.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addIncome();
});

if (userDropdownTrigger) userDropdownTrigger.addEventListener('click', () => {
    const dropdown = document.querySelector('.user-dropdown');
    dropdown.classList.toggle('active');
});

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
            const linkText = link.querySelector('span').textContent.trim();
            console.log(`Navegando a: ${linkText}`);
            console.log(`Link href: ${link.href}`);
            
            if (linkText.trim() === 'Dashboard') {
                console.log('Redirigiendo a Dashboard');
                window.location.href = '../Dashboard.html';
            } else if (linkText.trim() === 'Gastos') {
                console.log('Redirigiendo a Gastos');
                window.location.href = '../gastos/gastos.html';
            } else if (linkText.trim() === 'Pareja') {
                console.log('Redirigiendo a Pareja');
                window.location.href = 'http://localhost/PROYECTO%203PARCIAL/dashboard/pareja/pareja.html';
            } else {
                console.log('No se encontró coincidencia para:', `"${linkText}"`);
                console.log('Longitud del texto:', linkText.length);
                console.log('Código de caracteres:', Array.from(linkText).map(c => c.charCodeAt(0)));
            }
        });
    });
});

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-dropdown')) {
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) dropdown.classList.remove('active');
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
document.addEventListener('DOMContentLoaded', initIngresosDashboard);
