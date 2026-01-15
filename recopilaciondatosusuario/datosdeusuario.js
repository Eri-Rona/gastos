// Importar funciones de Supabase
const auth = window.auth;
const db = window.supabase;

// Variables globales
let currentStep = 1;
const totalSteps = 5;
let currentUser = null;
let perfilData = {};

// Elementos del DOM
const progressFill = document.getElementById('progress-fill');
const currentStepSpan = document.getElementById('current-step');
const totalStepsSpan = document.getElementById('total-steps');
const message = document.getElementById('message');
const fileLabel = document.getElementById('file-label');
const fileText = document.getElementById('file-text');
const previewImg = document.getElementById('preview-img');
const fotoPerfilInput = document.getElementById('foto-perfil');

// Función para mostrar mensajes
function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';
    
    setTimeout(() => {
        message.style.display = 'none';
        message.className = 'message';
    }, 5000);
}

// Función para actualizar la barra de progreso
function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    progressFill.style.width = `${progress}%`;
    currentStepSpan.textContent = currentStep;
    totalStepsSpan.textContent = totalSteps;
}

// Función para mostrar/ocultar pasos
function showStep(step) {
    // Ocultar todos los pasos
    document.querySelectorAll('.question-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Mostrar paso actual
    setTimeout(() => {
        document.getElementById(`step-${step}`).classList.add('active');
    }, 100);
    
    updateProgress();
}

// Función para validar paso actual
function validateStep(step) {
    switch(step) {
        case 1:
            const nombre = document.getElementById('nombre-completo').value.trim();
            if (!nombre) {
                showMessage('Por favor ingresa tu nombre completo', 'error');
                return false;
            }
            perfilData.nombre_completo = nombre;
            break;
            
        case 2:
            const tipoFines = document.querySelectorAll('input[name="tipo-fines"]:checked');
            if (tipoFines.length === 0) {
                showMessage('Por favor selecciona al menos un tipo de fines', 'error');
                return false;
            }
            // Guardar como array de valores
            perfilData.tipo_fines = Array.from(tipoFines).map(input => input.value);
            break;
            
        case 3:
            const tipoPago = document.getElementById('tipo-pago').value;
            if (!tipoPago) {
                showMessage('Por favor selecciona el tipo de pago', 'error');
                return false;
            }
            perfilData.tipo_pago = tipoPago;
            break;
            
        case 4:
            const montoPago = parseFloat(document.getElementById('monto-pago').value) || 0;
            if (montoPago <= 0) {
                showMessage('Por favor ingresa un monto válido', 'error');
                return false;
            }
            perfilData.monto_pago = montoPago;
            break;
            
        case 5:
            // La foto es opcional, no se valida
            break;
    }
    
    return true;
}

// Función para avanzar al siguiente paso
function nextStep(step) {
    if (!validateStep(step)) {
        return;
    }
    
    if (step < totalSteps) {
        currentStep = step + 1;
        showStep(currentStep);
    }
}

// Función para retroceder al paso anterior
function prevStep(step) {
    if (step > 1) {
        currentStep = step - 1;
        showStep(currentStep);
    }
}

// Función para previsualizar imagen
function previewImage(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            fileText.textContent = file.name;
            fileLabel.style.borderColor = '#667eea';
            fileLabel.style.backgroundColor = '#f0f4ff';
        };
        reader.readAsDataURL(file);
    }
}

// Agregar event listener para el input de archivo
document.addEventListener('DOMContentLoaded', () => {
    if (fotoPerfilInput) {
        fotoPerfilInput.addEventListener('change', previewImage);
    }
});

// Función para omitir foto
function skipPhoto() {
    perfilData.foto_perfil = null;
    
    // Validar que tengamos los datos necesarios antes de guardar
    const hasName = !!perfilData.nombre_completo && perfilData.nombre_completo.trim() !== '';
    const hasFines = !!perfilData.tipo_fines && (
        (Array.isArray(perfilData.tipo_fines) && perfilData.tipo_fines.length > 0) ||
        (typeof perfilData.tipo_fines === 'string' && perfilData.tipo_fines.trim() !== '')
    );
    const hasPayment = !!perfilData.tipo_pago && ['mensual', 'quincenal', 'semestral', 'anual'].includes(perfilData.tipo_pago);
    const hasAmount = !!perfilData.monto_pago && parseFloat(perfilData.monto_pago) > 0;
    
    if (!hasName || !hasFines || !hasPayment || !hasAmount) {
        showMessage('Por favor completa los pasos anteriores antes de omitir la foto', 'error');
        return;
    }
    
    saveProfile();
}

// Función para convertir imagen a base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Función para obtener perfil existente
async function obtenerPerfil() {
    try {
        const { data, error } = await db
            .from('usuarios')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle(); // Usar maybeSingle en lugar de single
        
        if (error) {
            console.error('Error al obtener perfil:', error);
            return null;
        }
        
        return data; // Puede ser null si no existe perfil
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Función para guardar perfil
async function saveProfile() {
    try {
        // Validar último paso si hay foto NUEVA
        const fotoFile = fotoPerfilInput.files[0];
        if (fotoFile) {
            const base64Image = await fileToBase64(fotoFile);
            perfilData.foto_perfil = base64Image;
        }
        // NOTA: Si no hay archivo nuevo, NO eliminar la foto existente
        // Solo se actualiza si el usuario sube una nueva foto
        
        // Agregar user_id
        perfilData.user_id = currentUser.id;
        
        const { data, error } = await db
            .from('usuarios')
            .upsert(perfilData)
            .select();
        
        if (error) {
            console.error('Error al guardar perfil:', error);
            showMessage('Error al guardar tu información. Intenta nuevamente.', 'error');
            return false;
        }
        
        showMessage('¡Información guardada exitosamente!', 'success');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
            window.location.href = '../Dashboard/Dashboard.html';
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Intenta nuevamente.', 'error');
        return false;
    }
}

// Función para cargar datos existentes en el formulario
function cargarFormulario(perfil) {
    if (!perfil) return;
    
    if (perfil.nombre_completo) {
        document.getElementById('nombre-completo').value = perfil.nombre_completo;
    }
    
    if (perfil.tipo_fines) {
        // Si es array (nuevo formato)
        if (Array.isArray(perfil.tipo_fines)) {
            perfil.tipo_fines.forEach(value => {
                const checkbox = document.querySelector(`input[name="tipo-fines"][value="${value}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } 
        // Si es string (formato antiguo para compatibilidad)
        else {
            const checkbox = document.querySelector(`input[name="tipo-fines"][value="${perfil.tipo_fines}"]`);
            if (checkbox) checkbox.checked = true;
        }
    }
    
    if (perfil.tipo_pago) {
        document.getElementById('tipo-pago').value = perfil.tipo_pago;
    }
    
    if (perfil.monto_pago) {
        document.getElementById('monto-pago').value = perfil.monto_pago;
    }
    
    if (perfil.foto_perfil) {
        previewImg.src = perfil.foto_perfil;
        previewImg.style.display = 'block';
        fileText.textContent = 'Foto actual';
    }
}

// Verificar autenticación al cargar
async function inicializar() {
    try {
        const { user } = await auth.getCurrentUser();
        
        if (!user) {
            showMessage('No hay una sesión activa. Redirigiendo...', 'error');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }
        
        currentUser = user;
        
        // Cargar perfil existente
        const perfilExistente = await obtenerPerfil();
        if (perfilExistente) {
            cargarFormulario(perfilExistente);
            perfilData = { ...perfilExistente };
        }
        
        // Mostrar primer paso
        showStep(1);
        
    } catch (error) {
        console.error('Error al inicializar:', error);
        showMessage('Error al cargar la página', 'error');
    }
}

// Hacer funciones globales para que puedan ser llamadas desde onclick
window.nextStep = nextStep;
window.prevStep = prevStep;
window.skipPhoto = skipPhoto;
window.saveProfile = saveProfile;
window.previewImage = previewImage;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', inicializar);
