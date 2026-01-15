// Importar funciones de Supabase
const auth = window.auth;
const db = window.supabase;

// Variables globales
let currentUser = null;
let expenses = [];

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

// Elements for expenses
const totalMes = document.getElementById('total-mes');
const gastosHoy = document.getElementById('gastos-hoy');
const gastosSemana = document.getElementById('gastos-semana');
const tendencia = document.getElementById('tendencia');
const expenseAmount = document.getElementById('expense-amount');
const expenseCategory = document.getElementById('expense-category');
const expenseDate = document.getElementById('expense-date');
const expenseDescription = document.getElementById('expense-description');
const addExpenseBtn = document.getElementById('add-expense-btn');
const clearFormBtn = document.getElementById('clear-form-btn');
const expensesList = document.getElementById('expenses-list');

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
        const { error } = await auth.signOut();
        
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

// Función para verificar autenticación
async function checkAuth() {
    try {
        const { user, error } = await auth.getCurrentUser();
        
        if (error || !user) {
            showMessage('No hay sesión activa. Redirigiendo...', 'error');
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 2000);
            return false;
        }
        
        currentUser = user;
        
        // Verificar si el usuario tiene perfil completo
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

// Función para obtener gastos del usuario
async function getExpenses() {
    try {
        const { data, error } = await db
            .from('gastos')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error al obtener gastos:', error);
            showMessage('Error al cargar gastos', 'error');
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
        return [];
    }
}

// Función para agregar un nuevo gasto (CREATE)
async function addExpense(expenseData) {
    try {
        // Asegurar que la fecha sea válida para la zona horaria local
        const dateToUse = expenseData.date || new Date().toISOString().split('T')[0];
        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        const todayString = localDate.toISOString().split('T')[0];
        
        // Si la fecha es futura, usar la fecha actual
        const expenseDateToSave = new Date(dateToUse) > localDate ? todayString : dateToUse;
        
        const { data, error } = await db
            .from('gastos')
            .insert([{
                ...expenseData,
                user_id: currentUser.id,
                date: expenseDateToSave
            }])
            .select();
        
        if (error) {
            console.error('Error al agregar gasto:', error);
            showMessage('Error al agregar gasto: ' + error.message, 'error');
            return null;
        }
        
        showMessage('Gasto agregado exitosamente', 'success');
        return data[0];
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
        return null;
    }
}

// Función para actualizar un gasto existente (UPDATE)
async function updateExpense(expenseId, expenseData) {
    try {
        // Asegurar que la fecha sea válida para la zona horaria local
        const dateToUse = expenseData.date || new Date().toISOString().split('T')[0];
        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        const todayString = localDate.toISOString().split('T')[0];
        
        // Si la fecha es futura, usar la fecha actual
        const expenseDateToSave = new Date(dateToUse) > localDate ? todayString : dateToUse;
        
        const { data, error } = await db
            .from('gastos')
            .update({
                ...expenseData,
                date: expenseDateToSave,
                updated_at: new Date().toISOString()
            })
            .eq('id', expenseId)
            .eq('user_id', currentUser.id)
            .select();
        
        if (error) {
            console.error('Error al actualizar gasto:', error);
            showMessage('Error al actualizar gasto: ' + error.message, 'error');
            return null;
        }
        
        showMessage('Gasto actualizado exitosamente', 'success');
        return data[0];
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
        return null;
    }
}

// Función para eliminar un gasto (DELETE)
async function deleteExpense(expenseId) {
    try {
        const { error } = await db
            .from('gastos')
            .delete()
            .eq('id', expenseId)
            .eq('user_id', currentUser.id);
        
        if (error) {
            console.error('Error al eliminar gasto:', error);
            showMessage('Error al eliminar gasto: ' + error.message, 'error');
            return false;
        }
        
        showMessage('Gasto eliminado exitosamente', 'success');
        return true;
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
        return false;
    }
}

// Función para obtener estadísticas usando las funciones de Supabase
async function getExpensesStats() {
    try {
        // Obtener estadísticas del mes actual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        
        const { data: stats, error: statsError } = await db
            .rpc('get_user_expenses_stats', {
                p_user_id: currentUser.id,
                p_start_date: startOfMonth.toISOString().split('T')[0],
                p_end_date: endOfMonth.toISOString().split('T')[0]
            });
        
        if (statsError) {
            console.error('Error al obtener estadísticas:', statsError);
            return null;
        }
        
        return stats[0];
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Función para calcular estadísticas con manejo mejorado de fechas
function calculateStatistics(expensesData) {
    const now = new Date();
    // Ajustar para zona horaria local
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    today.setHours(0, 0, 0, 0); // Inicio del día
    
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Gastos de hoy (usando la fecha del gasto, no created_at)
    const todayExpenses = expensesData.filter(expense => {
        const expenseDate = new Date(expense.date + 'T00:00:00');
        return expenseDate.toDateString() === today.toDateString();
    });
    
    // Gastos del mes actual (usando la fecha del gasto)
    const currentMonthExpenses = expensesData.filter(expense => {
        const expenseDate = new Date(expense.date + 'T00:00:00');
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
    
    // Gastos del mes anterior (usando la fecha del gasto)
    const lastMonthExpenses = expensesData.filter(expense => {
        const expenseDate = new Date(expense.date + 'T00:00:00');
        return expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === lastMonthYear;
    });
    
    // Gastos de esta semana
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const thisWeekExpenses = expensesData.filter(expense => {
        const expenseDate = new Date(expense.date + 'T00:00:00');
        return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
    });
    
    // Gastos de la semana pasada
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(endOfWeek);
    endOfLastWeek.setDate(endOfWeek.getDate() - 7);
    
    const lastWeekExpenses = expensesData.filter(expense => {
        const expenseDate = new Date(expense.date + 'T00:00:00');
        return expenseDate >= startOfLastWeek && expenseDate <= endOfLastWeek;
    });
    
    // Calcular totales
    const todayTotal = todayExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const currentMonthTotal = currentMonthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const thisWeekTotal = thisWeekExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const lastWeekTotal = lastWeekExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
    // Calcular tendencia mensual
    let monthlyTrendPercentage = 0;
    let monthlyTrendClass = 'positive';
    
    if (lastMonthTotal > 0) {
        monthlyTrendPercentage = ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
        monthlyTrendClass = monthlyTrendPercentage >= 0 ? 'positive' : 'negative';
    } else if (currentMonthTotal > 0) {
        monthlyTrendPercentage = 100;
        monthlyTrendClass = 'positive';
    }
    
    // Calcular tendencia semanal
    let weeklyTrendPercentage = 0;
    let weeklyTrendClass = 'positive';
    
    if (lastWeekTotal > 0) {
        weeklyTrendPercentage = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
        weeklyTrendClass = weeklyTrendPercentage >= 0 ? 'positive' : 'negative';
    } else if (thisWeekTotal > 0) {
        weeklyTrendPercentage = 100;
        weeklyTrendClass = 'positive';
    }
    
    return {
        todayTotal,
        currentMonthTotal,
        lastMonthTotal,
        thisWeekTotal,
        lastWeekTotal,
        monthlyTrendPercentage,
        monthlyTrendClass,
        weeklyTrendPercentage,
        weeklyTrendClass,
        todayExpenseCount: todayExpenses.length,
        currentMonthExpenseCount: currentMonthExpenses.length,
        thisWeekExpenseCount: thisWeekExpenses.length
    };
}

// Función para obtener rango de fechas para análisis
function getDateRange(period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate;
    
    switch (period) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay());
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'last_month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        default:
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            endDate.setHours(23, 59, 59, 999);
    }
    
    return { startDate, endDate };
}

// Función para filtrar gastos por rango de fechas
function filterExpensesByDateRange(expensesData, startDate, endDate) {
    return expensesData.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
    });
}

// Función para obtener gastos por período
async function getExpensesByPeriod(period = 'month') {
    try {
        const { startDate, endDate } = getDateRange(period);
        
        const { data, error } = await db
            .from('gastos')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: false });
        
        if (error) {
            console.error('Error al obtener gastos por período:', error);
            showMessage('Error al cargar gastos', 'error');
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
        return [];
    }
}

// Función para obtener gastos por rango de fechas personalizado
async function getExpensesByCustomDateRange(startDate, endDate) {
    try {
        const { data, error } = await db
            .from('gastos')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });
        
        if (error) {
            console.error('Error al obtener gastos por rango:', error);
            showMessage('Error al cargar gastos', 'error');
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
        return [];
    }
}

// Función para formatear fecha para mostrar
function formatDateForDisplay(dateString) {
    // Crear fecha considerando la zona horaria local para evitar desfase
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Función para formatear fecha para input
function formatDateForInput(dateString) {
    // Crear fecha considerando la zona horaria local para evitar desfase
    const date = new Date(dateString + 'T00:00:00');
    return date.toISOString().split('T')[0];
}

// Función para obtener el primer día del mes actual
function getFirstDayOfMonth() {
    const today = new Date();
    // Ajustar para zona horaria local
    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    return new Date(localDate.getFullYear(), localDate.getMonth(), 1).toISOString().split('T')[0];
}

// Función para obtener el último día del mes actual
function getLastDayOfMonth() {
    const today = new Date();
    // Ajustar para zona horaria local
    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    return new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0).toISOString().split('T')[0];
}

// Función para actualizar estadísticas
function updateStatistics(stats) {
    if (totalMes) totalMes.textContent = `$${stats.currentMonthTotal.toFixed(2)}`;
    if (gastosHoy) gastosHoy.textContent = `$${stats.todayTotal.toFixed(2)}`;
    if (gastosSemana) gastosSemana.textContent = `$${stats.thisWeekTotal.toFixed(2)}`;
    
    if (tendencia) {
        const trendText = stats.monthlyTrendPercentage >= 0 ? `+${stats.monthlyTrendPercentage.toFixed(1)}%` : `${stats.monthlyTrendPercentage.toFixed(1)}%`;
        tendencia.textContent = trendText;
        tendencia.className = `trend-value ${stats.monthlyTrendClass}`;
    }
}

// Función para renderizar gastos con acciones CRUD
function renderExpenses(expensesData) {
    if (!expensesList) return;
    
    if (expensesData.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <p>No hay gastos registrados</p>
                <span>Agrega tu primer gasto para comenzar</span>
            </div>
        `;
        return;
    }
    
    // Ordenar gastos por fecha (más reciente primero)
    const sortedExpenses = [...expensesData].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    expensesList.innerHTML = sortedExpenses.map(expense => `
        <div class="expense-item" data-expense-id="${expense.id}">
            <div class="expense-info">
                <div class="expense-amount">$${parseFloat(expense.amount).toFixed(2)}</div>
                <div class="expense-description">${expense.description || 'Sin descripción'}</div>
                <span class="expense-category">${expense.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
            <div class="expense-actions">
                <div class="expense-date">
                    ${formatDateForDisplay(expense.date)}
                </div>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editExpense('${expense.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="btn-delete" onclick="deleteExpenseById('${expense.id}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Función para editar un gasto
async function editExpense(expenseId) {
    try {
        // Obtener el gasto a editar
        const { data: expense, error } = await db
            .from('gastos')
            .select('*')
            .eq('id', expenseId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (error) {
            console.error('Error al obtener gasto:', error);
            showMessage('Error al cargar gasto para editar', 'error');
            return;
        }
        
        // Llenar el formulario con los datos del gasto
        if (expenseAmount) expenseAmount.value = expense.amount;
        if (expenseCategory) expenseCategory.value = expense.category;
        if (expenseDate) expenseDate.value = expense.date;
        if (expenseDescription) expenseDescription.value = expense.description;
        
        // Cambiar el texto del botón
        if (addExpenseBtn) {
            addExpenseBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
                Actualizar Gasto
            `;
            addExpenseBtn.onclick = () => updateExpenseById(expenseId);
        }
        
        // Scroll al formulario
        document.querySelector('.add-expense-section').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión', 'error');
    }
}

// Función para actualizar un gasto existente
async function updateExpenseById(expenseId) {
    if (!validateForm()) return;
    
    const expenseData = {
        amount: parseFloat(expenseAmount.value),
        category: expenseCategory.value,
        date: expenseDate.value,
        description: expenseDescription.value.trim()
    };
    
    const updatedExpense = await updateExpense(expenseId, expenseData);
    
    if (updatedExpense) {
        // Actualizar la lista local
        const index = expenses.findIndex(exp => exp.id === expenseId);
        if (index !== -1) {
            expenses[index] = updatedExpense;
        }
        
        // Actualizar UI
        const stats = calculateStatistics(expenses);
        updateStatistics(stats);
        renderExpenses(expenses);
        
        // Resetear el formulario
        resetForm();
    }
}

// Función para eliminar un gasto por ID
async function deleteExpenseById(expenseId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
        return;
    }
    
    const success = await deleteExpense(expenseId);
    
    if (success) {
        // Eliminar de la lista local
        expenses = expenses.filter(exp => exp.id !== expenseId);
        
        // Actualizar UI
        const stats = calculateStatistics(expenses);
        updateStatistics(stats);
        renderExpenses(expenses);
    }
}

// Función para resetear el formulario al estado original
function resetForm() {
    clearForm();
    
    // Resetear el botón de agregar
    if (addExpenseBtn) {
        addExpenseBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Agregar Gasto
        `;
        addExpenseBtn.onclick = () => handleAddExpense();
    }
}

// Función para manejar el agregado de gastos
async function handleAddExpense() {
    if (!validateForm()) return;
    
    const expenseData = {
        amount: parseFloat(expenseAmount.value),
        category: expenseCategory.value,
        date: expenseDate.value,
        description: expenseDescription.value.trim()
    };
    
    const newExpense = await addExpense(expenseData);
    
    if (newExpense) {
        // Agregar a la lista local
        expenses.unshift(newExpense);
        
        // Actualizar UI
        const stats = calculateStatistics(expenses);
        updateStatistics(stats);
        renderExpenses(expenses);
        
        // Limpiar formulario
        clearForm();
    }
}

// Función para limpiar formulario
function clearForm() {
    if (expenseAmount) expenseAmount.value = '';
    if (expenseCategory) expenseCategory.value = '';
    if (expenseDate) expenseDate.value = '';
    if (expenseDescription) expenseDescription.value = '';
}

// Función para validar formulario
function validateForm() {
    const amount = parseFloat(expenseAmount?.value);
    const category = expenseCategory?.value;
    const date = expenseDate?.value;
    const description = expenseDescription?.value;
    
    if (!amount || amount <= 0) {
        showMessage('Por favor ingresa un monto válido', 'error');
        return false;
    }
    
    if (!category) {
        showMessage('Por favor selecciona una categoría', 'error');
        return false;
    }
    
    if (!date) {
        showMessage('Por favor selecciona una fecha', 'error');
        return false;
    }
    
    // Validación de fecha: permitir solo fechas pasadas o el día actual (considerando zona horaria local)
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    const todayString = localDate.toISOString().split('T')[0];
    const selectedDate = new Date(date + 'T23:59:59');
    const todayDate = new Date(todayString + 'T23:59:59');
    
    if (selectedDate > todayDate) {
        showMessage('No se pueden registrar gastos con fechas futuras', 'error');
        return false;
    }
    
    if (!description || description.trim() === '') {
        showMessage('Por favor ingresa una descripción', 'error');
        return false;
    }
    
    return true;
}

// Función para inicializar el dashboard de gastos
async function initGastosDashboard() {
    try {
        // Ocultar loading
        loadingOverlay.style.display = 'none';
        
        // Verificar autenticación
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;
        
        // Obtener datos del usuario
        const userData = await getUserData();
        if (userData) {
            updateUI(userData);
        }
        
        // Obtener gastos
        expenses = await getExpenses();
        
        // Calcular y mostrar estadísticas mejoradas
        const stats = calculateStatistics(expenses);
        updateStatistics(stats);
        
        // Renderizar gastos con ordenamiento por fecha
        renderExpenses(expenses);
        
        // Establecer fecha actual por defecto (considerando zona horaria local)
        if (expenseDate) {
            const now = new Date();
            // Ajustar para evitar problemas de zona horaria
            const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
            expenseDate.value = localDate.toISOString().split('T')[0];
        }
        
        // Agregar validación de fecha (no permitir fechas futuras, pero sí permitir hoy)
        if (expenseDate) {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            
            // Permitir hasta el día actual, pero no fechas futuras
            expenseDate.max = todayString;
            
            // Agregar evento para validar fecha
            expenseDate.addEventListener('change', function() {
                const selectedDate = new Date(this.value + 'T23:59:59');
                const todayDate = new Date(todayString + 'T23:59:59');
                
                // Permitir el día actual y fechas pasadas, pero no futuras
                if (selectedDate > todayDate) {
                    showMessage('No se pueden registrar gastos con fechas futuras', 'error');
                    this.value = todayString;
                }
            });
        }
        
    } catch (error) {
        console.error('Error al inicializar dashboard de gastos:', error);
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
            
            if (linkText === 'Dashboard') {
                window.location.href = '../../dashboard/Dashboard.html';
            }
        });
    });
});

// Event listeners para formulario de gastos
if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', handleAddExpense);
}

if (clearFormBtn) {
    clearFormBtn.addEventListener('click', resetForm);
}

// Hacer la variable expenses global para que el script inline pueda accederla
window.expenses = expenses;
window.editExpense = editExpense;
window.deleteExpenseById = deleteExpenseById;

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
document.addEventListener('DOMContentLoaded', initGastosDashboard);
