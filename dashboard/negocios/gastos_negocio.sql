-- =============================================
-- Sistema de Gestión de Gastos para Negocios
-- Estructura de Base de Datos
-- =============================================

-- Eliminar tabla si existe para recreación
DROP TABLE IF EXISTS gastos_negocio;

-- Crear tabla principal de gastos
CREATE TABLE gastos_negocio (
    id VARCHAR(50) PRIMARY KEY COMMENT 'Identificador único del gasto (UUID o timestamp)',
    concepto VARCHAR(255) NOT NULL COMMENT 'Concepto o descripción breve del gasto',
    monto DECIMAL(12, 2) NOT NULL COMMENT 'Monto del gasto con 2 decimales',
    fecha DATE NOT NULL COMMENT 'Fecha en que se realizó el gasto',
    categoria ENUM(
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
    ) NOT NULL DEFAULT 'otros' COMMENT 'Categoría del gasto para organización',
    descripcion TEXT COMMENT 'Descripción detallada del gasto (opcional)',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de creación del registro',
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha y hora de última actualización',
    creado_por VARCHAR(100) COMMENT 'Usuario que creó el registro (para sistemas con autenticación)',
    estado ENUM('activo', 'eliminado') DEFAULT 'activo' COMMENT 'Estado del registro para eliminación lógica',
    INDEX idx_fecha (fecha) COMMENT 'Índice para búsquedas por fecha',
    INDEX idx_categoria (categoria) COMMENT 'Índice para filtrado por categoría',
    INDEX idx_estado (estado) COMMENT 'Índice para filtrado por estado',
    INDEX idx_fecha_categoria (fecha, categoria) COMMENT 'Índice compuesto para consultas frecuentes',
    INDEX idx_monto (monto) COMMENT 'Índice para ordenamiento por monto'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla principal para registro de gastos del negocio';

-- Crear vista para gastos activos
CREATE VIEW vista_gastos_activos AS
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
CREATE VIEW vista_resumen_mensual AS
SELECT 
    DATE_FORMAT(fecha, '%Y-%m') AS mes,
    categoria,
    COUNT(*) AS cantidad_gastos,
    SUM(monto) AS total_monto,
    AVG(monto) AS promedio_monto,
    MIN(monto) AS monto_minimo,
    MAX(monto) AS monto_maximo
FROM gastos_negocio 
WHERE estado = 'activo'
GROUP BY DATE_FORMAT(fecha, '%Y-%m'), categoria
ORDER BY mes DESC, categoria;

-- Crear vista para resumen anual
CREATE VIEW vista_resumen_anual AS
SELECT 
    YEAR(fecha) AS año,
    COUNT(*) AS cantidad_gastos,
    SUM(monto) AS total_monto,
    AVG(monto) AS promedio_monto,
    MIN(monto) AS monto_minimo,
    MAX(monto) AS monto_maximo
FROM gastos_negocio 
WHERE estado = 'activo'
GROUP BY YEAR(fecha)
ORDER BY año DESC;

-- Trigger para auditoría de creación
DELIMITER //
CREATE TRIGGER tr_gastos_negocio_insert
BEFORE INSERT ON gastos_negocio
FOR EACH ROW
BEGIN
    -- Validar que el monto sea positivo
    IF NEW.monto <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El monto debe ser mayor que cero';
    END IF;
    
    -- Validar que la fecha no sea futura
    IF NEW.fecha > CURDATE() THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'La fecha no puede ser futura';
    END IF;
    
    -- Generar ID si no se proporciona
    IF NEW.id IS NULL OR NEW.id = '' THEN
        SET NEW.id = CONCAT(
            DATE_FORMAT(NOW(), '%Y%m%d'),
            LPAD(FLOOR(RAND() * 1000000), 6, '0')
        );
    END IF;
END//
DELIMITER ;

-- Trigger para auditoría de actualización
DELIMITER //
CREATE TRIGGER tr_gastos_negocio_update
BEFORE UPDATE ON gastos_negocio
FOR EACH ROW
BEGIN
    -- Validar que el monto sea positivo
    IF NEW.monto <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El monto debe ser mayor que cero';
    END IF;
    
    -- Validar que la fecha no sea futura
    IF NEW.fecha > CURDATE() THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'La fecha no puede ser futura';
    END IF;
END//
DELIMITER ;

-- Procedimiento almacenado para obtener gastos con filtros
DELIMITER //
CREATE PROCEDURE sp_obtener_gastos(
    IN p_busqueda VARCHAR(255),
    IN p_categoria VARCHAR(50),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    SELECT 
        id,
        concepto,
        monto,
        fecha,
        categoria,
        descripcion,
        creado_en,
        actualizado_en
    FROM gastos_negocio 
    WHERE estado = 'activo'
        AND (p_busqueda IS NULL OR p_busqueda = '' OR 
             concepto LIKE CONCAT('%', p_busqueda, '%') OR 
             descripcion LIKE CONCAT('%', p_busqueda, '%'))
        AND (p_categoria IS NULL OR p_categoria = '' OR categoria = p_categoria)
        AND (p_fecha_inicio IS NULL OR fecha >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR fecha <= p_fecha_fin)
    ORDER BY fecha DESC, creado_en DESC
    LIMIT p_limite OFFSET p_offset;
END//
DELIMITER ;

-- Procedimiento almacenado para obtener estadísticas
DELIMITER //
CREATE PROCEDURE sp_obtener_estadisticas(
    IN p_mes VARCHAR(7) -- Formato YYYY-MM
)
BEGIN
    -- Estadísticas generales
    SELECT 
        COUNT(*) AS total_gastos,
        SUM(monto) AS total_monto,
        AVG(monto) AS promedio_monto,
        MIN(monto) AS monto_minimo,
        MAX(monto) AS monto_maximo
    FROM gastos_negocio 
    WHERE estado = 'activo';
    
    -- Estadísticas del mes específico
    IF p_mes IS NOT NULL AND p_mes != '' THEN
        SELECT 
            COUNT(*) AS gastos_mes,
            SUM(monto) AS total_mes,
            AVG(monto) AS promedio_mes,
            categoria,
            COUNT(*) AS cantidad_por_categoria
        FROM gastos_negocio 
        WHERE estado = 'activo' 
            AND DATE_FORMAT(fecha, '%Y-%m') = p_mes
        GROUP BY categoria
        ORDER BY total_mes DESC;
    END IF;
END//
DELIMITER ;

-- Procedimiento almacenado para insertar gasto
DELIMITER //
CREATE PROCEDURE sp_insertar_gasto(
    IN p_concepto VARCHAR(255),
    IN p_monto DECIMAL(12,2),
    IN p_fecha DATE,
    IN p_categoria VARCHAR(50),
    IN p_descripcion TEXT,
    IN p_creado_por VARCHAR(100)
)
BEGIN
    DECLARE v_id VARCHAR(50);
    
    -- Generar ID único
    SET v_id = CONCAT(
        DATE_FORMAT(NOW(), '%Y%m%d'),
        LPAD(FLOOR(RAND() * 1000000), 6, '0')
    );
    
    INSERT INTO gastos_negocio (
        id, concepto, monto, fecha, categoria, descripcion, creado_por
    ) VALUES (
        v_id, p_concepto, p_monto, p_fecha, p_categoria, p_descripcion, p_creado_por
    );
    
    SELECT v_id AS id_insertado;
END//
DELIMITER ;

-- Procedimiento almacenado para actualizar gasto
DELIMITER //
CREATE PROCEDURE sp_actualizar_gasto(
    IN p_id VARCHAR(50),
    IN p_concepto VARCHAR(255),
    IN p_monto DECIMAL(12,2),
    IN p_fecha DATE,
    IN p_categoria VARCHAR(50),
    IN p_descripcion TEXT
)
BEGIN
    UPDATE gastos_negocio 
    SET 
        concepto = p_concepto,
        monto = p_monto,
        fecha = p_fecha,
        categoria = p_categoria,
        descripcion = p_descripcion
    WHERE id = p_id AND estado = 'activo';
    
    SELECT ROW_COUNT() AS filas_afectadas;
END//
DELIMITER ;

-- Procedimiento almacenado para eliminar gasto (eliminación lógica)
DELIMITER //
CREATE PROCEDURE sp_eliminar_gasto(
    IN p_id VARCHAR(50)
)
BEGIN
    UPDATE gastos_negocio 
    SET estado = 'eliminado'
    WHERE id = p_id;
    
    SELECT ROW_COUNT() AS filas_afectadas;
END//
DELIMITER ;

-- Datos de ejemplo (opcional - para pruebas)
INSERT INTO gastos_negocio (id, concepto, monto, fecha, categoria, descripcion) VALUES
('20240101000001', 'Alquiler de oficina', 1500.00, '2024-01-01', 'alquiler', 'Pago mensual de alquiler del local comercial'),
('20240105000002', 'Servicios de internet', 89.99, '2024-01-05', 'servicios', 'Pago mensual de internet fibra óptica'),
('20240110000003', 'Suministros de oficina', 245.50, '2024-01-10', 'suministros', 'Papelería, bolígrafos, carpetas y otros útiles'),
('20240115000004', 'Nómina empleados', 3500.00, '2024-01-15', 'personal', 'Pago quincenal de salarios'),
('20240120000005', 'Campaña marketing digital', 500.00, '2024-01-20', 'marketing', 'Publicidad en redes sociales y Google Ads'),
('20240125000006', 'Licencia software', 199.99, '2024-01-25', 'tecnologia', 'Renovación anual de licencia de software de gestión'),
('20240128000007', 'Combustible vehículo', 120.00, '2024-01-28', 'transporte', 'Gasolina para entregas y reuniones'),
('20240130000008', 'Impuestos municipales', 350.00, '2024-01-30', 'impuestos', 'Pago de impuestos locales y licencias');

-- Consultas útiles para el sistema

-- 1. Obtener todos los gastos activos ordenados por fecha
-- SELECT * FROM vista_gastos_activos ORDER BY fecha DESC;

-- 2. Obtener gastos del mes actual
-- SELECT * FROM vista_gastos_activos 
-- WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
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
-- WHERE concepto LIKE '%alquiler%' OR descripcion LIKE '%alquiler%'
-- ORDER BY fecha DESC;

COMMIT;
