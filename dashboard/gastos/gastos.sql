-- Tabla de Gastos para el sistema de gestión
-- DROP TABLE IF EXISTS gastos; -- Descomentar si necesitas recrear la tabla

CREATE TABLE IF NOT EXISTS gastos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL CHECK (
        category IN (
            -- Alimentación
            'supermercado', 'restaurant', 'cafe', 'comida_rapida', 'delivery', 'bebidas', 'alimentos_mascotas',
            -- Transporte
            'gasolina', 'transporte_publico', 'taxi_uber', 'mantenimiento_vehiculo', 'seguro_vehiculo', 'peajes', 'estacionamiento', 'repuestos',
            -- Vivienda
            'renta', 'hipoteca', 'servicios_basicos', 'electricidad', 'agua', 'gas', 'internet', 'telefono', 'cable', 'impuestos_vivienda',
            -- Salud y Bienestar
            'medicamentos', 'consultas_medicas', 'seguro_salud', 'dentista', 'optica', 'gimnasio', 'suplementos', 'terapia', 'examenes_medicos',
            -- Compras
            'ropa', 'electronica', 'hogar', 'libros', 'juguetes', 'regalos', 'cosmeticos', 'herramientas', 'muebles',
            -- Entretenimiento
            'cine', 'streaming', 'videojuegos', 'conciertos', 'deportes', 'libros_entretenimiento', 'hobbies', 'viajes_entretenimiento',
            -- Educación
            'matricula', 'cursos', 'material_escolar', 'idiomas', 'universidad', 'tutorias', 'certificaciones',
            -- Finanzas
            'inversiones', 'ahorros', 'comisiones_bancarias', 'impuestos', 'multas', 'prestamos', 'tarjetas_credito', 'asesor_financiero',
            -- Trabajo
            'transporte_trabajo', 'comida_trabajo', 'uniformes', 'herramientas_trabajo', 'capacitacion_empresa', 'eventos_empresa',
            -- Mascotas
            'veterinaria', 'accesorios_mascotas', 'paseo_mascotas', 'seguro_mascotas', 'juguete_mascotas',
            -- Servicios
            'lavanderia', 'limpieza', 'reparaciones', 'mantenimiento', 'suscripciones', 'hosting_dominios', 'software',
            -- Personal
            'cuidado_personal', 'peluqueria', 'spa', 'gimnasio_personal', 'psicologo', 'abogado',
            -- Emergencias
            'emergencias_medicas', 'reparaciones_urgentes', 'seguro_emergencia',
            -- Otros
            'donaciones', 'regalo_aniversario', 'regalo_cumpleaños', 'impuestos_varios', 'gastos_no_categorizados'
        )
    ),
    description TEXT NOT NULL CHECK (description <> ''),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de seguridad (RLS)
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Solo el usuario puede ver sus propios gastos
CREATE POLICY "Users can view own expenses" ON gastos
    FOR SELECT USING (auth.uid() = user_id);

-- Solo el usuario puede insertar sus propios gastos
CREATE POLICY "Users can insert own expenses" ON gastos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Solo el usuario puede actualizar sus propios gastos
CREATE POLICY "Users can update own expenses" ON gastos
    FOR UPDATE USING (auth.uid() = user_id);

-- Solo el usuario puede eliminar sus propios gastos
CREATE POLICY "Users can delete own expenses" ON gastos
    FOR DELETE USING (auth.uid() = user_id);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_gastos_user_id ON gastos(user_id);
CREATE INDEX IF NOT EXISTS idx_gastos_date ON gastos(date);
CREATE INDEX IF NOT EXISTS idx_gastos_category ON gastos(category);
CREATE INDEX IF NOT EXISTS idx_gastos_created_at ON gastos(created_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gastos_updated_at 
    BEFORE UPDATE ON gastos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Función para obtener estadísticas de gastos del usuario
CREATE OR REPLACE FUNCTION get_user_expenses_stats(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_amount DECIMAL,
    expense_count BIGINT,
    avg_amount DECIMAL,
    max_amount DECIMAL,
    min_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) as expense_count,
        COALESCE(AVG(amount), 0) as avg_amount,
        COALESCE(MAX(amount), 0) as max_amount,
        COALESCE(MIN(amount), 0) as min_amount
    FROM gastos 
    WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener gastos por categoría
CREATE OR REPLACE FUNCTION get_expenses_by_category(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    category TEXT,
    total_amount DECIMAL,
    expense_count BIGINT,
    percentage DECIMAL
) AS $$
DECLARE
    total_sum DECIMAL;
BEGIN
    -- Obtener el total general
    SELECT COALESCE(SUM(amount), 0) INTO total_sum
    FROM gastos 
    WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);
    
    -- Retornar los datos por categoría
    RETURN QUERY
    SELECT 
        category,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) as expense_count,
        CASE 
            WHEN total_sum > 0 THEN (COALESCE(SUM(amount), 0) * 100 / total_sum)
            ELSE 0 
        END as percentage
    FROM gastos 
    WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date)
    GROUP BY category
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para gastos recientes del usuario
CREATE OR REPLACE VIEW user_recent_expenses AS
SELECT 
    id,
    amount,
    category,
    description,
    date,
    created_at,
    updated_at
FROM gastos
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 50;

-- Función para obtener categorías organizadas por grupo
CREATE OR REPLACE FUNCTION get_expenses_by_category_group(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    category_group TEXT,
    category TEXT,
    total_amount DECIMAL,
    expense_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE
            WHEN category IN ('supermercado', 'restaurant', 'cafe', 'comida_rapida', 'delivery', 'bebidas', 'alimentos_mascotas') THEN 'Alimentación'
            WHEN category IN ('gasolina', 'transporte_publico', 'taxi_uber', 'mantenimiento_vehiculo', 'seguro_vehiculo', 'peajes', 'estacionamiento', 'repuestos') THEN 'Transporte'
            WHEN category IN ('renta', 'hipoteca', 'servicios_basicos', 'electricidad', 'agua', 'gas', 'internet', 'telefono', 'cable', 'impuestos_vivienda') THEN 'Vivienda'
            WHEN category IN ('medicamentos', 'consultas_medicas', 'seguro_salud', 'dentista', 'optica', 'gimnasio', 'suplementos', 'terapia', 'examenes_medicos') THEN 'Salud y Bienestar'
            WHEN category IN ('ropa', 'electronica', 'hogar', 'libros', 'juguetes', 'regalos', 'cosmeticos', 'herramientas', 'muebles') THEN 'Compras'
            WHEN category IN ('cine', 'streaming', 'videojuegos', 'conciertos', 'deportes', 'libros_entretenimiento', 'hobbies', 'viajes_entretenimiento') THEN 'Entretenimiento'
            WHEN category IN ('matricula', 'cursos', 'material_escolar', 'idiomas', 'universidad', 'tutorias', 'certificaciones') THEN 'Educación'
            WHEN category IN ('inversiones', 'ahorros', 'comisiones_bancarias', 'impuestos', 'multas', 'prestamos', 'tarjetas_credito', 'asesor_financiero') THEN 'Finanzas'
            WHEN category IN ('transporte_trabajo', 'comida_trabajo', 'uniformes', 'herramientas_trabajo', 'capacitacion_empresa', 'eventos_empresa') THEN 'Trabajo'
            WHEN category IN ('veterinaria', 'accesorios_mascotas', 'paseo_mascotas', 'seguro_mascotas', 'juguete_mascotas') THEN 'Mascotas'
            WHEN category IN ('lavanderia', 'limpieza', 'reparaciones', 'mantenimiento', 'suscripciones', 'hosting_dominios', 'software') THEN 'Servicios'
            WHEN category IN ('cuidado_personal', 'peluqueria', 'spa', 'gimnasio_personal', 'psicologo', 'abogado') THEN 'Personal'
            WHEN category IN ('emergencias_medicas', 'reparaciones_urgentes', 'seguro_emergencia') THEN 'Emergencias'
            ELSE 'Otros'
        END as category_group,
        category,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) as expense_count
    FROM gastos 
    WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date)
    GROUP BY category
    ORDER BY category_group, total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejemplos de consultas útiles:

-- 1. Obtener todos los gastos del usuario actual
-- SELECT * FROM gastos WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- 2. Obtener gastos del mes actual
-- SELECT * FROM gastos 
-- WHERE user_id = auth.uid() 
-- AND date >= date_trunc('month', CURRENT_DATE)
-- ORDER BY date DESC;

-- 3. Obtener gastos de hoy
-- SELECT * FROM gastos 
-- WHERE user_id = auth.uid() 
-- AND date = CURRENT_DATE
-- ORDER BY created_at DESC;

-- 4. Estadísticas del mes actual
-- SELECT * FROM get_user_expenses_stats(auth.uid(), date_trunc('month', CURRENT_DATE), CURRENT_DATE);

-- 5. Gastos por categoría del mes actual
-- SELECT * FROM get_expenses_by_category(auth.uid(), date_trunc('month', CURRENT_DATE), CURRENT_DATE);

-- 6. Gastos agrupados por categoría principal del mes actual
-- SELECT * FROM get_expenses_by_category_group(auth.uid(), date_trunc('month', CURRENT_DATE), CURRENT_DATE);
