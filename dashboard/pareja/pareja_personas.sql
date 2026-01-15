-- Tabla para información de parejas
CREATE TABLE IF NOT EXISTS parejas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_pareja VARCHAR(255) NOT NULL,
    email_pareja VARCHAR(255),
    telefono_pareja VARCHAR(20),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activa BOOLEAN DEFAULT true
);

-- Tabla para ingresos de cada miembro de la pareja
CREATE TABLE IF NOT EXISTS ingresos_pareja (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pareja_id UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
    miembro VARCHAR(50) NOT NULL CHECK (miembro IN ('usuario', 'pareja')),
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    frecuencia VARCHAR(20) NOT NULL CHECK (frecuencia IN ('mensual', 'quincenal', 'semestral', 'anual')),
    descripcion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activo BOOLEAN DEFAULT true
);

-- Tabla para gastos compartidos de la pareja
CREATE TABLE IF NOT EXISTS gastos_pareja (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pareja_id UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
    monto_total DECIMAL(12,2) NOT NULL CHECK (monto_total > 0),
    categoria VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_gasto DATE NOT NULL,
    pagado_por VARCHAR(50) NOT NULL CHECK (pagado_por IN ('usuario', 'pareja')),
    metodo_division VARCHAR(20) NOT NULL CHECK (metodo_division IN ('igual', 'porcentual', 'personalizado')),
    porcentaje_usuario DECIMAL(5,2),
    porcentaje_pareja DECIMAL(5,2),
    monto_usuario DECIMAL(12,2),
    monto_pareja DECIMAL(12,2),
    creado_por UUID REFERENCES auth.users(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_por UUID REFERENCES auth.users(id),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para balances y saldos de la pareja
CREATE TABLE IF NOT EXISTS balance_pareja (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pareja_id UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
    periodo VARCHAR(20) NOT NULL, -- Formato: YYYY-MM
    total_ingresos DECIMAL(12,2) DEFAULT 0,
    total_gastos DECIMAL(12,2) DEFAULT 0,
    balance_usuario DECIMAL(12,2) DEFAULT 0, -- Lo que el usuario debe o le deben
    balance_pareja DECIMAL(12,2) DEFAULT 0, -- Lo que la pareja debe o le deben
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pareja_id, periodo)
);

-- Tabla para configuración de división automática
CREATE TABLE IF NOT EXISTS configuracion_division (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pareja_id UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
    metodo_defecto VARCHAR(20) NOT NULL DEFAULT 'porcentual' CHECK (metodo_defecto IN ('igual', 'porcentual', 'personalizado')),
    porcentaje_usuario_defecto DECIMAL(5,2) DEFAULT 50.00,
    porcentaje_pareja_defecto DECIMAL(5,2) DEFAULT 50.00,
    categorias_excluidas TEXT[], -- Categorías que se dividen 50/50 por defecto
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pareja_id)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_parejas_usuario_id ON parejas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_pareja_id ON ingresos_pareja(pareja_id);
CREATE INDEX IF NOT EXISTS idx_gastos_pareja_id ON gastos_pareja(pareja_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos_pareja(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_balance_pareja_id ON balance_pareja(pareja_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_pareja_id ON configuracion_division(pareja_id);

-- Función para calcular porcentajes automáticamente basado en ingresos
CREATE OR REPLACE FUNCTION calcular_porcentajes_ingresos(pareja_uuid UUID)
RETURNS TABLE(
    porcentaje_usuario DECIMAL(5,2),
    porcentaje_pareja DECIMAL(5,2)
) AS $$
DECLARE
    ingreso_usuario DECIMAL(12,2);
    ingreso_pareja DECIMAL(12,2);
    total_ingresos DECIMAL(12,2);
BEGIN
    -- Obtener ingresos mensuales de cada miembro
    SELECT COALESCE(SUM(
        CASE 
            WHEN frecuencia = 'mensual' THEN monto
            WHEN frecuencia = 'quincenal' THEN monto * 2
            WHEN frecuencia = 'semestral' THEN monto / 6
            WHEN frecuencia = 'anual' THEN monto / 12
        END
    ), 0) INTO ingreso_usuario
    FROM ingresos_pareja 
    WHERE pareja_id = pareja_uuid AND miembro = 'usuario' AND activo = true;
    
    SELECT COALESCE(SUM(
        CASE 
            WHEN frecuencia = 'mensual' THEN monto
            WHEN frecuencia = 'quincenal' THEN monto * 2
            WHEN frecuencia = 'semestral' THEN monto / 6
            WHEN frecuencia = 'anual' THEN monto / 12
        END
    ), 0) INTO ingreso_pareja
    FROM ingresos_pareja 
    WHERE pareja_id = pareja_uuid AND miembro = 'pareja' AND activo = true;
    
    total_ingresos := ingreso_usuario + ingreso_pareja;
    
    -- Calcular porcentajes
    IF total_ingresos > 0 THEN
        porcentaje_usuario := ROUND((ingreso_usuario / total_ingresos) * 100, 2);
        porcentaje_pareja := ROUND((ingreso_pareja / total_ingresos) * 100, 2);
    ELSE
        porcentaje_usuario := 50.00;
        porcentaje_pareja := 50.00;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar balances automáticamente
CREATE OR REPLACE FUNCTION actualizar_balance_pareja(pareja_uuid UUID, periodo VARCHAR)
RETURNS VOID AS $$
DECLARE
    total_gastos_mes DECIMAL(12,2);
    total_ingresos_mes DECIMAL(12,2);
    balance_usuario_actual DECIMAL(12,2);
    balance_pareja_actual DECIMAL(12,2);
BEGIN
    -- Calcular total de gastos del mes
    SELECT COALESCE(SUM(monto_total), 0) INTO total_gastos_mes
    FROM gastos_pareja 
    WHERE pareja_id = pareja_uuid 
    AND TO_CHAR(fecha_gasto, 'YYYY-MM') = periodo;
    
    -- Calcular total de ingresos mensuales
    SELECT COALESCE(SUM(
        CASE 
            WHEN frecuencia = 'mensual' THEN monto
            WHEN frecuencia = 'quincenal' THEN monto * 2
            WHEN frecuencia = 'semestral' THEN monto / 6
            WHEN frecuencia = 'anual' THEN monto / 12
        END
    ), 0) INTO total_ingresos_mes
    FROM ingresos_pareja 
    WHERE pareja_id = pareja_uuid AND activo = true;
    
    -- Calcular balances (diferencia entre lo que pagó y lo que debería pagar)
    SELECT COALESCE(SUM(
        CASE 
            WHEN pagado_por = 'usuario' THEN monto_usuario - monto_total
            ELSE monto_usuario
        END
    ), 0) INTO balance_usuario_actual
    FROM gastos_pareja 
    WHERE pareja_id = pareja_uuid 
    AND TO_CHAR(fecha_gasto, 'YYYY-MM') = periodo;
    
    SELECT COALESCE(SUM(
        CASE 
            WHEN pagado_por = 'pareja' THEN monto_pareja - monto_total
            ELSE monto_pareja
        END
    ), 0) INTO balance_pareja_actual
    FROM gastos_pareja 
    WHERE pareja_id = pareja_uuid 
    AND TO_CHAR(fecha_gasto, 'YYYY-MM') = periodo;
    
    -- Insertar o actualizar el balance
    INSERT INTO balance_pareja (
        pareja_id, periodo, total_ingresos, total_gastos, 
        balance_usuario, balance_pareja, fecha_actualizacion
    ) VALUES (
        pareja_uuid, periodo, total_ingresos_mes, total_gastos_mes,
        balance_usuario_actual, balance_pareja_actual, NOW()
    )
    ON CONFLICT (pareja_id, periodo) 
    DO UPDATE SET
        total_ingresos = EXCLUDED.total_ingresos,
        total_gastos = EXCLUDED.total_gastos,
        balance_usuario = EXCLUDED.balance_usuario,
        balance_pareja = EXCLUDED.balance_pareja,
        fecha_actualizacion = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balances cuando se inserta o actualiza un gasto
CREATE OR REPLACE FUNCTION trigger_actualizar_balance()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM actualizar_balance_pareja(NEW.pareja_id, TO_CHAR(NEW.fecha_gasto, 'YYYY-MM'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_balance_gastos_insert ON gastos_pareja;
CREATE TRIGGER trigger_balance_gastos_insert
    AFTER INSERT ON gastos_pareja
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_balance();

DROP TRIGGER IF EXISTS trigger_balance_gastos_update ON gastos_pareja;
CREATE TRIGGER trigger_balance_gastos_update
    AFTER UPDATE ON gastos_pareja
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_balance();

DROP TRIGGER IF EXISTS trigger_balance_gastos_delete ON gastos_pareja;
CREATE TRIGGER trigger_balance_gastos_delete
    AFTER DELETE ON gastos_pareja
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_balance();

-- Políticas de seguridad (RLS)
ALTER TABLE parejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_pareja ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_pareja ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_pareja ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_division ENABLE ROW LEVEL SECURITY;

-- Política para parejas (solo el usuario puede ver/editar sus parejas)
CREATE POLICY IF NOT EXISTS "Usuarios pueden ver sus parejas" ON parejas
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "Usuarios pueden insertar sus parejas" ON parejas
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "Usuarios pueden actualizar sus parejas" ON parejas
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "Usuarios pueden eliminar sus parejas" ON parejas
    FOR DELETE USING (auth.uid() = usuario_id);

-- Políticas para ingresos_pareja
CREATE POLICY IF NOT EXISTS "Usuarios pueden ver ingresos de sus parejas" ON ingresos_pareja
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden insertar ingresos de sus parejas" ON ingresos_pareja
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden actualizar ingresos de sus parejas" ON ingresos_pareja
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden eliminar ingresos de sus parejas" ON ingresos_pareja
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

-- Políticas para gastos_pareja
CREATE POLICY IF NOT EXISTS "Usuarios pueden ver gastos de sus parejas" ON gastos_pareja
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden insertar gastos de sus parejas" ON gastos_pareja
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden actualizar gastos de sus parejas" ON gastos_pareja
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden eliminar gastos de sus parejas" ON gastos_pareja
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

-- Políticas para balance_pareja
CREATE POLICY IF NOT EXISTS "Usuarios pueden ver balances de sus parejas" ON balance_pareja
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

-- Políticas para configuracion_division
CREATE POLICY IF NOT EXISTS "Usuarios pueden ver configuración de sus parejas" ON configuracion_division
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden insertar configuración de sus parejas" ON configuracion_division
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

CREATE POLICY IF NOT EXISTS "Usuarios pueden actualizar configuración de sus parejas" ON configuracion_division
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM parejas p WHERE p.id = pareja_id AND p.usuario_id = auth.uid())
    );

-- Vista para resumen de finanzas de pareja
CREATE OR REPLACE VIEW resumen_finanzas_pareja AS
SELECT 
    p.id as pareja_id,
    p.nombre_pareja,
    COALESCE(ip.total_ingresos_usuario, 0) as ingresos_usuario,
    COALESCE(ip.total_ingresos_pareja, 0) as ingresos_pareja,
    COALESCE(ip.total_ingresos_usuario, 0) + COALESCE(ip.total_ingresos_pareja, 0) as ingresos_totales,
    COALESCE(gp.total_gastos_mes, 0) as gastos_mes_actual,
    COALESCE(bp.balance_usuario, 0) as balance_usuario,
    COALESCE(bp.balance_pareja, 0) as balance_pareja,
    CASE 
        WHEN COALESCE(ip.total_ingresos_usuario, 0) + COALESCE(ip.total_ingresos_pareja, 0) > 0 
        THEN ROUND((COALESCE(ip.total_ingresos_usuario, 0) / (COALESCE(ip.total_ingresos_usuario, 0) + COALESCE(ip.total_ingresos_pareja, 0))) * 100, 2)
        ELSE 50.00
    END as porcentaje_recomendado_usuario,
    CASE 
        WHEN COALESCE(ip.total_ingresos_usuario, 0) + COALESCE(ip.total_ingresos_pareja, 0) > 0 
        THEN ROUND((COALESCE(ip.total_ingresos_pareja, 0) / (COALESCE(ip.total_ingresos_usuario, 0) + COALESCE(ip.total_ingresos_pareja, 0))) * 100, 2)
        ELSE 50.00
    END as porcentaje_recomendado_pareja
FROM parejas p
LEFT JOIN (
    SELECT 
        pareja_id,
        SUM(CASE WHEN miembro = 'usuario' THEN 
            CASE 
                WHEN frecuencia = 'mensual' THEN monto
                WHEN frecuencia = 'quincenal' THEN monto * 2
                WHEN frecuencia = 'semestral' THEN monto / 6
                WHEN frecuencia = 'anual' THEN monto / 12
            END
        ELSE 0 END) as total_ingresos_usuario,
        SUM(CASE WHEN miembro = 'pareja' THEN 
            CASE 
                WHEN frecuencia = 'mensual' THEN monto
                WHEN frecuencia = 'quincenal' THEN monto * 2
                WHEN frecuencia = 'semestral' THEN monto / 6
                WHEN frecuencia = 'anual' THEN monto / 12
            END
        ELSE 0 END) as total_ingresos_pareja
    FROM ingresos_pareja 
    WHERE activo = true
    GROUP BY pareja_id
) ip ON p.id = ip.pareja_id
LEFT JOIN (
    SELECT 
        pareja_id,
        SUM(monto_total) as total_gastos_mes
    FROM gastos_pareja 
    WHERE TO_CHAR(fecha_gasto, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    GROUP BY pareja_id
) gp ON p.id = gp.pareja_id
LEFT JOIN (
    SELECT 
        pareja_id,
        balance_usuario,
        balance_pareja
    FROM balance_pareja 
    WHERE periodo = TO_CHAR(NOW(), 'YYYY-MM')
) bp ON p.id = bp.pareja_id
WHERE p.activa = true;

-- Función para inicializar datos de ejemplo (opcional)
CREATE OR REPLACE FUNCTION inicializar_datos_ejemplo()
RETURNS VOID AS $$
DECLARE
    usuario_actual UUID;
    pareja_ejemplo UUID;
BEGIN
    -- Obtener el usuario autenticado actual
    usuario_actual := auth.uid();
    
    -- Si el usuario no tiene pareja activa, crear una de ejemplo
    IF NOT EXISTS (
        SELECT 1 FROM parejas 
        WHERE usuario_id = usuario_actual AND activa = true
    ) THEN
        -- Insertar pareja de ejemplo
        INSERT INTO parejas (usuario_id, nombre_pareja, email_pareja, telefono_pareja)
        VALUES (usuario_actual, 'Pareja Ejemplo', 'pareja@ejemplo.com', '555-0123')
        RETURNING id INTO pareja_ejemplo;
        
        -- Insertar ingresos de ejemplo
        INSERT INTO ingresos_pareja (pareja_id, miembro, monto, frecuencia, descripcion)
        VALUES 
            (pareja_ejemplo, 'usuario', 15000.00, 'mensual', 'Salario principal'),
            (pareja_ejemplo, 'pareja', 12000.00, 'mensual', 'Salario pareja');
        
        -- Insertar configuración por defecto
        INSERT INTO configuracion_division (pareja_id, metodo_defecto, porcentaje_usuario_defecto, porcentaje_pareja_defecto)
        VALUES (pareja_ejemplo, 'porcentual', 55.56, 44.44);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions para la función de ejemplo
GRANT EXECUTE ON FUNCTION inicializar_datos_ejemplo() TO authenticated;
