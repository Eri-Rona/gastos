-- Tabla de usuarios para recopilación de datos (versión actualizada)
-- DROP TABLE IF EXISTS usuarios; -- Descomentar si necesitas recrear la tabla

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT,
    foto_perfil TEXT, -- Base64
    tipo_fines TEXT[], -- Array de fines: ['personales', 'negocio', 'pareja']
    tipo_pago TEXT CHECK (tipo_pago IN ('mensual', 'semestral', 'quincenal', 'anual')),
    monto_pago DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de seguridad (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Solo el usuario puede ver y editar sus propios datos
CREATE POLICY "Users can view own profile" ON usuarios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON usuarios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON usuarios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_user_id ON usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_fines ON usuarios USING GIN(tipo_fines);

-- Función para migrar datos antiguos al nuevo formato (opcional)
CREATE OR REPLACE FUNCTION migrate_tipo_fines_to_array()
RETURNS void AS $$
BEGIN
    -- Convertir strings antiguos a arrays
    UPDATE usuarios 
    SET tipo_fines = ARRAY[tipo_fines] 
    WHERE tipo_fines IS NOT NULL 
    AND jsonb_typeof(tipo_fines) = 'string';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar migración (descomentar si necesitas migrar datos existentes)
-- SELECT migrate_tipo_fines_to_array();
