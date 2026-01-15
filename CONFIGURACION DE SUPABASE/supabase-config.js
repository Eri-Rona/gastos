// Configuración de Supabase
// CREDENCIALES REALES - NO MODIFICAR

const SUPABASE_CONFIG = {
    url: 'https://iyzsyxdxagdhdhlcudwm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5enN5eGR4YWdkaGRobGN1ZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjM0NDgsImV4cCI6MjA4Mzk5OTQ0OH0.VGrgbhr-7KqoBxeNSEAF7HVfinbkGPwFnCONnLetFPs',
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
