// Cliente de Supabase
// Usar Supabase desde el CDN (ya cargado en el HTML)
const { createClient } = window.supabase;

// Obtener configuración
const config = window.SUPABASE_CONFIG;

// Crear el cliente de Supabase y asignarlo globalmente
window.supabase = createClient(
    config.url,
    config.anonKey,
    config.options
);

// Funciones de autenticación
window.auth = {
    // Registrar usuario
    async signUp(email, password) {
        try {
            const { data, error } = await window.supabase.auth.signUp({
                email,
                password
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Iniciar sesión con Google
    async signInWithGoogle() {
        try {
            const { data, error } = await window.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'http://localhost/PROYECTO%203PARCIAL/index.html'
                }
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Iniciar sesión con GitHub
    async signInWithGitHub() {
        try {
            const { data, error } = await window.supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: 'http://localhost/PROYECTO%203PARCIAL/index.html'
                }
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Iniciar sesión con Discord
    async signInWithDiscord() {
        try {
            const { data, error } = await window.supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: 'http://localhost/PROYECTO%203PARCIAL/index.html'
                }
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Iniciar sesión
    async signIn(email, password) {
        try {
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email,
                password
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Cerrar sesión
    async signOut() {
        try {
            const { error } = await window.supabase.auth.signOut();
            return { error };
        } catch (error) {
            return { error };
        }
    },

    // Obtener usuario actual
    async getCurrentUser() {
        try {
            const { data: { session }, error } = await window.supabase.auth.getSession();
            return { user: session?.user || null, error };
        } catch (error) {
            return { user: null, error };
        }
    },

    // Escuchar cambios de autenticación
    onAuthStateChange(callback) {
        return window.supabase.auth.onAuthStateChange(callback);
    }
};
