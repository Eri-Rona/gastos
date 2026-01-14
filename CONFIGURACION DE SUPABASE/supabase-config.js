// Configuración de Supabase
// REEMPLAZA ESTOS VALORES CON TUS CREDENCIALES REALES

const SUPABASE_CONFIG = {
    url: 'https://iyzsyxdxagdhdhlcudwm.supabase.co',
    anonKey: 'sb_publishable_r39r-chPCfaVE-z-jtSlSg_jP9vh75i',
    options: {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
};

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
} else {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
