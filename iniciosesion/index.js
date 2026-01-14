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
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event);

    if (event === "SIGNED_IN" && session) {
        redirigir();
    }
});

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
