// ===============================
// REFERENCIA A SUPABASE GLOBAL
// ===============================
const supabase = window.supabase;

// ===============================
// REDIRECCIÓN FINAL
// ===============================
function redirigir() {
    window.location.href = "recopilaciondatosusuario/datosdeusuario.html";
}

// ===============================
// DETECTAR SESIÓN (CLAVE)
// ===============================
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth event:", event);

    if (event === "SIGNED_IN" && session) {
        // Verificar si el usuario tiene perfil completo
        const hasCompleteProfile = await checkUserProfile(session.user);
        
        if (hasCompleteProfile) {
            // Usuario con perfil completo → Dashboard
            window.location.href = "Dashboard/Dashboard.html";
        } else {
            // Usuario sin perfil o incompleto → Recopilación de datos
            window.location.href = "recopilaciondatosusuario/datosdeusuario.html";
        }
    }
});

// ===============================
// VERIFICAR PERFIL COMPLETO
// ===============================
async function checkUserProfile(user) {
    try {
        const { data, error } = await supabase
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

// ===============================
// LOGIN EMAIL
// ===============================
document.getElementById("login-form-element").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        document.getElementById("login-message").textContent = error.message;
    }
});

// ===============================
// REGISTRO EMAIL
// ===============================
document.getElementById("register-form-element").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirm = document.getElementById("confirm-password").value;

    if (password !== confirm) {
        document.getElementById("register-message").textContent = "Las contraseñas no coinciden";
        return;
    }

    const { error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        document.getElementById("register-message").textContent = error.message;
    }
});

// ===============================
// OAUTH (GOOGLE / GITHUB / DISCORD)
// ===============================
async function oauth(provider) {
    await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: "http://localhost/PROYECTO%203PARCIAL/index.html"
        }
    });
}

document.getElementById("google-login-btn").onclick = () => oauth("google");
document.getElementById("google-register-btn").onclick = () => oauth("google");

document.getElementById("github-login-btn").onclick = () => oauth("github");
document.getElementById("github-register-btn").onclick = () => oauth("github");

document.getElementById("discord-login-btn").onclick = () => oauth("discord");
document.getElementById("discord-register-btn").onclick = () => oauth("discord");

// ===============================
// CAMBIO DE FORMULARIOS
// ===============================
document.getElementById("show-register").onclick = () => {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
};

document.getElementById("show-login").onclick = () => {
    document.getElementById("register-form").style.display = "none";
    document.getElementById("login-form").style.display = "block";
};
