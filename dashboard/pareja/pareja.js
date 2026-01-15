// Archivo JavaScript para la sección de pareja

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar variables
    let currentUser = null;
    
    // Función para mostrar/ocultar el loading overlay
    function toggleLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (show) {
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // Función para manejar el dropdown del usuario
    function setupUserDropdown() {
        const userDropdown = document.getElementById('user-dropdown-trigger');
        const dropdownMenu = document.getElementById('dropdown-menu');
        
        if (userDropdown && dropdownMenu) {
            userDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
                document.getElementById('user-dropdown').classList.toggle('active');
            });
            
            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', function() {
                document.getElementById('user-dropdown').classList.remove('active');
            });
            
            dropdownMenu.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }
    
    // Función para cargar información del usuario
    async function loadUserInfo() {
        try {
            toggleLoading(true);
            
            // Aquí iría la lógica para obtener la información del usuario desde Supabase
            // Por ahora, usaremos datos de ejemplo
            const userData = {
                name: 'Usuario Ejemplo',
                email: 'usuario@example.com',
                avatar: null
            };
            
            // Actualizar la interfaz con los datos del usuario
            updateUserInterface(userData);
            
        } catch (error) {
            console.error('Error al cargar información del usuario:', error);
        } finally {
            toggleLoading(false);
        }
    }
    
    // Función para actualizar la interfaz con los datos del usuario
    function updateUserInterface(userData) {
        // Actualizar nombre en el header
        const userNameInline = document.getElementById('user-name-inline');
        const dropdownUserName = document.getElementById('dropdown-user-name');
        const dropdownUserEmail = document.getElementById('dropdown-user-email');
        
        if (userNameInline) userNameInline.textContent = userData.name || 'Usuario';
        if (dropdownUserName) dropdownUserName.textContent = userData.name || 'Usuario';
        if (dropdownUserEmail) dropdownUserEmail.textContent = userData.email || 'email@example.com';
        
        // Actualizar avatar
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            if (userData.avatar) {
                userAvatar.src = userData.avatar;
            } else {
                // Mostrar iniciales si no hay avatar
                const initials = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
                userAvatar.style.background = '#667eea';
                userAvatar.style.color = 'white';
                userAvatar.style.display = 'flex';
                userAvatar.style.alignItems = 'center';
                userAvatar.style.justifyContent = 'center';
                userAvatar.style.fontWeight = '600';
                userAvatar.textContent = initials;
            }
        }
    }
    
    // Función para cargar datos financieros de la pareja
    async function loadParejaFinances() {
        try {
            // Aquí iría la lógica para obtener los datos financieros desde Supabase
            // Por ahora, usaremos datos de ejemplo
            const financesData = {
                ingresosConjuntos: 5000.00,
                gastosConjuntos: 3200.00,
                ahorroCompartido: 1800.00
            };
            
            // Actualizar la interfaz con los datos financieros
            updateFinancesDisplay(financesData);
            
        } catch (error) {
            console.error('Error al cargar datos financieros:', error);
        }
    }
    
    // Función para actualizar la visualización de datos financieros
    function updateFinancesDisplay(data) {
        const totalIngresosPareja = document.getElementById('totalIngresosPareja');
        const totalGastosPareja = document.getElementById('totalGastosPareja');
        const ahorroCompartido = document.getElementById('ahorroCompartido');
        
        if (totalIngresosPareja) {
            totalIngresosPareja.textContent = `$${data.ingresosConjuntos.toFixed(2)}`;
        }
        if (totalGastosPareja) {
            totalGastosPareja.textContent = `$${data.gastosConjuntos.toFixed(2)}`;
        }
        if (ahorroCompartido) {
            ahorroCompartido.textContent = `$${data.ahorroCompartido.toFixed(2)}`;
        }
    }
    
    // Función para manejar el logout
    function setupLogout() {
        const logoutBtn = document.getElementById('logout-dropdown');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function() {
                try {
                    // Aquí iría la lógica para cerrar sesión en Supabase
                    // await supabase.auth.signOut();
                    
                    // Redirigir a la página de login
                    window.location.href = '../../iniciosesion/index.html';
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                }
            });
        }
    }
    
    // Función para manejar el botón de editar perfil
    function setupEditProfile() {
        const editProfileBtn = document.getElementById('edit-profile-dropdown');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', function() {
                // Aquí podría abrir un modal o redirigir a una página de edición de perfil
                console.log('Editar perfil');
            });
        }
    }
    
    // Función para configurar los botones de acción
    function setupActionButtons() {
        const primaryBtn = document.querySelector('.action-btn.primary');
        const secondaryBtn = document.querySelector('.action-btn.secondary');
        
        if (primaryBtn) {
            primaryBtn.addEventListener('click', function() {
                // Aquí podría abrir un modal para agregar gasto conjunto
                console.log('Agregar gasto conjunto');
            });
        }
        
        if (secondaryBtn) {
            secondaryBtn.addEventListener('click', function() {
                // Aquí podría redirigir a una página de historial
                console.log('Ver historial');
            });
        }
    }
    
    // Inicializar la aplicación
    async function initializeApp() {
        setupUserDropdown();
        setupLogout();
        setupEditProfile();
        setupActionButtons();
        
        await loadUserInfo();
        await loadParejaFinances();
    }
    
    // Iniciar la aplicación cuando el DOM esté listo
    initializeApp();
});
