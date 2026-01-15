// Sistema de Finanzas para Parejas con Supabase
class FinanzasPareja {
    constructor() {
        this.configuracion = {
            nombreUsuario: '',
            nombrePareja: '',
            ingresosUsuario: 0,
            ingresosPareja: 0
        };
        this.gastos = [];
        this.ingresos = []; // Agregar propiedad para ingresos
        this.currentUser = null;
        this.configuracionId = null;
        
        // Variables para gráficas
        this.ingresosChart = null;
        this.gastosChart = null;
        this.divisionChart = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando aplicación de finanzas de pareja...');
            
            // Esperar a que el DOM esté listo
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            await this.verificarAutenticacion();
            await this.cargarConfiguracion();
            this.setupEventListeners();
            this.inicializarGraficas();
            this.actualizarInterfaz();
            
            // Forzar actualización del preview de gastos después de cargar datos
            setTimeout(() => {
                this.actualizarPreviewGasto();
            }, 100);
            
            this.ocultarLoading();
            
            console.log('✅ Aplicación de finanzas de pareja inicializada correctamente');
        } catch (error) {
            console.error('Error initializing FinanzasPareja:', error);
            this.ocultarLoading();
            this.mostrarNotificación('Error al inicializar la aplicación', 'error');
        }
    }

    async verificarAutenticacion() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                this.mostrarNotificación('Debes iniciar sesión para usar esta aplicación', 'warning');
                // Redirigir a login o mostrar modal de login
                setTimeout(() => {
                    window.location.href = '../../iniciosesion/index.html';
                }, 2000);
                return;
            }
            this.currentUser = user;
            await this.cargarInfoUsuario();
            this.setupUserDropdown();
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            this.mostrarNotificación('Error de autenticación', 'error');
        }
    }

    async cargarInfoUsuario() {
        try {
            // Usar directamente los datos de auth metadata
            this.actualizarUIUsuario({
                nombre: this.currentUser.user_metadata?.nombre || this.currentUser.email?.split('@')[0] || 'Usuario',
                email: this.currentUser.email,
                avatar_url: this.currentUser.user_metadata?.avatar_url || null
            });
        } catch (error) {
            console.error('Error cargando info usuario:', error);
            // Usar datos básicos de auth como fallback
            this.actualizarUIUsuario({
                nombre: this.currentUser.user_metadata?.nombre || this.currentUser.email?.split('@')[0] || 'Usuario',
                email: this.currentUser.email,
                avatar_url: this.currentUser.user_metadata?.avatar_url || null
            });
        }
    }

    actualizarUIUsuario(userData) {
        // Actualizar nombre en línea
        const userNameInline = document.getElementById('user-name-inline');
        if (userNameInline) userNameInline.textContent = userData.nombre;

        // Actualizar nombre en dropdown
        const dropdownUserName = document.getElementById('dropdown-user-name');
        if (dropdownUserName) dropdownUserName.textContent = userData.nombre;

        // Actualizar email en dropdown
        const dropdownUserEmail = document.getElementById('dropdown-user-email');
        if (dropdownUserEmail) dropdownUserEmail.textContent = userData.email;

        // Actualizar avatar
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            if (userData.avatar_url && userData.avatar_url.trim() !== '') {
                // Usar avatar personalizado
                userAvatar.src = userData.avatar_url;
                console.log('✅ Usando avatar personalizado:', userData.avatar_url);
            } else {
                // Usar avatar por defecto con iniciales
                const iniciales = userData.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nombre)}&background=6366f1&color=fff&size=40`;
                console.log('✅ Usando avatar por defecto con iniciales:', userData.nombre);
            }
            userAvatar.style.display = 'block';
            
            // Manejo de errores de carga
            userAvatar.onerror = function() {
                console.log('⚠️ Avatar no cargó, usando fallback');
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nombre)}&background=6366f1&color=fff&size=40`;
            };
        }
    }

    setupUserDropdown() {
        const dropdownTrigger = document.getElementById('user-dropdown-trigger');
        const dropdownMenu = document.getElementById('dropdown-menu');
        const editProfileBtn = document.getElementById('edit-profile-dropdown');
        const logoutBtn = document.getElementById('logout-dropdown');

        // Toggle dropdown
        if (dropdownTrigger) {
            dropdownTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dropdownMenu) {
                    dropdownMenu.classList.toggle('active');
                }
            });
        }

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (dropdownMenu && !dropdownMenu.contains(e.target) && !dropdownTrigger.contains(e.target)) {
                dropdownMenu.classList.remove('active');
            }
        });

        // Editar perfil
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.abrirModalEditarPerfil();
            });
        }

        // Cerrar sesión
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.cerrarSesion();
            });
        }
    }

    abrirModalEditarPerfil() {
        // Crear modal de edición de perfil dinámicamente
        const modalHtml = `
            <div id="edit-profile-modal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Editar Perfil</h3>
                        <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-profile-form">
                            <div class="form-group">
                                <label for="edit-nombre">Nombre</label>
                                <input type="text" id="edit-nombre" required value="${this.currentUser.user_metadata?.nombre || ''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-avatar">URL del Avatar (opcional)</label>
                                <input type="url" id="edit-avatar" placeholder="https://ejemplo.com/avatar.jpg" value="${this.currentUser.user_metadata?.avatar_url || ''}">
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn-secondary" onclick="this.closest('.modal').classList.remove('active')">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Agregar modal al body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Configurar evento de submit
        const form = document.getElementById('edit-profile-form');
        if (form) {
            form.addEventListener('submit', (e) => this.guardarCambiosPerfil(e));
        }
    }

    async guardarCambiosPerfil(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('edit-nombre').value;
        const avatar_url = document.getElementById('edit-avatar').value;

        try {
            // Actualizar metadata del usuario en Supabase Auth
            const { data, error } = await supabase.auth.updateUser({
                data: {
                    nombre: nombre,
                    avatar_url: avatar_url
                }
            });

            if (error) throw error;

            // Actualizar UI
            await this.cargarInfoUsuario();

            // Cerrar modal
            const modal = document.getElementById('edit-profile-modal');
            if (modal) modal.remove();

            this.mostrarNotificación('Perfil actualizado exitosamente', 'success');
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            this.mostrarNotificación('Error al actualizar perfil', 'error');
        }
    }

    async cerrarSesion() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            this.mostrarNotificación('Sesión cerrada correctamente', 'success');
            setTimeout(() => {
                window.location.href = '../../iniciosesion/index.html';
            }, 1000);
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            this.mostrarNotificación('Error al cerrar sesión', 'error');
        }
    }

    ocultarLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Esperar un poco más si los elementos no existen
        setTimeout(() => {
            this.configurarListeners();
        }, 100);
    }

    configurarListeners() {
        // Configurar pareja
        const configBtn = document.getElementById('config-pareja-btn');
        const closeConfigModal = document.getElementById('close-config-modal');
        const cancelConfig = document.getElementById('cancel-config');
        const configForm = document.getElementById('config-pareja-form');
        
        console.log('Botón configuración:', configBtn);
        if (configBtn) {
            configBtn.addEventListener('click', (e) => {
                console.log('Click en configuración');
                this.abrirModalConfig();
            });
        }
        
        if (closeConfigModal) closeConfigModal.addEventListener('click', () => this.cerrarModal('config-pareja-modal'));
        if (cancelConfig) cancelConfig.addEventListener('click', () => this.cerrarModal('config-pareja-modal'));
        if (configForm) configForm.addEventListener('submit', (e) => this.guardarConfiguracion(e));

        // Agregar ingreso
        const addIncomeBtn = document.getElementById('add-income-btn');
        const closeIncomeModal = document.getElementById('close-income-modal');
        const cancelIncome = document.getElementById('cancel-income');
        const incomeForm = document.getElementById('income-form');
        
        console.log('Botón agregar ingreso:', addIncomeBtn);
        if (addIncomeBtn) {
            addIncomeBtn.addEventListener('click', (e) => {
                console.log('Click en agregar ingreso');
                this.abrirModalIngreso();
            });
        } else {
            console.error('No se encontró el botón add-income-btn');
        }
        
        if (closeIncomeModal) closeIncomeModal.addEventListener('click', () => this.cerrarModal('income-modal'));
        if (cancelIncome) cancelIncome.addEventListener('click', () => this.cerrarModal('income-modal'));
        if (incomeForm) incomeForm.addEventListener('submit', (e) => this.guardarIngreso(e));

        // Agregar gasto
        const addExpenseBtn = document.getElementById('add-expense-btn');
        const closeExpenseModal = document.getElementById('close-expense-modal');
        const cancelExpense = document.getElementById('cancel-expense');
        const saveExpenseBtn = document.getElementById('save-expense-btn');
        const clearExpenseForm = document.getElementById('clear-expense-form');
        
        console.log('Botón agregar gasto:', addExpenseBtn);
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', (e) => {
                console.log('Click en agregar gasto');
                this.abrirModalGasto();
            });
        } else {
            console.error('No se encontró el botón add-expense-btn');
        }
        
        if (closeExpenseModal) closeExpenseModal.addEventListener('click', () => this.cerrarModal('expense-modal'));
        if (cancelExpense) cancelExpense.addEventListener('click', () => this.cerrarModal('expense-modal'));
        
        // Botón Guardar Gasto
        console.log('Botón guardar gasto:', saveExpenseBtn);
        if (saveExpenseBtn) {
            saveExpenseBtn.addEventListener('click', (e) => {
                console.log('Click en guardar gasto');
                e.preventDefault();
                this.guardarGasto(e);
            });
        } else {
            console.error('No se encontró el botón save-expense-btn');
        }
        
        // Botón Limpiar Formulario
        console.log('Botón limpiar formulario:', clearExpenseForm);
        if (clearExpenseForm) {
            clearExpenseForm.addEventListener('click', (e) => {
                console.log('Click en limpiar formulario');
                e.preventDefault();
                this.limpiarFormularioGasto();
            });
        } else {
            console.error('No se encontró el botón clear-expense-form');
        }

        // Filtros
        const filterMonth = document.getElementById('filter-month');
        const filterCategory = document.getElementById('filter-category');
        
        if (filterMonth) filterMonth.addEventListener('change', () => this.filtrarGastos());
        if (filterCategory) filterCategory.addEventListener('change', () => this.filtrarGastos());

        // Vista previa en tiempo real
        const ingresosUsuarioInput = document.getElementById('ingresos-usuario-input');
        const ingresosParejaInput = document.getElementById('ingresos-pareja-input');
        const expenseAmount = document.getElementById('expense-amount');
        const expensePaidBy = document.getElementById('expense-paid-by');
        
        if (ingresosUsuarioInput) ingresosUsuarioInput.addEventListener('input', () => this.actualizarPreviewConfig());
        if (ingresosParejaInput) ingresosParejaInput.addEventListener('input', () => this.actualizarPreviewConfig());
        if (expenseAmount) expenseAmount.addEventListener('input', () => this.actualizarPreviewGasto());
        if (expensePaidBy) expensePaidBy.addEventListener('change', () => this.actualizarPreviewGasto());
        
        // Event listeners para pestañas de gráficas
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const chartType = e.target.getAttribute('data-chart');
                this.cambiarGrafica(chartType);
            });
        });
        
        console.log('Event listeners configurados');
    }

    abrirModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    cerrarModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    abrirModalConfig() {
        const ingresosUsuarioInput = document.getElementById('ingresos-usuario-input');
        const ingresosParejaInput = document.getElementById('ingresos-pareja-input');
        const nombreUsuarioInput = document.getElementById('nombre-usuario-input');
        const nombreParejaInput = document.getElementById('nombre-pareja-input');
        
        this.abrirModal('config-pareja-modal');
        
        if (nombreUsuarioInput) nombreUsuarioInput.value = this.configuracion.nombreUsuario;
        if (nombreParejaInput) nombreParejaInput.value = this.configuracion.nombrePareja;
        if (ingresosUsuarioInput) ingresosUsuarioInput.value = this.configuracion.ingresosUsuario;
        if (ingresosParejaInput) ingresosParejaInput.value = this.configuracion.ingresosPareja;
        this.actualizarPreviewConfig();
    }

    abrirModalIngreso() {
        this.abrirModal('income-modal');
        const incomeDate = document.getElementById('income-date');
        if (incomeDate) incomeDate.valueAsDate = new Date();
        
        // Limpiar formulario
        const incomeForm = document.getElementById('income-form');
        if (incomeForm) incomeForm.reset();
    }

    abrirModalGasto() {
        this.abrirModal('expense-modal');
        
        // Esperar un poco a que el modal se abra completamente
        setTimeout(() => {
            const expenseDate = document.getElementById('expense-date');
            if (expenseDate) expenseDate.valueAsDate = new Date();
            
            // Limpiar formulario
            const expenseForm = document.getElementById('expense-form');
            if (expenseForm) expenseForm.reset();
            
            // Establecer fecha actual nuevamente
            if (expenseDate) expenseDate.valueAsDate = new Date();
            
            this.actualizarPreviewGasto();
        }, 100);
    }

    calcularPorcentajes() {
        // Calcular ingresos totales incluyendo los individuales
        const ingresosIndividualesUsuario = this.ingresos
            .filter(i => i.miembro === 'usuario')
            .reduce((sum, i) => sum + i.monto, 0);
        
        const ingresosIndividualesPareja = this.ingresos
            .filter(i => i.miembro === 'pareja')
            .reduce((sum, i) => sum + i.monto, 0);
        
        const ingresosTotalesUsuario = this.configuracion.ingresosUsuario + ingresosIndividualesUsuario;
        const ingresosTotalesPareja = this.configuracion.ingresosPareja + ingresosIndividualesPareja;
        
        console.log('📊 Cálculo de porcentajes:', {
            configuracionUsuario: this.configuracion.ingresosUsuario,
            configuracionPareja: this.configuracion.ingresosPareja,
            individualesUsuario: ingresosIndividualesUsuario,
            individualesPareja: ingresosIndividualesPareja,
            totalesUsuario: ingresosTotalesUsuario,
            totalesPareja: ingresosTotalesPareja
        });
        
        const total = ingresosTotalesUsuario + ingresosTotalesPareja;
        if (total === 0) return { usuario: 50, pareja: 50 };
        
        const porcentajeUsuario = (ingresosTotalesUsuario / total) * 100;
        const porcentajePareja = (ingresosTotalesPareja / total) * 100;
        
        const resultado = {
            usuario: Math.round(porcentajeUsuario * 100) / 100,
            pareja: Math.round(porcentajePareja * 100) / 100
        };
        
        console.log('✅ Porcentajes calculados:', resultado);
        return resultado;
    }

    actualizarPreviewConfig() {
        const ingresosUsuarioInput = document.getElementById('ingresos-usuario-input');
        const ingresosParejaInput = document.getElementById('ingresos-pareja-input');
        const nombreUsuarioInput = document.getElementById('nombre-usuario-input');
        const nombreParejaInput = document.getElementById('nombre-pareja-input');
        
        if (!ingresosUsuarioInput || !ingresosParejaInput || !nombreUsuarioInput || !nombreParejaInput) {
            return;
        }
        
        const ingresosUsuario = parseFloat(ingresosUsuarioInput.value) || 0;
        const ingresosPareja = parseFloat(ingresosParejaInput.value) || 0;
        const nombreUsuario = nombreUsuarioInput.value || 'Tú';
        const nombrePareja = nombreParejaInput.value || 'Pareja';

        const total = ingresosUsuario + ingresosPareja;
        let porcentajeUsuario = 50, porcentajePareja = 50;

        if (total > 0) {
            porcentajeUsuario = Math.round((ingresosUsuario / total) * 100 * 100) / 100;
            porcentajePareja = Math.round((ingresosPareja / total) * 100 * 100) / 100;
        }

        const previewNombreUsuario = document.getElementById('preview-nombre-usuario');
        const previewNombrePareja = document.getElementById('preview-nombre-pareja');
        const previewPorcentajeUsuario = document.getElementById('preview-porcentaje-usuario');
        const previewPorcentajePareja = document.getElementById('preview-porcentaje-pareja');
        
        if (previewNombreUsuario) previewNombreUsuario.textContent = nombreUsuario;
        if (previewNombrePareja) previewNombrePareja.textContent = nombrePareja;
        if (previewPorcentajeUsuario) previewPorcentajeUsuario.textContent = `${porcentajeUsuario}%`;
        if (previewPorcentajePareja) previewPorcentajePareja.textContent = `${porcentajePareja}%`;
    }

    actualizarPreviewGasto() {
        console.log('🔄 Actualizando preview de gasto...');
        
        const expenseAmount = document.getElementById('expense-amount');
        const expensePaidBy = document.getElementById('expense-paid-by');
        const expenseMontoUsuario = document.getElementById('expense-monto-usuario');
        const expenseMontoPareja = document.getElementById('expense-monto-pareja');
        
        if (!expenseAmount || !expensePaidBy || !expenseMontoUsuario || !expenseMontoPareja) {
            console.log('❌ Faltan elementos del DOM');
            return;
        }
        
        const monto = parseFloat(expenseAmount.value) || 0;
        const quienPago = expensePaidBy.value;
        
        console.log('📊 Datos para preview:', {
            monto,
            quienPago,
            ingresosUsuario: this.configuracion.ingresosUsuario,
            ingresosPareja: this.configuracion.ingresosPareja,
            ingresosIndividuales: this.ingresos
        });
        
        if (!quienPago || monto === 0) {
            expenseMontoUsuario.textContent = '$0.00';
            expenseMontoPareja.textContent = '$0.00';
            console.log('⚠️ Monto o pagador vacío');
            return;
        }

        const porcentajes = this.calcularPorcentajes();
        console.log('📈 Porcentajes obtenidos:', porcentajes);
        
        const montoUsuario = (monto * porcentajes.usuario) / 100;
        const montoPareja = (monto * porcentajes.pareja) / 100;
        
        console.log('💰 Montos calculados:', {
            montoTotal: monto,
            porcentajeUsuario: porcentajes.usuario,
            porcentajePareja: porcentajes.pareja,
            montoUsuario,
            montoPareja
        });

        expenseMontoUsuario.textContent = `$${montoUsuario.toFixed(2)}`;
        expenseMontoPareja.textContent = `$${montoPareja.toFixed(2)}`;
        
        console.log('✅ Preview actualizado:', {
            usuario: expenseMontoUsuario.textContent,
            pareja: expenseMontoPareja.textContent
        });
    }

    async guardarConfiguracion(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.mostrarNotificación('Debes iniciar sesión para guardar la configuración', 'error');
            return;
        }
        
        const nuevaConfiguracion = {
            nombre_usuario: document.getElementById('nombre-usuario-input').value,
            nombre_pareja: document.getElementById('nombre-pareja-input').value,
            ingresos_usuario: parseFloat(document.getElementById('ingresos-usuario-input').value) || 0,
            ingresos_pareja: parseFloat(document.getElementById('ingresos-pareja-input').value) || 0
        };

        try {
            if (this.configuracionId) {
                // Actualizar configuración existente
                const { data, error } = await supabase
                    .from('configuracion_parejas')
                    .update(nuevaConfiguracion)
                    .eq('id', this.configuracionId);

                if (error) throw error;
            } else {
                // Verificar si ya existe configuración para este usuario
                const { data: existingConfig, error: fetchError } = await supabase
                    .from('configuracion_parejas')
                    .select('id')
                    .eq('usuario_id', this.currentUser.id)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    throw fetchError;
                }

                if (existingConfig) {
                    // Actualizar configuración existente
                    const { data, error } = await supabase
                        .from('configuracion_parejas')
                        .update(nuevaConfiguracion)
                        .eq('id', existingConfig.id);

                    if (error) throw error;
                    this.configuracionId = existingConfig.id;
                } else {
                    // Crear nueva configuración
                    const configCompleta = {
                        ...nuevaConfiguracion,
                        usuario_id: this.currentUser.id
                    };

                    const { data, error } = await supabase
                        .from('configuracion_parejas')
                        .insert([configCompleta])
                        .select();

                    if (error) throw error;
                    this.configuracionId = data[0].id;
                }
            }

            this.configuracion = {
                nombreUsuario: nuevaConfiguracion.nombre_usuario,
                nombrePareja: nuevaConfiguracion.nombre_pareja,
                ingresosUsuario: nuevaConfiguracion.ingresos_usuario,
                ingresosPareja: nuevaConfiguracion.ingresos_pareja
            };
            
            this.cerrarModal('config-pareja-modal');
            this.actualizarInterfaz();
            this.mostrarNotificación('Configuración guardada exitosamente', 'success');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            this.mostrarNotificación('Error al guardar configuración', 'error');
        }
    }

    async guardarIngreso(e) {
        e.preventDefault();
        
        console.log('=== GUARDAR INGRESO ===');
        
        if (!this.currentUser || !this.configuracionId) {
            console.log('❌ No hay usuario o configuración');
            this.mostrarNotificación('Debes configurar la pareja primero', 'error');
            return;
        }
        
        console.log('✅ Usuario y configuración OK');
        console.log('Configuración ID:', this.configuracionId);
        
        // Verificar que todos los elementos existan
        const incomeMember = document.getElementById('income-member');
        const incomeAmount = document.getElementById('income-amount');
        const incomeFrequency = document.getElementById('income-frequency');
        const incomeDescription = document.getElementById('income-description');
        const incomeDate = document.getElementById('income-date');
        
        if (!incomeMember || !incomeAmount || !incomeFrequency || !incomeDescription || !incomeDate) {
            console.log('❌ Faltan elementos del formulario');
            this.mostrarNotificación('Faltan campos en el formulario', 'error');
            return;
        }
        
        // Obtener valores antes de validar
        const miembroValue = incomeMember.value;
        const montoValue = parseFloat(incomeAmount.value) || 0;
        const frecuenciaValue = incomeFrequency.value;
        const descripcionValue = incomeDescription.value.trim();
        const fechaValue = incomeDate.value;
        
        console.log('Valores del formulario:', {
            miembro: miembroValue,
            monto: montoValue,
            frecuencia: frecuenciaValue,
            descripcion: descripcionValue,
            fecha: fechaValue
        });
        
        // Validar datos
        if (!miembroValue || montoValue <= 0 || !frecuenciaValue || !fechaValue) {
            console.log('❌ Validación fallida');
            this.mostrarNotificación('Por favor completa todos los campos requeridos', 'error');
            return;
        }
        
        const ingreso = {
            configuracion_id: this.configuracionId,
            miembro: miembroValue,
            monto: montoValue,
            frecuencia: frecuenciaValue,
            descripcion: descripcionValue || 'Sin descripción',
            fecha: fechaValue
        };
        
        console.log('📤 Enviando a Supabase:', ingreso);
        
        try {
            const { data, error } = await supabase
                .from('ingresos_pareja')
                .insert([ingreso])
                .select();

            console.log('📥 Respuesta Supabase:', { data, error });

            if (error) {
                console.error('❌ Error detallado:', error);
                this.mostrarNotificación(`Error: ${error.message}`, 'error');
                return;
            }
            
            console.log('✅ Ingreso guardado exitosamente');
            
            // Agregar el nuevo ingreso al array local para evitar recarga
            if (data && data.length > 0) {
                this.ingresos.unshift(data[0]); // Agregar al principio
            }
            
            // Limpiar formulario
            e.target.reset();
            
            this.cerrarModal('income-modal');
            this.actualizarInterfaz();
            this.mostrarNotificación('Ingreso agregado exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error guardando ingreso:', error);
            this.mostrarNotificación('Error al guardar ingreso', 'error');
        }
    }

    limpiarFormularioGasto() {
        console.log('Limpiando formulario de gasto...');
        
        const expenseDescription = document.getElementById('expense-description');
        const expenseAmount = document.getElementById('expense-amount');
        const expenseCategory = document.getElementById('expense-category');
        const expenseDate = document.getElementById('expense-date');
        const expensePaidBy = document.getElementById('expense-paid-by');
        
        if (expenseDescription) expenseDescription.value = '';
        if (expenseAmount) expenseAmount.value = '';
        if (expenseCategory) expenseCategory.value = 'alimentacion'; // valor por defecto
        if (expenseDate) expenseDate.valueAsDate = new Date();
        if (expensePaidBy) expensePaidBy.value = 'usuario'; // valor por defecto
        
        // Actualizar preview
        this.actualizarPreviewGasto();
        
        this.mostrarNotificación('Formulario limpiado', 'info');
    }

    async guardarGasto(e) {
        e.preventDefault();
        
        console.log('=== GUARDAR GASTO ===');
        
        if (!this.currentUser || !this.configuracionId) {
            console.log('❌ No hay usuario o configuración');
            this.mostrarNotificación('Debes configurar la pareja primero', 'error');
            return;
        }
        
        console.log('✅ Usuario y configuración OK');
        console.log('Configuración ID:', this.configuracionId);
        
        // Verificar que todos los elementos existan
        const expenseDescription = document.getElementById('expense-description');
        const expenseAmount = document.getElementById('expense-amount');
        const expenseCategory = document.getElementById('expense-category');
        const expenseDate = document.getElementById('expense-date');
        const expensePaidBy = document.getElementById('expense-paid-by');
        
        if (!expenseDescription || !expenseAmount || !expenseCategory || !expenseDate || !expensePaidBy) {
            console.log('❌ Faltan elementos del formulario');
            this.mostrarNotificación('Faltan campos en el formulario', 'error');
            return;
        }
        
        // Obtener valores antes de validar
        const descripcionValue = expenseDescription.value.trim();
        const montoValue = parseFloat(expenseAmount.value) || 0;
        const categoriaValue = expenseCategory.value;
        const fechaValue = expenseDate.value;
        const pagadoPorValue = expensePaidBy.value;
        
        console.log('Valores del formulario:', {
            descripcion: descripcionValue,
            monto: montoValue,
            categoria: categoriaValue,
            fecha: fechaValue,
            pagadoPor: pagadoPorValue
        });
        
        // Validar datos
        if (!descripcionValue || montoValue <= 0 || !categoriaValue || !fechaValue || !pagadoPorValue) {
            console.log('❌ Validación fallida');
            this.mostrarNotificación('Por favor completa todos los campos requeridos', 'error');
            return;
        }
        
        const porcentajes = this.calcularPorcentajes();
        
        const gasto = {
            configuracion_id: this.configuracionId,
            descripcion: descripcionValue,
            monto: montoValue,
            categoria: categoriaValue,
            fecha: fechaValue,
            pagado_por: pagadoPorValue,
            monto_usuario: (montoValue * porcentajes.usuario) / 100,
            monto_pareja: (montoValue * porcentajes.pareja) / 100,
            porcentaje_usuario: porcentajes.usuario,
            porcentaje_pareja: porcentajes.pareja
        };
        
        console.log('📤 Enviando a Supabase:', gasto);
        
        try {
            const { data, error } = await supabase
                .from('gastos_compartidos')
                .insert([gasto])
                .select();

            console.log('📥 Respuesta Supabase:', { data, error });

            if (error) {
                console.error('❌ Error detallado:', error);
                this.mostrarNotificación(`Error: ${error.message}`, 'error');
                return;
            }
            
            console.log('✅ Gasto guardado exitosamente');
            
            // Limpiar formulario
            const expenseForm = document.getElementById('expense-form');
            if (expenseForm) {
                expenseForm.reset();
                // Establecer fecha actual nuevamente
                const expenseDate = document.getElementById('expense-date');
                if (expenseDate) expenseDate.valueAsDate = new Date();
            }
            
            this.cerrarModal('expense-modal');
            this.actualizarInterfaz();
            this.mostrarNotificación('Gasto agregado exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error guardando gasto:', error);
            this.mostrarNotificación('Error al guardar gasto', 'error');
        }
    }

    async cargarConfiguracion() {
        console.log('=== CARGANDO CONFIGURACIÓN DESDE SUPABASE ===');
        
        if (!this.currentUser) {
            console.log('❌ No hay usuario actual');
            return;
        }
        
        console.log('✅ Usuario encontrado:', this.currentUser.id);
        
        try {
            // Cargar configuración de la pareja
            const { data: configData, error: configError } = await supabase
                .from('configuracion_parejas')
                .select('*')
                .eq('usuario_id', this.currentUser.id)  // Campo correcto según la BD
                .single();

            console.log('📥 Configuración Supabase:', { data: configData, error: configError });

            if (configError && configError.code !== 'PGRST116') {
                throw configError;
            }

            if (configData) {
                console.log('✅ Configuración encontrada');
                this.configuracion = {
                    nombreUsuario: configData.nombre_usuario,
                    nombrePareja: configData.nombre_pareja,
                    ingresosUsuario: configData.ingresos_usuario,
                    ingresosPareja: configData.ingresos_pareja
                };
                this.configuracionId = configData.id;
                console.log('📊 Configuración cargada:', this.configuracion);
            } else {
                console.log('ℹ️ No hay configuración para este usuario');
            }

            // Cargar gastos compartidos solo si hay configuración
            if (this.configuracionId) {
                console.log('📥 Cargando gastos compartidos...');
                
                const { data: gastosData, error: gastosError } = await supabase
                    .from('gastos_compartidos')
                    .select('*')
                    .eq('configuracion_id', this.configuracionId)
                    .order('fecha', { ascending: false });

                console.log('📥 Gastos Supabase:', { data: gastosData, error: gastosError });

                if (gastosError) throw gastosError;
                
                this.gastos = gastosData || [];
                console.log('📊 Gastos cargados:', this.gastos.length, 'gastos');
            }

            // Cargar ingresos individuales
            if (this.configuracionId) {
                console.log('📥 Cargando ingresos individuales...');
                console.log('🔍 Usando configuracion_id:', this.configuracionId);
                
                // Primero, verificar si hay datos sin filtro
                const { data: allIngresos, error: allError } = await supabase
                    .from('ingresos_pareja')
                    .select('*')
                    .limit(10);

                console.log('📋 Todos los ingresos (sin filtro):', { data: allIngresos, error: allError });
                
                // Luego, cargar con filtro
                const { data: ingresosData, error: ingresosError } = await supabase
                    .from('ingresos_pareja')
                    .select('*')
                    .eq('configuracion_id', this.configuracionId)
                    .order('fecha', { ascending: false });

                console.log('📥 Ingresos Supabase:', { data: ingresosData, error: ingresosError });

                if (ingresosError) {
                    console.error('❌ Error detallado en ingresos:', ingresosError);
                    throw ingresosError;
                }
                
                this.ingresos = ingresosData || [];
                console.log('📊 Ingresos cargados:', this.ingresos.length, 'ingresos');
                console.log('📋 Detalle de ingresos:', this.ingresos);
            }

            console.log('✅ Configuración completa cargada');

        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            // Si no hay configuración, es normal para usuarios nuevos
        }
    }

    actualizarInterfaz() {
        this.actualizarResumenFinanciero();
        this.actualizarDivisionFinanciera();
        this.renderizarIngresos();
        this.renderizarGastos();
        this.actualizarGraficas();
    }

    actualizarResumenFinanciero() {
        // Calcular ingresos totales (configuración + individuales)
        const ingresosIndividualesUsuario = this.ingresos
            .filter(i => i.miembro === 'usuario')
            .reduce((sum, i) => sum + i.monto, 0);
        
        const ingresosIndividualesPareja = this.ingresos
            .filter(i => i.miembro === 'pareja')
            .reduce((sum, i) => sum + i.monto, 0);
        
        const ingresosTotalesUsuario = this.configuracion.ingresosUsuario + ingresosIndividualesUsuario;
        const ingresosTotalesPareja = this.configuracion.ingresosPareja + ingresosIndividualesPareja;
        const ingresosTotales = ingresosTotalesUsuario + ingresosTotalesPareja;
        
        const gastosTotales = this.gastos
            .filter(g => g.monto && !g.frecuencia)
            .reduce((sum, g) => sum + g.monto, 0);
        const ahorro = ingresosTotales - gastosTotales;

        console.log('📊 Resumen Financiero:', {
            ingresosConfiguracion: {
                usuario: this.configuracion.ingresosUsuario,
                pareja: this.configuracion.ingresosPareja
            },
            ingresosIndividuales: {
                usuario: ingresosIndividualesUsuario,
                pareja: ingresosIndividualesPareja
            },
            ingresosTotales: {
                usuario: ingresosTotalesUsuario,
                pareja: ingresosTotalesPareja,
                total: ingresosTotales
            },
            gastosTotales,
            ahorro
        });

        // Actualizar elementos solo si existen (se eliminó la sección de balance)
        const totalIngresosEl = document.getElementById('totalIngresosPareja');
        const totalGastosEl = document.getElementById('totalGastosPareja');
        const ahorroEl = document.getElementById('ahorroCompartido');
        
        if (totalIngresosEl) totalIngresosEl.textContent = `$${ingresosTotales.toFixed(2)}`;
        if (totalGastosEl) totalGastosEl.textContent = `$${gastosTotales.toFixed(2)}`;
        if (ahorroEl) ahorroEl.textContent = `$${ahorro.toFixed(2)}`;
    }

    actualizarDivisionFinanciera() {
        // Calcular ingresos totales (configuración + individuales)
        const ingresosIndividualesUsuario = this.ingresos
            .filter(i => i.miembro === 'usuario')
            .reduce((sum, i) => sum + i.monto, 0);
        
        const ingresosIndividualesPareja = this.ingresos
            .filter(i => i.miembro === 'pareja')
            .reduce((sum, i) => sum + i.monto, 0);
        
        const ingresosTotalesUsuario = this.configuracion.ingresosUsuario + ingresosIndividualesUsuario;
        const ingresosTotalesPareja = this.configuracion.ingresosPareja + ingresosIndividualesPareja;
        
        const porcentajes = this.calcularPorcentajesConIngresos(ingresosTotalesUsuario, ingresosTotalesPareja);
        
        const nombreUsuarioEl = document.getElementById('nombre-usuario');
        const nombreParejaEl = document.getElementById('nombre-pareja');
        const porcentajeUsuarioEl = document.getElementById('porcentaje-usuario');
        const porcentajeParejaEl = document.getElementById('porcentaje-pareja');
        const ingresosUsuarioEl = document.getElementById('ingresos-usuario');
        const ingresosParejaEl = document.getElementById('ingresos-pareja');
        const contribucionUsuarioEl = document.getElementById('contribucion-usuario');
        const contribucionParejaEl = document.getElementById('contribucion-pareja');
        
        if (nombreUsuarioEl) nombreUsuarioEl.textContent = this.configuracion.nombreUsuario || 'Tú';
        if (nombreParejaEl) nombreParejaEl.textContent = this.configuracion.nombrePareja || 'Tu Pareja';
        if (porcentajeUsuarioEl) porcentajeUsuarioEl.textContent = `${porcentajes.usuario.toFixed(1)}%`;
        if (porcentajeParejaEl) porcentajeParejaEl.textContent = `${porcentajes.pareja.toFixed(1)}%`;
        if (ingresosUsuarioEl) ingresosUsuarioEl.textContent = `$${ingresosTotalesUsuario.toFixed(2)}`;
        if (ingresosParejaEl) ingresosParejaEl.textContent = `$${ingresosTotalesPareja.toFixed(2)}`;
        
        const gastosTotales = this.gastos
            .filter(g => g.monto && !g.frecuencia)
            .reduce((sum, g) => sum + g.monto, 0);
            
        const contribucionUsuario = (gastosTotales * porcentajes.usuario) / 100;
        const contribucionPareja = (gastosTotales * porcentajes.pareja) / 100;
        
        if (contribucionUsuarioEl) contribucionUsuarioEl.textContent = `$${contribucionUsuario.toFixed(2)}`;
        if (contribucionParejaEl) contribucionParejaEl.textContent = `$${contribucionPareja.toFixed(2)}`;
    }

    calcularPorcentajesConIngresos(ingresosUsuario, ingresosPareja) {
        const total = ingresosUsuario + ingresosPareja;
        if (total === 0) return { usuario: 50, pareja: 50 };
        
        const porcentajeUsuario = (ingresosUsuario / total) * 100;
        const porcentajePareja = (ingresosPareja / total) * 100;
        
        return { usuario: porcentajeUsuario, pareja: porcentajePareja };
    }

    renderizarIngresos() {
        console.log('=== RENDERIZAR INGRESOS ===');
        console.log('📊 Array this.ingresos:', this.ingresos);
        console.log('📊 Longitud:', this.ingresos?.length || 0);
        
        const container = document.getElementById('income-list');
        if (!container) {
            console.warn('Elemento income-list no encontrado');
            return;
        }
        
        if (!this.ingresos || this.ingresos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p>No hay ingresos registrados</p>
                    <span>Agrega tus primeros ingresos para comenzar</span>
                </div>
            `;
            return;
        }

        // Verificar si hay duplicados
        const ids = this.ingresos.map(i => i.id);
        const duplicados = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicados.length > 0) {
            console.warn('⚠️ Se detectaron ingresos duplicados:', duplicados);
            // Eliminar duplicados
            this.ingresos = this.ingresos.filter((ingreso, index, self) => 
                index === self.findIndex(i => i.id === ingreso.id)
            );
        }

        container.innerHTML = this.ingresos.map(ingreso => this.renderizarIngreso(ingreso)).join('');
        
        // Agregar event listeners para los botones de ingresos
        this.setupIngresoActionListeners();
        
        console.log('✅ Ingresos renderizados:', this.ingresos.length);
    }

    setupIngresoActionListeners() {
        // Event listeners para botones de editar ingresos
        document.querySelectorAll('.btn-edit-income').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ingresoId = e.target.getAttribute('data-ingreso-id');
                console.log('Click en editar ingreso:', ingresoId);
                this.editarIngreso(ingresoId);
            });
        });

        // Event listeners para botones de eliminar ingresos
        document.querySelectorAll('.btn-delete-income').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ingresoId = e.target.getAttribute('data-ingreso-id');
                console.log('Click en eliminar ingreso:', ingresoId);
                this.eliminarIngreso(ingresoId);
            });
        });
    }

    renderizarIngreso(ingreso) {
        const miembroLabels = {
            usuario: this.configuracion.nombreUsuario || 'Tú',
            pareja: this.configuracion.nombrePareja || 'Tu Pareja'
        };

        const frecuenciaLabels = {
            mensual: 'Mensual',
            quincenal: 'Quincenal',
            semestral: 'Semestral',
            anual: 'Anual'
        };

        return `
            <div class="income-item" data-ingreso-id="${ingreso.id}">
                <div class="income-header">
                    <span class="income-amount">$${ingreso.monto.toFixed(2)}</span>
                    <span class="income-frequency">${frecuenciaLabels[ingreso.frecuencia] || ingreso.frecuencia}</span>
                </div>
                <div class="income-details">
                    <div class="income-detail">
                        <span class="income-detail-label">Miembro</span>
                        <span class="income-detail-value">${miembroLabels[ingreso.miembro]}</span>
                    </div>
                    <div class="income-detail">
                        <span class="income-detail-label">Descripción</span>
                        <span class="income-detail-value">${ingreso.descripcion}</span>
                    </div>
                    <div class="income-detail">
                        <span class="income-detail-label">Fecha</span>
                        <span class="income-detail-value">${new Date(ingreso.fecha).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="income-actions">
                    <button class="btn-edit btn-edit-income" data-ingreso-id="${ingreso.id}">Editar</button>
                    <button class="btn-delete btn-delete-income" data-ingreso-id="${ingreso.id}">Eliminar</button>
                </div>
            </div>
        `;
    }

    renderizarGastos() {
        const container = document.getElementById('gastos-list');
        if (!container) {
            console.warn('Elemento gastos-list no encontrado');
            return;
        }
        
        const gastosFiltrados = this.obtenerGastosFiltrados();
        
        if (gastosFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                    </svg>
                    <p>No hay gastos compartidos registrados</p>
                    <span>Agrega tu primer gasto compartido para comenzar</span>
                </div>
            `;
            return;
        }

        container.innerHTML = gastosFiltrados.map(gasto => this.renderizarGasto(gasto)).join('');
        
        // Agregar event listeners para los botones
        this.setupGastoActionListeners();
    }

    setupGastoActionListeners() {
        // Event listeners para botones de editar
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gastoId = e.target.getAttribute('data-gasto-id');
                console.log('Click en editar gasto:', gastoId);
                this.editarGasto(gastoId);
            });
        });

        // Event listeners para botones de eliminar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gastoId = e.target.getAttribute('data-gasto-id');
                console.log('Click en eliminar gasto:', gastoId);
                this.eliminarGasto(gastoId);
            });
        });
    }

    renderizarGasto(gasto) {
        const categoriaLabels = {
            alimentacion: 'Alimentación',
            vivienda: 'Vivienda',
            transporte: 'Transporte',
            servicios: 'Servicios',
            entretenimiento: 'Entretenimiento',
            salud: 'Salud',
            otros: 'Otros'
        };

        const pagadoPorLabels = {
            usuario: this.configuracion.nombreUsuario || 'Tú',
            pareja: this.configuracion.nombrePareja || 'Tu Pareja'
        };

        // Calcular porcentajes desde los datos guardados
        const porcentajeUsuario = gasto.porcentaje_usuario || 50;
        const porcentajePareja = gasto.porcentaje_pareja || 50;

        return `
            <div class="expense-item" data-gasto-id="${gasto.id}">
                <div class="expense-header">
                    <span class="expense-amount">$${gasto.monto.toFixed(2)}</span>
                    <span class="expense-category">${categoriaLabels[gasto.categoria] || gasto.categoria}</span>
                </div>
                <div class="expense-details">
                    <div class="expense-detail">
                        <span class="expense-detail-label">Descripción</span>
                        <span class="expense-detail-value">${gasto.descripcion}</span>
                    </div>
                    <div class="expense-detail">
                        <span class="expense-detail-label">Fecha</span>
                        <span class="expense-detail-value">${new Date(gasto.fecha).toLocaleDateString()}</span>
                    </div>
                    <div class="expense-detail">
                        <span class="expense-detail-label">Pagado por</span>
                        <span class="expense-detail-value">${pagadoPorLabels[gasto.pagado_por]}</span>
                    </div>
                    <div class="expense-detail">
                        <span class="expense-detail-label">División</span>
                        <span class="expense-detail-value">
                            ${porcentajeUsuario}% / ${porcentajePareja}%
                        </span>
                    </div>
                </div>
                <div class="expense-actions">
                    <button class="btn-edit" data-gasto-id="${gasto.id}">Editar</button>
                    <button class="btn-delete" data-gasto-id="${gasto.id}">Eliminar</button>
                </div>
            </div>
        `;
    }

    obtenerGastosFiltrados() {
        // Filtrar solo gastos (no ingresos) - los ingresos tienen frecuencia, los gastos no
        let filtrados = this.gastos.filter(g => g.monto && !g.frecuencia);
        
        console.log('📊 Gastos filtrados:', filtrados.length, 'de', this.gastos.length, 'totales');
        
        const filterMonth = document.getElementById('filter-month');
        const filterCategory = document.getElementById('filter-category');
        
        const mesFiltro = filterMonth ? filterMonth.value : null;
        const categoriaFiltro = filterCategory ? filterCategory.value : null;
        
        if (mesFiltro) {
            filtrados = filtrados.filter(g => {
                const fecha = new Date(g.fecha);
                return fecha.getMonth() + 1 == mesFiltro;
            });
        }
        
        if (categoriaFiltro) {
            filtrados = filtrados.filter(g => g.categoria === categoriaFiltro);
        }
        
        return filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    async editarIngreso(id) {
        console.log('=== EDITAR INGRESO ===', id);
        
        // Buscar el ingreso en la lista
        const ingreso = this.ingresos.find(i => i.id == id);
        if (!ingreso) {
            this.mostrarNotificación('Ingreso no encontrado', 'error');
            return;
        }
        
        console.log('📊 Ingreso a editar:', ingreso);
        
        // Crear modal de edición
        const modalHtml = `
            <div id="edit-ingreso-modal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Editar Ingreso</h3>
                        <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-ingreso-form">
                            <div class="form-group">
                                <label for="edit-income-member">¿Quién recibe el ingreso?</label>
                                <select id="edit-income-member" required>
                                    <option value="usuario" ${ingreso.miembro === 'usuario' ? 'selected' : ''}>Tú</option>
                                    <option value="pareja" ${ingreso.miembro === 'pareja' ? 'selected' : ''}>Tu pareja</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-income-amount">Monto</label>
                                <div class="input-group">
                                    <span class="input-prefix">$</span>
                                    <input type="number" id="edit-income-amount" min="0" step="0.01" required value="${ingreso.monto}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="edit-income-frequency">Frecuencia</label>
                                <select id="edit-income-frequency" required>
                                    <option value="mensual" ${ingreso.frecuencia === 'mensual' ? 'selected' : ''}>Mensual</option>
                                    <option value="quincenal" ${ingreso.frecuencia === 'quincenal' ? 'selected' : ''}>Quincenal</option>
                                    <option value="semestral" ${ingreso.frecuencia === 'semestral' ? 'selected' : ''}>Semestral</option>
                                    <option value="anual" ${ingreso.frecuencia === 'anual' ? 'selected' : ''}>Anual</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-income-description">Descripción</label>
                                <input type="text" id="edit-income-description" value="${ingreso.descripcion}">
                            </div>
                            <div class="form-group">
                                <label for="edit-income-date">Fecha</label>
                                <input type="date" id="edit-income-date" required value="${ingreso.fecha}">
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn-secondary" onclick="this.closest('.modal').classList.remove('active')">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Agregar modal al body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Configurar evento de submit
        const form = document.getElementById('edit-ingreso-form');
        if (form) {
            form.addEventListener('submit', (e) => this.guardarCambiosIngreso(e, id));
        }
    }

    async guardarCambiosIngreso(e, ingresoId) {
        e.preventDefault();
        
        console.log('=== GUARDAR CAMBIOS INGRESO ===', ingresoId);
        
        const miembro = document.getElementById('edit-income-member').value;
        const monto = parseFloat(document.getElementById('edit-income-amount').value);
        const frecuencia = document.getElementById('edit-income-frequency').value;
        const descripcion = document.getElementById('edit-income-description').value;
        const fecha = document.getElementById('edit-income-date').value;
        
        try {
            const { data, error } = await supabase
                .from('ingresos_pareja')
                .update({
                    miembro: miembro,
                    monto: monto,
                    frecuencia: frecuencia,
                    descripcion: descripcion,
                    fecha: fecha
                })
                .eq('id', ingresoId)
                .select();

            if (error) throw error;
            
            // Cerrar modal
            const modal = document.getElementById('edit-ingreso-modal');
            if (modal) modal.remove();
            
            // Recargar datos y actualizar interfaz
            await this.cargarConfiguracion();
            this.actualizarInterfaz();
            
            this.mostrarNotificación('Ingreso actualizado exitosamente', 'success');
        } catch (error) {
            console.error('Error actualizando ingreso:', error);
            this.mostrarNotificación('Error al actualizar ingreso', 'error');
        }
    }

    async eliminarIngreso(id) {
        console.log('=== ELIMINAR INGRESO ===', id);
        
        if (confirm('¿Estás seguro de eliminar este ingreso?')) {
            try {
                const { error } = await supabase
                    .from('ingresos_pareja')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                
                // Recargar datos y actualizar interfaz
                await this.cargarConfiguracion();
                this.actualizarInterfaz();
                
                this.mostrarNotificación('Ingreso eliminado exitosamente', 'success');
            } catch (error) {
                console.error('Error eliminando ingreso:', error);
                this.mostrarNotificación('Error al eliminar ingreso', 'error');
            }
        }
    }

    async editarGasto(id) {
        console.log('=== EDITAR GASTO ===', id);
        
        // Buscar el gasto en la lista
        const gasto = this.gastos.find(g => g.id == id);
        if (!gasto) {
            this.mostrarNotificación('Gasto no encontrado', 'error');
            return;
        }
        
        console.log('📊 Gasto a editar:', gasto);
        
        // Crear modal de edición
        const modalHtml = `
            <div id="edit-gasto-modal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Editar Gasto</h3>
                        <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-gasto-form">
                            <div class="form-group">
                                <label for="edit-expense-description">Descripción</label>
                                <input type="text" id="edit-expense-description" required value="${gasto.descripcion}">
                            </div>
                            <div class="form-group">
                                <label for="edit-expense-amount">Monto</label>
                                <div class="input-group">
                                    <span class="input-prefix">$</span>
                                    <input type="number" id="edit-expense-amount" min="0" step="0.01" required value="${gasto.monto}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="edit-expense-category">Categoría</label>
                                <select id="edit-expense-category" required>
                                    <option value="alimentacion" ${gasto.categoria === 'alimentacion' ? 'selected' : ''}>Alimentación</option>
                                    <option value="vivienda" ${gasto.categoria === 'vivienda' ? 'selected' : ''}>Vivienda</option>
                                    <option value="transporte" ${gasto.categoria === 'transporte' ? 'selected' : ''}>Transporte</option>
                                    <option value="servicios" ${gasto.categoria === 'servicios' ? 'selected' : ''}>Servicios</option>
                                    <option value="entretenimiento" ${gasto.categoria === 'entretenimiento' ? 'selected' : ''}>Entretenimiento</option>
                                    <option value="salud" ${gasto.categoria === 'salud' ? 'selected' : ''}>Salud</option>
                                    <option value="otros" ${gasto.categoria === 'otros' ? 'selected' : ''}>Otros</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-expense-date">Fecha</label>
                                <input type="date" id="edit-expense-date" required value="${gasto.fecha}">
                            </div>
                            <div class="form-group">
                                <label for="edit-expense-paid-by">¿Quién pagó?</label>
                                <select id="edit-expense-paid-by" required>
                                    <option value="usuario" ${gasto.pagado_por === 'usuario' ? 'selected' : ''}>Tú</option>
                                    <option value="pareja" ${gasto.pagado_por === 'pareja' ? 'selected' : ''}>Tu pareja</option>
                                </select>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn-secondary" onclick="this.closest('.modal').classList.remove('active')">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Agregar modal al body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Configurar evento de submit
        const form = document.getElementById('edit-gasto-form');
        if (form) {
            form.addEventListener('submit', (e) => this.guardarCambiosGasto(e, id));
        }
    }

    async guardarCambiosGasto(e, gastoId) {
        e.preventDefault();
        
        console.log('=== GUARDAR CAMBIOS GASTO ===', gastoId);
        
        const descripcion = document.getElementById('edit-expense-description').value;
        const monto = parseFloat(document.getElementById('edit-expense-amount').value);
        const categoria = document.getElementById('edit-expense-category').value;
        const fecha = document.getElementById('edit-expense-date').value;
        const pagadoPor = document.getElementById('edit-expense-paid-by').value;
        
        try {
            const porcentajes = this.calcularPorcentajes();
            
            const { data, error } = await supabase
                .from('gastos_compartidos')
                .update({
                    descripcion: descripcion,
                    monto: monto,
                    categoria: categoria,
                    fecha: fecha,
                    pagado_por: pagadoPor,
                    monto_usuario: (monto * porcentajes.usuario) / 100,
                    monto_pareja: (monto * porcentajes.pareja) / 100,
                    porcentaje_usuario: porcentajes.usuario,
                    porcentaje_pareja: porcentajes.pareja
                })
                .eq('id', gastoId)
                .select();

            if (error) throw error;
            
            // Cerrar modal
            const modal = document.getElementById('edit-gasto-modal');
            if (modal) modal.remove();
            
            // Recargar datos y actualizar interfaz
            await this.cargarConfiguracion();
            this.actualizarInterfaz();
            
            this.mostrarNotificación('Gasto actualizado exitosamente', 'success');
        } catch (error) {
            console.error('Error actualizando gasto:', error);
            this.mostrarNotificación('Error al actualizar gasto', 'error');
        }
    }

    async eliminarGasto(id) {
        console.log('=== ELIMINAR GASTO ===', id);
        
        if (confirm('¿Estás seguro de eliminar este gasto?')) {
            try {
                const { error } = await supabase
                    .from('gastos_compartidos')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                
                // Recargar datos y actualizar interfaz
                await this.cargarConfiguracion();
                this.actualizarInterfaz();
                
                this.mostrarNotificación('Gasto eliminado exitosamente', 'success');
            } catch (error) {
                console.error('Error eliminando gasto:', error);
                this.mostrarNotificación('Error al eliminar gasto', 'error');
            }
        }
    }

    mostrarNotificación(mensaje, tipo = 'info') {
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.textContent = mensaje;
        
        Object.assign(notificacion.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // Colores según tipo
        const colores = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notificacion.style.backgroundColor = colores[tipo] || colores.info;

        document.body.appendChild(notificacion);

        // Animación de entrada
        setTimeout(() => {
            notificacion.style.transform = 'translateX(0)';
        }, 100);

        // Remover después de 3 segundos
        setTimeout(() => {
            notificacion.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.parentNode.removeChild(notificacion);
                }
            }, 300);
        }, 3000);
    }

    // Funciones para gráficas
    inicializarGraficas() {
        console.log('📊 Inicializando gráficas...');
        
        // Configuración común para todas las gráficas
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        };

        // Gráfica de ingresos
        const ingresosCtx = document.getElementById('ingresos-chart');
        if (ingresosCtx) {
            this.ingresosChart = new Chart(ingresosCtx, {
                type: 'bar',
                data: {
                    labels: [this.configuracion.nombreUsuario || 'Tú', this.configuracion.nombrePareja || 'Tu Pareja'],
                    datasets: [{
                        label: 'Ingresos Totales',
                        data: [0, 0],
                        backgroundColor: ['#3b82f6', '#10b981'], // Azul para usuario, verde para pareja
                        borderColor: ['#2563eb', '#059669'],
                        borderWidth: 2
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        ...chartOptions.plugins,
                        title: {
                            display: true,
                            text: 'Ingresos por Miembro'
                        }
                    }
                }
            });
        }

        // Gráfica de gastos por categoría
        const gastosCtx = document.getElementById('gastos-chart');
        if (gastosCtx) {
            this.gastosChart = new Chart(gastosCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Gastos por Categoría',
                        data: [],
                        backgroundColor: '#6366f1',
                        borderColor: '#4f46e5',
                        borderWidth: 1
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        ...chartOptions.plugins,
                        title: {
                            display: true,
                            text: 'Gastos por Categoría'
                        }
                    }
                }
            });
        }

        // Gráfica de división de gastos
        const divisionCtx = document.getElementById('division-chart');
        if (divisionCtx) {
            this.divisionChart = new Chart(divisionCtx, {
                type: 'pie',
                data: {
                    labels: [this.configuracion.nombreUsuario || 'Tú', this.configuracion.nombrePareja || 'Tu Pareja'],
                    datasets: [{
                        data: [50, 50],
                        backgroundColor: ['#10b981', '#f59e0b'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    ...chartOptions,
                    plugins: {
                        ...chartOptions.plugins,
                        title: {
                            display: true,
                            text: 'División de Gastos'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    cambiarGrafica(chartType) {
        // Actualizar pestañas
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');

        // Actualizar gráficas
        document.querySelectorAll('.chart-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById(`chart-${chartType}`).classList.add('active');
    }

    actualizarGraficas() {
        console.log('📊 Actualizando gráficas...');
        
        // Actualizar gráfica de ingresos
        if (this.ingresosChart) {
            const ingresosIndividualesUsuario = this.ingresos
                .filter(i => i.miembro === 'usuario')
                .reduce((sum, i) => sum + i.monto, 0);
            
            const ingresosIndividualesPareja = this.ingresos
                .filter(i => i.miembro === 'pareja')
                .reduce((sum, i) => sum + i.monto, 0);
            
            const ingresosTotalesUsuario = this.configuracion.ingresosUsuario + ingresosIndividualesUsuario;
            const ingresosTotalesPareja = this.configuracion.ingresosPareja + ingresosIndividualesPareja;

            this.ingresosChart.data.datasets[0].data = [ingresosTotalesUsuario, ingresosTotalesPareja];
            this.ingresosChart.data.labels = [this.configuracion.nombreUsuario || 'Tú', this.configuracion.nombrePareja || 'Tu Pareja'];
            this.ingresosChart.update();
        }

        // Actualizar gráfica de gastos por categoría
        if (this.gastosChart) {
            const gastosPorCategoria = {};
            const categoriaLabels = {
                alimentacion: 'Alimentación',
                vivienda: 'Vivienda',
                transporte: 'Transporte',
                servicios: 'Servicios',
                entretenimiento: 'Entretenimiento',
                salud: 'Salud',
                otros: 'Otros'
            };

            this.gastos.forEach(gasto => {
                const categoria = categoriaLabels[gasto.categoria] || gasto.categoria;
                gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + gasto.monto;
            });

            this.gastosChart.data.labels = Object.keys(gastosPorCategoria);
            this.gastosChart.data.datasets[0].data = Object.values(gastosPorCategoria);
            this.gastosChart.update();
        }

        // Actualizar gráfica de división
        if (this.divisionChart) {
            const porcentajes = this.calcularPorcentajesConIngresos(
                this.configuracion.ingresosUsuario + this.ingresos.filter(i => i.miembro === 'usuario').reduce((sum, i) => sum + i.monto, 0),
                this.configuracion.ingresosPareja + this.ingresos.filter(i => i.miembro === 'pareja').reduce((sum, i) => sum + i.monto, 0)
            );

            this.divisionChart.data.datasets[0].data = [porcentajes.usuario, porcentajes.pareja];
            this.divisionChart.data.labels = [this.configuracion.nombreUsuario || 'Tú', this.configuracion.nombrePareja || 'Tu Pareja'];
            this.divisionChart.update();
        }
    }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.finanzasPareja = new FinanzasPareja();
});
