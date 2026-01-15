// Variables globales
let ventas = [];
let clientes = [];
let recordatorios = [];

// Funciones para modales de Ventas
function showAddSaleModal() {
    document.getElementById('addSaleModal').style.display = 'block';
    document.getElementById('addSaleModal').classList.add('show');
    cargarClientesEnSelect();
}

function closeAddSaleModal() {
    document.getElementById('addSaleModal').style.display = 'none';
    document.getElementById('addSaleModal').classList.remove('show');
    document.getElementById('addSaleForm').reset();
}

// Funciones para modales de Clientes
function showAddClientModal() {
    document.getElementById('addClientModal').style.display = 'block';
    document.getElementById('addClientModal').classList.add('show');
}

function closeAddClientModal() {
    document.getElementById('addClientModal').style.display = 'none';
    document.getElementById('addClientModal').classList.remove('show');
    document.getElementById('addClientForm').reset();
}

// Funciones para modales de Recordatorios
function showAddReminderModal() {
    document.getElementById('addReminderModal').style.display = 'block';
    document.getElementById('addReminderModal').classList.add('show');
}

function closeAddReminderModal() {
    document.getElementById('addReminderModal').style.display = 'none';
    document.getElementById('addReminderModal').classList.remove('show');
    document.getElementById('addReminderForm').reset();
}

// Función para cargar datos desde localStorage
function cargarDatos() {
    const ventasGuardadas = localStorage.getItem('ventas_negocio');
    const clientesGuardados = localStorage.getItem('clientes_negocio');
    const recordatoriosGuardados = localStorage.getItem('recordatorios_negocio');
    
    ventas = ventasGuardadas ? JSON.parse(ventasGuardadas) : [];
    clientes = clientesGuardados ? JSON.parse(clientesGuardados) : [];
    recordatorios = recordatoriosGuardados ? JSON.parse(recordatoriosGuardados) : [];
}

// Función para guardar datos en localStorage
function guardarDatos() {
    localStorage.setItem('ventas_negocio', JSON.stringify(ventas));
    localStorage.setItem('clientes_negocio', JSON.stringify(clientes));
    localStorage.setItem('recordatorios_negocio', JSON.stringify(recordatorios));
}

// Función para generar ID único
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Función para agregar venta
function agregarVenta(clienteId, producto, monto, fecha, descripcion) {
    const cliente = clientes.find(c => c.id === clienteId);
    const nuevaVenta = {
        id: generarId(),
        clienteId,
        clienteNombre: cliente ? cliente.nombre : 'Cliente no encontrado',
        producto,
        monto: parseFloat(monto),
        fecha,
        descripcion,
        creado_en: new Date().toISOString()
    };
    
    ventas.unshift(nuevaVenta);
    guardarDatos();
    actualizarInterfaz();
    mostrarNotificacion('Venta agregada exitosamente', 'success');
}

// Función para agregar cliente
function agregarCliente(nombre, email, telefono, direccion, notas) {
    const nuevoCliente = {
        id: generarId(),
        nombre,
        email,
        telefono,
        direccion,
        notas,
        creado_en: new Date().toISOString()
    };
    
    clientes.unshift(nuevoCliente);
    guardarDatos();
    actualizarInterfaz();
    mostrarNotificacion('Cliente agregado exitosamente', 'success');
}

// Función para agregar recordatorio
function agregarRecordatorio(titulo, descripcion, fecha, hora, prioridad) {
    const nuevoRecordatorio = {
        id: generarId(),
        titulo,
        descripcion,
        fecha,
        hora,
        prioridad,
        creado_en: new Date().toISOString()
    };
    
    recordatorios.unshift(nuevoRecordatorio);
    guardarDatos();
    actualizarInterfaz();
    mostrarNotificacion('Recordatorio agregado exitosamente', 'success');
}

// Función para cargar clientes en select
function cargarClientesEnSelect() {
    const select = document.getElementById('sale-client');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar cliente</option>';
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        select.appendChild(option);
    });
}

// Función para actualizar la interfaz
function actualizarInterfaz() {
    actualizarTarjetasResumen();
    actualizarActividadesRecientes();
    actualizarGraficas();
    actualizarMetricas();
}

// Función para actualizar las tarjetas de resumen
function actualizarTarjetasResumen() {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();
    
    // Ventas del mes
    const ventasMes = ventas.filter(venta => {
        const fechaVenta = new Date(venta.fecha);
        return fechaVenta.getMonth() === mesActual && fechaVenta.getFullYear() === añoActual;
    });
    
    const totalVentasMes = ventasMes.reduce((sum, venta) => sum + venta.monto, 0);
    document.getElementById('ventas-mes').textContent = `$${totalVentasMes.toFixed(2)}`;
    
    // Total clientes
    document.getElementById('total-clientes').textContent = clientes.length;
}

// Función para actualizar actividades recientes
function actualizarActividadesRecientes() {
    const listaActividades = document.getElementById('recent-activities-list');
    
    if (!listaActividades) return;
    
    // Combinar todas las actividades recientes
    const actividades = [];
    
    // Agregar ventas recientes
    ventas.slice(0, 3).forEach(venta => {
        actividades.push({
            tipo: 'venta',
            icono: '💰',
            titulo: `Venta: ${venta.producto}`,
            descripcion: `Cliente: ${venta.clienteNombre} - $${venta.monto.toFixed(2)}`,
            fecha: venta.fecha,
            color: '#28a745'
        });
    });
    
    // Agregar clientes recientes
    clientes.slice(0, 2).forEach(cliente => {
        actividades.push({
            tipo: 'cliente',
            icono: '👤',
            titulo: `Nuevo cliente: ${cliente.nombre}`,
            descripcion: cliente.email || 'Sin email',
            fecha: cliente.creado_en.split('T')[0],
            color: '#007bff'
        });
    });
    
    // Agregar recordatorios próximos
    recordatorios.slice(0, 2).forEach(recordatorio => {
        actividades.push({
            tipo: 'recordatorio',
            icono: '⏰',
            titulo: recordatorio.titulo,
            descripcion: `${recordatorio.fecha} ${recordatorio.hora} - Prioridad: ${recordatorio.prioridad}`,
            fecha: recordatorio.fecha,
            color: recordatorio.prioridad === 'alta' ? '#dc3545' : '#ffc107'
        });
    });
    
    // Ordenar por fecha
    actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (actividades.length === 0) {
        listaActividades.innerHTML = `
            <div class="no-activities">
                <p>No hay actividades recientes</p>
            </div>
        `;
        return;
    }
    
    listaActividades.innerHTML = actividades.slice(0, 5).map(actividad => `
        <div class="recent-item">
            <div class="recent-item-info">
                <div class="recent-item-concept">
                    <span style="margin-right: 8px;">${actividad.icono}</span>
                    ${actividad.titulo}
                </div>
                <div class="recent-item-date">${formatearFecha(actividad.fecha)}</div>
            </div>
            <div class="recent-item-amount" style="color: ${actividad.color};">
                ${actividad.descripcion}
            </div>
        </div>
    `).join('');
}

// Función para formatear fecha
function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notification ${tipo}`;
    notificacion.textContent = mensaje;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notificacion.classList.remove('show');
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 3000);
}

// Configurar event listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos iniciales
    cargarDatos();
    actualizarInterfaz();
    
    // Inicializar gráficas
    inicializarGraficas();
    
    // Event listener para el formulario de venta
    const addSaleForm = document.getElementById('addSaleForm');
    if (addSaleForm) {
        addSaleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const clienteId = document.getElementById('sale-client').value;
            const producto = document.getElementById('sale-product').value;
            const monto = document.getElementById('sale-amount').value;
            const fecha = document.getElementById('sale-date').value;
            const descripcion = document.getElementById('sale-description').value;
            
            if (clienteId && producto && monto && fecha) {
                agregarVenta(clienteId, producto, monto, fecha, descripcion);
                closeAddSaleModal();
            } else {
                mostrarNotificacion('Por favor completa todos los campos requeridos', 'error');
            }
        });
    }
    
    // Event listener para el formulario de cliente
    const addClientForm = document.getElementById('addClientForm');
    if (addClientForm) {
        addClientForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nombre = document.getElementById('client-name').value;
            const email = document.getElementById('client-email').value;
            const telefono = document.getElementById('client-phone').value;
            const direccion = document.getElementById('client-address').value;
            const notas = document.getElementById('client-notes').value;
            
            if (nombre) {
                agregarCliente(nombre, email, telefono, direccion, notas);
                closeAddClientModal();
            } else {
                mostrarNotificacion('El nombre del cliente es requerido', 'error');
            }
        });
    }
    
    // Event listener para el formulario de recordatorio
    const addReminderForm = document.getElementById('addReminderForm');
    if (addReminderForm) {
        addReminderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const titulo = document.getElementById('reminder-title').value;
            const descripcion = document.getElementById('reminder-description').value;
            const fecha = document.getElementById('reminder-date').value;
            const hora = document.getElementById('reminder-time').value;
            const prioridad = document.getElementById('reminder-priority').value;
            
            if (titulo && descripcion && fecha && hora && prioridad) {
                agregarRecordatorio(titulo, descripcion, fecha, hora, prioridad);
                closeAddReminderModal();
            } else {
                mostrarNotificacion('Por favor completa todos los campos requeridos', 'error');
            }
        });
    }
    
    // Event listeners para cerrar modales al hacer clic fuera
    window.addEventListener('click', function(e) {
        const modals = ['addSaleModal', 'addClientModal', 'addReminderModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        });
    });
    
    // Establecer fecha actual por defecto
    const fechaVentaInput = document.getElementById('sale-date');
    if (fechaVentaInput) {
        fechaVentaInput.valueAsDate = new Date();
    }
    
    const fechaRecordatorioInput = document.getElementById('reminder-date');
    if (fechaRecordatorioInput) {
        fechaRecordatorioInput.valueAsDate = new Date();
    }
});

// Estilos CSS adicionales
const additionalStyles = `
.no-activities {
    text-align: center;
    padding: 2rem;
    color: #666;
    font-style: italic;
}

.recent-item-concept {
    display: flex;
    align-items: center;
    font-weight: 600;
    color: #333;
}

.recent-item-amount {
    font-size: 0.9rem;
    font-weight: 500;
    max-width: 200px;
    text-align: right;
}

.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
}

.modal.show {
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    padding: 0;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease;
}

.modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 16px 16px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.3rem;
}

.close {
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    line-height: 1;
    opacity: 0.8;
    transition: opacity 0.3s ease;
}

.close:hover {
    opacity: 1;
}

.modal-body {
    padding: 2rem;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: #f8f9fa;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 80px;
}

.form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
}

.btn-primary,
.btn-secondary {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
}

@keyframes slideIn {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
`;

// Agregar estilos adicionales al head
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Variables para las gráficas
let ventasChart = null;
let clientesChart = null;
let productividadChart = null;

// Función para inicializar las gráficas
function inicializarGraficas() {
    crearVentasChart();
    crearClientesChart();
    crearProductividadChart();
}

// Función para crear gráfica de ventas mensuales
function crearVentasChart() {
    const ctx = document.getElementById('ventasChart');
    if (!ctx) return;

    const datosVentas = obtenerDatosVentasMensuales();
    
    // Si no hay datos, mostrar mensaje
    if (datosVentas.labels.length === 0) {
        ctx.getContext('2d').font = '14px Arial';
        ctx.getContext('2d').fillStyle = '#999';
        ctx.getContext('2d').textAlign = 'center';
        ctx.getContext('2d').fillText('Sin datos de ventas', ctx.width / 2, ctx.height / 2);
        return;
    }
    
    ventasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datosVentas.labels,
            datasets: [{
                label: 'Ventas',
                data: datosVentas.values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Función para crear gráfica de distribución de clientes
function crearClientesChart() {
    const ctx = document.getElementById('clientesChart');
    if (!ctx) return;

    const datosClientes = obtenerDatosClientes();
    
    // Si no hay datos, mostrar mensaje
    if (datosClientes.labels.length === 0) {
        ctx.getContext('2d').font = '14px Arial';
        ctx.getContext('2d').fillStyle = '#999';
        ctx.getContext('2d').textAlign = 'center';
        ctx.getContext('2d').fillText('Sin datos de clientes', ctx.width / 2, ctx.height / 2);
        return;
    }
    
    clientesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: datosClientes.labels,
            datasets: [{
                data: datosClientes.values,
                backgroundColor: [
                    '#28a745',
                    '#ffc107',
                    '#dc3545',
                    '#17a2b8'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Función para crear gráfica de productividad semanal
function crearProductividadChart() {
    const ctx = document.getElementById('productividadChart');
    if (!ctx) return;

    const datosProductividad = obtenerDatosProductividad();
    
    // Si no hay datos, mostrar mensaje
    if (datosProductividad.labels.length === 0) {
        ctx.getContext('2d').font = '14px Arial';
        ctx.getContext('2d').fillStyle = '#999';
        ctx.getContext('2d').textAlign = 'center';
        ctx.getContext('2d').fillText('Sin datos de actividad', ctx.width / 2, ctx.height / 2);
        return;
    }
    
    productividadChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datosProductividad.labels,
            datasets: [{
                label: 'Actividades',
                data: datosProductividad.values,
                backgroundColor: '#ffc107',
                borderColor: '#e0a800',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Función para obtener datos de ventas mensuales
function obtenerDatosVentasMensuales() {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const datosActuales = new Array(12).fill(0);
    
    ventas.forEach(venta => {
        const fecha = new Date(venta.fecha);
        const mesIndex = fecha.getMonth();
        datosActuales[mesIndex] += venta.monto;
    });
    
    // Solo mostrar meses con datos
    const mesesConDatos = [];
    const valoresConDatos = [];
    
    for (let i = 0; i < 12; i++) {
        if (datosActuales[i] > 0) {
            mesesConDatos.push(meses[i]);
            valoresConDatos.push(datosActuales[i]);
        }
    }
    
    // Si no hay datos, devolver arrays vacíos
    if (mesesConDatos.length === 0) {
        return {
            labels: [],
            values: []
        };
    }
    
    return {
        labels: mesesConDatos,
        values: valoresConDatos
    };
}

// Función para obtener datos de clientes
function obtenerDatosClientes() {
    if (clientes.length === 0) {
        return {
            labels: [],
            values: []
        };
    }
    
    // Categorizar clientes reales basados en su actividad
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const nuevos = clientes.filter(c => new Date(c.creado_en) >= hace30Dias).length;
    const antiguos = clientes.filter(c => new Date(c.creado_en) < hace30Dias).length;
    
    // Si no hay categorías con datos, devolver vacío
    if (nuevos === 0 && antiguos === 0) {
        return {
            labels: [],
            values: []
        };
    }
    
    const labels = [];
    const values = [];
    
    if (nuevos > 0) {
        labels.push('Nuevos');
        values.push(nuevos);
    }
    
    if (antiguos > 0) {
        labels.push('Antiguos');
        values.push(antiguos);
    }
    
    return {
        labels: labels,
        values: values
    };
}

// Función para obtener datos de productividad
function obtenerDatosProductividad() {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const actividadesPorDia = new Array(7).fill(0);
    
    // Obtener fecha de inicio de la semana (lunes)
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    
    // Contar actividades por día de la semana actual
    const todasLasActividades = [
        ...ventas.map(v => ({ tipo: 'venta', fecha: v.fecha })),
        ...clientes.map(c => ({ tipo: 'cliente', fecha: c.creado_en })),
        ...recordatorios.map(r => ({ tipo: 'recordatorio', fecha: r.fecha }))
    ];
    
    todasLasActividades.forEach(actividad => {
        const fechaActividad = new Date(actividad.fecha);
        const diffDias = Math.floor((fechaActividad - lunes) / (1000 * 60 * 60 * 24));
        
        if (diffDias >= 0 && diffDias < 7) {
            actividadesPorDia[diffDias]++;
        }
    });
    
    // Solo mostrar días con actividades
    const diasConActividades = [];
    const valoresConActividades = [];
    
    for (let i = 0; i < 7; i++) {
        if (actividadesPorDia[i] > 0) {
            diasConActividades.push(dias[i]);
            valoresConActividades.push(actividadesPorDia[i]);
        }
    }
    
    // Si no hay actividades, devolver arrays vacíos
    if (diasConActividades.length === 0) {
        return {
            labels: [],
            values: []
        };
    }
    
    return {
        labels: diasConActividades,
        values: valoresConActividades
    };
}

// Función para actualizar las gráficas
function actualizarGraficas() {
    if (ventasChart) {
        const datosVentas = obtenerDatosVentasMensuales();
        ventasChart.data.datasets[0].data = datosVentas.values;
        ventasChart.update();
    }
    
    if (clientesChart) {
        const datosClientes = obtenerDatosClientes();
        clientesChart.data.datasets[0].data = datosClientes.values;
        clientesChart.update();
    }
    
    if (productividadChart) {
        const datosProductividad = obtenerDatosProductividad();
        productividadChart.data.datasets[0].data = datosProductividad.values;
        productividadChart.update();
    }
}

// Función para actualizar métricas clave
function actualizarMetricas() {
    // Venta promedio
    const ventaPromedio = ventas.length > 0 
        ? ventas.reduce((sum, v) => sum + v.monto, 0) / ventas.length 
        : 0;
    document.getElementById('metric-ventas-promedio').textContent = 
        '$' + ventaPromedio.toFixed(0);
    
    // Clientes nuevos del mes
    const mesActual = new Date().getMonth();
    const añoActual = new Date().getFullYear();
    const clientesNuevos = clientes.filter(c => {
        const fecha = new Date(c.creado_en);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    }).length;
    document.getElementById('metric-clientes-nuevos').textContent = clientesNuevos;
    
    // Tasa de conversión (simulada)
    const tasaConversion = clientes.length > 0 
        ? ((ventas.length / clientes.length) * 100).toFixed(1)
        : 0;
    document.getElementById('metric-tasa-conversion').textContent = tasaConversion + '%';
    
    // Actividades de hoy
    const hoy = new Date().toDateString();
    const actividadesHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy).length +
                           clientes.filter(c => new Date(c.creado_en).toDateString() === hoy).length +
                           recordatorios.filter(r => new Date(r.fecha).toDateString() === hoy).length;
    document.getElementById('metric-actividad-dia').textContent = actividadesHoy;
}
