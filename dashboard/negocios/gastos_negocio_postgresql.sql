-- =============================================
-- Sistema de Gestión de Gastos para Negocios
-- Estructura de Base de Datos (PostgreSQL/Supabase)
-- =============================================

-- Eliminar tabla si existe para recreación
DROP TABLE IF EXISTS gastos_negocio;

-- Crear tipo ENUM para categorías
DO $$ BEGIN
    DROP TYPE IF EXISTS categoria_enum CASCADE;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;
CREATE TYPE categoria_enum AS ENUM (
    'alquiler', 
    'servicios', 
    'suministros', 
    'personal', 
    'marketing', 
    'tecnologia', 
    'transporte', 
    'impuestos', 
    'mantenimiento', 
    'otros'
);

-- Crear tipo ENUM para estados
DO $$ BEGIN
    DROP TYPE IF EXISTS estado_enum CASCADE;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;
CREATE TYPE estado_enum AS ENUM ('activo', 'eliminado');

-- Crear tabla principal de gastos
CREATE TABLE gastos_negocio (
    id VARCHAR(50) PRIMARY KEY,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL CHECK (fecha <= CURRENT_DATE),
    categoria categoria_enum NOT NULL DEFAULT 'otros',
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por VARCHAR(100),
    estado estado_enum DEFAULT 'activo'
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_gastos_negocio_fecha ON gastos_negocio(fecha);
CREATE INDEX idx_gastos_negocio_categoria ON gastos_negocio(categoria);
CREATE INDEX idx_gastos_negocio_estado ON gastos_negocio(estado);
CREATE INDEX idx_gastos_negocio_fecha_categoria ON gastos_negocio(fecha, categoria);
CREATE INDEX idx_gastos_negocio_monto ON gastos_negocio(monto);

-- Crear vista para gastos activos
CREATE OR REPLACE VIEW vista_gastos_activos AS
SELECT 
    id,
    concepto,
    monto,
    fecha,
    categoria,
    descripcion,
    creado_en,
    actualizado_en,
    creado_por
FROM gastos_negocio 
WHERE estado = 'activo';

-- Crear vista para resumen mensual
CREATE OR REPLACE VIEW vista_resumen_mensual AS
SELECT 
    TO_CHAR(fecha, 'YYYY-MM') AS mes,
    categoria,
    COUNT(*) AS cantidad_gastos,
    SUM(monto) AS total_monto,
    AVG(monto) AS promedio_monto,
    MIN(monto) AS monto_minimo,
    MAX(monto) AS monto_maximo
FROM gastos_negocio 
WHERE estado = 'activo'
GROUP BY TO_CHAR(fecha, 'YYYY-MM'), categoria
ORDER BY mes DESC, categoria;

-- Crear vista para resumen anual
CREATE OR REPLACE VIEW vista_resumen_anual AS
SELECT 
    EXTRACT(YEAR FROM fecha) AS año,
    COUNT(*) AS cantidad_gastos,
    SUM(monto) AS total_monto,
    AVG(monto) AS promedio_monto,
    MIN(monto) AS monto_minimo,
    MAX(monto) AS monto_maximo
FROM gastos_negocio 
WHERE estado = 'activo'
GROUP BY EXTRACT(YEAR FROM fecha)
ORDER BY año DESC;

-- Trigger para actualizar actualizado_en
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_gastos_negocio_update
    BEFORE UPDATE ON gastos_negocio
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp();

-- Trigger para generar ID automáticamente
CREATE OR REPLACE FUNCTION generar_id_gasto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        NEW.id := TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_gastos_negocio_insert
    BEFORE INSERT ON gastos_negocio
    FOR EACH ROW
    EXECUTE FUNCTION generar_id_gasto();

-- Función para obtener gastos con filtros
CREATE OR REPLACE FUNCTION sp_obtener_gastos(
    p_busqueda VARCHAR DEFAULT NULL,
    p_categoria categoria_enum DEFAULT NULL,
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin DATE DEFAULT NULL,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id VARCHAR,
    concepto VARCHAR,
    monto DECIMAL,
    fecha DATE,
    categoria categoria_enum,
    descripcion TEXT,
    creado_en TIMESTAMP,
    actualizado_en TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.concepto,
        g.monto,
        g.fecha,
        g.categoria,
        g.descripcion,
        g.creado_en,
        g.actualizado_en
    FROM gastos_negocio g
    WHERE g.estado = 'activo'
        AND (p_busqueda IS NULL OR p_busqueda = '' OR 
             g.concepto ILIKE '%' || p_busqueda || '%' OR 
             g.descripcion ILIKE '%' || p_busqueda || '%')
        AND (p_categoria IS NULL OR g.categoria = p_categoria)
        AND (p_fecha_inicio IS NULL OR g.fecha >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR g.fecha <= p_fecha_fin)
    ORDER BY g.fecha DESC, g.creado_en DESC
    LIMIT p_limite OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas
CREATE OR REPLACE FUNCTION sp_obtener_estadisticas(
    p_mes VARCHAR DEFAULT NULL -- Formato YYYY-MM
)
RETURNS TABLE (
    total_gastos BIGINT,
    total_monto DECIMAL,
    promedio_monto DECIMAL,
    monto_minimo DECIMAL,
    monto_maximo DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        SUM(monto),
        AVG(monto),
        MIN(monto),
        MAX(monto)
    FROM gastos_negocio 
    WHERE estado = 'activo';
END;
$$ LANGUAGE plpgsql;

-- Función para insertar gasto
CREATE OR REPLACE FUNCTION sp_insertar_gasto(
    p_concepto VARCHAR,
    p_monto DECIMAL,
    p_fecha DATE,
    p_categoria categoria_enum,
    p_descripcion TEXT DEFAULT NULL,
    p_creado_por VARCHAR DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
    v_id VARCHAR;
BEGIN
    INSERT INTO gastos_negocio (
        concepto, monto, fecha, categoria, descripcion, creado_por
    ) VALUES (
        p_concepto, p_monto, p_fecha, p_categoria, p_descripcion, p_creado_por
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar gasto
CREATE OR REPLACE FUNCTION sp_actualizar_gasto(
    p_id VARCHAR,
    p_concepto VARCHAR,
    p_monto DECIMAL,
    p_fecha DATE,
    p_categoria categoria_enum,
    p_descripcion TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_filas INTEGER;
BEGIN
    UPDATE gastos_negocio 
    SET 
        concepto = p_concepto,
        monto = p_monto,
        fecha = p_fecha,
        categoria = p_categoria,
        descripcion = p_descripcion
    WHERE id = p_id AND estado = 'activo';
    
    GET DIAGNOSTICS v_filas = ROW_COUNT;
    RETURN v_filas;
END;
$$ LANGUAGE plpgsql;

-- Función para eliminar gasto (eliminación lógica)
CREATE OR REPLACE FUNCTION sp_eliminar_gasto(
    p_id VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    v_filas INTEGER;
BEGIN
    UPDATE gastos_negocio 
    SET estado = 'eliminado'
    WHERE id = p_id;
    
    GET DIAGNOSTICS v_filas = ROW_COUNT;
    RETURN v_filas;
END;
$$ LANGUAGE plpgsql;

-- Datos de ejemplo (opcional - para pruebas)
INSERT INTO gastos_negocio (concepto, monto, fecha, categoria, descripcion) VALUES
('Alquiler de oficina', 1500.00, '2024-01-01', 'alquiler', 'Pago mensual de alquiler del local comercial'),
('Servicios de internet', 89.99, '2024-01-05', 'servicios', 'Pago mensual de internet fibra óptica'),
('Suministros de oficina', 245.50, '2024-01-10', 'suministros', 'Papelería, bolígrafos, carpetas y otros útiles'),
('Nómina empleados', 3500.00, '2024-01-15', 'personal', 'Pago quincenal de salarios'),
('Campaña marketing digital', 500.00, '2024-01-20', 'marketing', 'Publicidad en redes sociales y Google Ads'),
('Licencia software', 199.99, '2024-01-25', 'tecnologia', 'Renovación anual de licencia de software de gestión'),
('Combustible vehículo', 120.00, '2024-01-28', 'transporte', 'Gasolina para entregas y reuniones'),
('Impuestos municipales', 350.00, '2024-01-30', 'impuestos', 'Pago de impuestos locales y licencias');

-- Consultas útiles para el sistema

-- 1. Obtener todos los gastos activos ordenados por fecha
-- SELECT * FROM vista_gastos_activos ORDER BY fecha DESC;

-- 2. Obtener gastos del mes actual
-- SELECT * FROM vista_gastos_activos 
-- WHERE TO_CHAR(fecha, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
-- ORDER BY fecha DESC;

-- 3. Obtener resumen por categorías
-- SELECT categoria, COUNT(*) as cantidad, SUM(monto) as total 
-- FROM vista_gastos_activos 
-- GROUP BY categoria 
-- ORDER BY total DESC;

-- 4. Obtener gastos de un rango de fechas
-- SELECT * FROM vista_gastos_activos 
-- WHERE fecha BETWEEN '2024-01-01' AND '2024-01-31'
-- ORDER BY fecha DESC;

-- 5. Buscar gastos por concepto o descripción
-- SELECT * FROM vista_gastos_activos 
-- WHERE concepto ILIKE '%alquiler%' OR descripcion ILIKE '%alquiler%'
-- ORDER BY fecha DESC;
