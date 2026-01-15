class GestionGastosNegocio {
    constructor() {
        this.gastos = this.cargarGastos();
        this.editando = false;
        this.gastoIdEliminar = null;
        this.init();
    }

    init() {
        this.configurarEventListeners();
        this.establecerFechaActual();
        this.cargarGastosEnTabla();
        this.actualizarEstadisticas();
    }

    configurarEventListeners() {
        // Formulario
        document.getElementById('gastoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarGasto();
        });

        // Botones
        document.getElementById('btnCancelar').addEventListener('click', () => {
            this.cancelarEdicion();
        });

        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
            this.limpiarFiltros();
        });

        // Filtros
        document.getElementById('busqueda').addEventListener('input', () => {
            this.filtrarGastos();
        });

        document.getElementById('filtroCategoria').addEventListener('change', () => {
            this.filtrarGastos();
        });

        document.getElementById('filtroMes').addEventListener('change', () => {
            this.filtrarGastos();
        });

        // Modal
        const modal = document.getElementById('confirmModal');
        const closeBtn = modal.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            this.cerrarModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cerrarModal();
            }
        });

        document.getElementById('btnConfirmarEliminar').addEventListener('click', () => {
            this.confirmarEliminar();
        });

        document.getElementById('btnCancelarEliminar').addEventListener('click', () => {
            this.cerrarModal();
        });
    }

    establecerFechaActual() {
        const fechaInput = document.getElementById('fecha');
        const hoy = new Date().toISOString().split('T')[0];
        fechaInput.value = hoy;
        fechaInput.max = hoy;
    }

    generarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    cargarGastos() {
        const gastosGuardados = localStorage.getItem('gastos_negocio');
        return gastosGuardados ? JSON.parse(gastosGuardados) : [];
    }

    guardarGastosEnStorage() {
        localStorage.setItem('gastos_negocio', JSON.stringify(this.gastos));
    }

    validarFormulario() {
        const concepto = document.getElementById('concepto').value.trim();
        const monto = parseFloat(document.getElementById('monto').value);
        const fecha = document.getElementById('fecha').value;
        const categoria = document.getElementById('categoria').value;

        if (!concepto) {
            this.mostrarNotificacion('El concepto es obligatorio', 'error');
            return false;
        }

        if (!monto || monto <= 0) {
            this.mostrarNotificacion('El monto debe ser mayor a 0', 'error');
            return false;
        }

        if (!fecha) {
            this.mostrarNotificacion('La fecha es obligatoria', 'error');
            return false;
        }

        if (!categoria) {
            this.mostrarNotificacion('Debe seleccionar una categoría', 'error');
            return false;
        }

        return true;
    }

    guardarGasto() {
        if (!this.validarFormulario()) {
            return;
        }

        const gasto = {
            id: document.getElementById('gastoId').value || this.generarId(),
            concepto: document.getElementById('concepto').value.trim(),
            monto: parseFloat(document.getElementById('monto').value),
            fecha: document.getElementById('fecha').value,
            categoria: document.getElementById('categoria').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            creadoEn: new Date().toISOString()
        };

        if (this.editando) {
            const index = this.gastos.findIndex(g => g.id === gasto.id);
            if (index !== -1) {
                this.gastos[index] = { ...this.gastos[index], ...gasto };
                this.mostrarNotificacion('Gasto actualizado correctamente', 'success');
            }
        } else {
            this.gastos.push(gasto);
            this.mostrarNotificacion('Gasto registrado correctamente', 'success');
        }

        this.guardarGastosEnStorage();
        this.cargarGastosEnTabla();
        this.actualizarEstadisticas();
        this.limpiarFormulario();
        this.cancelarEdicion();
    }

    editarGasto(id) {
        const gasto = this.gastos.find(g => g.id === id);
        if (!gasto) {
            this.mostrarNotificacion('Gasto no encontrado', 'error');
            return;
        }

        document.getElementById('gastoId').value = gasto.id;
        document.getElementById('concepto').value = gasto.concepto;
        document.getElementById('monto').value = gasto.monto;
        document.getElementById('fecha').value = gasto.fecha;
        document.getElementById('categoria').value = gasto.categoria;
        document.getElementById('descripcion').value = gasto.descripcion;

        this.editando = true;
        document.getElementById('btnSubmitText').textContent = 'Actualizar Gasto';
        document.getElementById('btnCancelar').style.display = 'inline-flex';

        // Scroll al formulario
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }

    cancelarEdicion() {
        this.editando = false;
        this.limpiarFormulario();
        document.getElementById('btnSubmitText').textContent = 'Registrar Gasto';
        document.getElementById('btnCancelar').style.display = 'none';
    }

    eliminarGasto(id) {
        const gasto = this.gastos.find(g => g.id === id);
        if (!gasto) {
            this.mostrarNotificacion('Gasto no encontrado', 'error');
            return;
        }

        this.gastoIdEliminar = id;
        document.getElementById('gastoEliminar').textContent = `${gasto.concepto} - $${gasto.monto.toFixed(2)}`;
        document.getElementById('confirmModal').style.display = 'block';
    }

    confirmarEliminar() {
        if (!this.gastoIdEliminar) return;

        const index = this.gastos.findIndex(g => g.id === this.gastoIdEliminar);
        if (index !== -1) {
            this.gastos.splice(index, 1);
            this.guardarGastosEnStorage();
            this.cargarGastosEnTabla();
            this.actualizarEstadisticas();
            this.mostrarNotificacion('Gasto eliminado correctamente', 'success');
        }

        this.cerrarModal();
    }

    cerrarModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.gastoIdEliminar = null;
    }

    limpiarFormulario() {
        document.getElementById('gastoForm').reset();
        document.getElementById('gastoId').value = '';
        this.establecerFechaActual();
    }

    limpiarFiltros() {
        document.getElementById('busqueda').value = '';
        document.getElementById('filtroCategoria').value = '';
        document.getElementById('filtroMes').value = '';
        this.cargarGastosEnTabla();
    }

    filtrarGastos() {
        const busqueda = document.getElementById('busqueda').value.toLowerCase();
        const categoria = document.getElementById('filtroCategoria').value;
        const mes = document.getElementById('filtroMes').value;

        let gastosFiltrados = this.gastos;

        // Filtrar por búsqueda
        if (busqueda) {
            gastosFiltrados = gastosFiltrados.filter(gasto => 
                gasto.concepto.toLowerCase().includes(busqueda) ||
                gasto.descripcion.toLowerCase().includes(busqueda)
            );
        }

        // Filtrar por categoría
        if (categoria) {
            gastosFiltrados = gastosFiltrados.filter(gasto => gasto.categoria === categoria);
        }

        // Filtrar por mes
        if (mes) {
            gastosFiltrados = gastosFiltrados.filter(gasto => 
                gasto.fecha.startsWith(mes)
            );
        }

        this.mostrarGastosEnTabla(gastosFiltrados);
    }

    cargarGastosEnTabla() {
        // Ordenar gastos por fecha (más recientes primero)
        const gastosOrdenados = [...this.gastos].sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );
        this.mostrarGastosEnTabla(gastosOrdenados);
    }

    mostrarGastosEnTabla(gastos) {
        const tbody = document.getElementById('gastosTableBody');
        const noGastosMessage = document.getElementById('noGastosMessage');

        if (gastos.length === 0) {
            tbody.innerHTML = '';
            noGastosMessage.style.display = 'block';
            return;
        }

        noGastosMessage.style.display = 'none';
        tbody.innerHTML = gastos.map(gasto => `
            <tr>
                <td>${this.formatearFecha(gasto.fecha)}</td>
                <td><strong>${this.escapeHtml(gasto.concepto)}</strong></td>
                <td>
                    <span class="categoria-badge categoria-${gasto.categoria}">
                        ${this.getCategoriaNombre(gasto.categoria)}
                    </span>
                </td>
                <td><strong>$${gasto.monto.toFixed(2)}</strong></td>
                <td>${this.escapeHtml(gasto.descripcion) || '<em>Sin descripción</em>'}</td>
                <td>
                    <div class="acciones">
                        <button class="btn-action btn-editar" onclick="gestionGastos.editarGasto('${gasto.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-eliminar" onclick="gestionGastos.eliminarGasto('${gasto.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    actualizarEstadisticas() {
        const totalGastos = this.gastos.reduce((total, gasto) => total + gasto.monto, 0);
        const fechaActual = new Date();
        const mesActual = fechaActual.toISOString().slice(0, 7);
        
        const gastosMes = this.gastos
            .filter(gasto => gasto.fecha.startsWith(mesActual))
            .reduce((total, gasto) => total + gasto.monto, 0);

        document.getElementById('totalGastos').textContent = `$${totalGastos.toFixed(2)}`;
        document.getElementById('gastosMes').textContent = `$${gastosMes.toFixed(2)}`;
    }

    getCategoriaNombre(categoria) {
        const categorias = {
            alquiler: 'Alquiler',
            servicios: 'Servicios',
            suministros: 'Suministros',
            personal: 'Personal',
            marketing: 'Marketing',
            tecnologia: 'Tecnología',
            transporte: 'Transporte',
            impuestos: 'Impuestos',
            mantenimiento: 'Mantenimiento',
            otros: 'Otros'
        };
        return categorias[categoria] || categoria;
    }

    formatearFecha(fecha) {
        const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(fecha).toLocaleDateString('es-ES', opciones);
    }

    escapeHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = mensaje;
        notification.className = `notification ${tipo}`;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Métodos para conexión con base de datos (futuro)
    async sincronizarConBaseDeDatos() {
        // Este método se implementaría cuando se conecte a una base de datos real
        try {
            // Aquí iría la lógica para sincronizar con el servidor
            this.mostrarNotificacion('Sincronización exitosa', 'success');
        } catch (error) {
            this.mostrarNotificacion('Error al sincronizar', 'error');
        }
    }

    // Métodos para exportar/importar datos
    exportarDatos() {
        const datos = {
            gastos: this.gastos,
            fechaExportacion: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gastos_negocio_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.mostrarNotificacion('Datos exportados correctamente', 'success');
    }

    importarDatos(archivo) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const datos = JSON.parse(e.target.result);
                if (datos.gastos && Array.isArray(datos.gastos)) {
                    this.gastos = datos.gastos;
                    this.guardarGastosEnStorage();
                    this.cargarGastosEnTabla();
                    this.actualizarEstadisticas();
                    this.mostrarNotificacion('Datos importados correctamente', 'success');
                } else {
                    throw new Error('Formato de archivo inválido');
                }
            } catch (error) {
                this.mostrarNotificacion('Error al importar datos', 'error');
            }
        };
        reader.readAsText(archivo);
    }
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    window.gestionGastos = new GestionGastosNegocio();
});

// Funciones globales para accesibilidad desde HTML
window.editarGasto = (id) => {
    window.gestionGastos.editarGasto(id);
};

window.eliminarGasto = (id) => {
    window.gestionGastos.eliminarGasto(id);
};
