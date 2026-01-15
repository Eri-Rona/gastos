    -- =============================================
    -- Base de datos para Finanzas de Parejas
    -- =============================================

    -- Tabla de configuración de parejas
    CREATE TABLE IF NOT EXISTS configuracion_parejas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        nombre_usuario VARCHAR(100) NOT NULL,
        nombre_pareja VARCHAR(100) NOT NULL,
        ingresos_usuario DECIMAL(12,2) DEFAULT 0,
        ingresos_pareja DECIMAL(12,2) DEFAULT 0,
        porcentaje_usuario DECIMAL(5,2) DEFAULT 50,
        porcentaje_pareja DECIMAL(5,2) DEFAULT 50,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(usuario_id)
    );

    -- Tabla de ingresos de la pareja
    CREATE TABLE IF NOT EXISTS ingresos_pareja (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        configuracion_id UUID REFERENCES configuracion_parejas(id) ON DELETE CASCADE,
        miembro VARCHAR(20) NOT NULL CHECK (miembro IN ('usuario', 'pareja')),
        monto DECIMAL(12,2) NOT NULL,
        frecuencia VARCHAR(20) NOT NULL CHECK (frecuencia IN ('mensual', 'quincenal', 'semestral', 'anual')),
        descripcion TEXT,
        fecha DATE NOT NULL,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Tabla de gastos compartidos
    CREATE TABLE IF NOT EXISTS gastos_compartidos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        configuracion_id UUID REFERENCES configuracion_parejas(id) ON DELETE CASCADE,
        descripcion VARCHAR(200) NOT NULL,
        monto DECIMAL(12,2) NOT NULL,
        categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('alimentacion', 'vivienda', 'transporte', 'servicios', 'entretenimiento', 'salud', 'otros')),
        fecha DATE NOT NULL,
        pagado_por VARCHAR(20) NOT NULL CHECK (pagado_por IN ('usuario', 'pareja')),
        monto_usuario DECIMAL(12,2) NOT NULL,
        monto_pareja DECIMAL(12,2) NOT NULL,
        porcentaje_usuario DECIMAL(5,2) NOT NULL,
        porcentaje_pareja DECIMAL(5,2) NOT NULL,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Tabla de balances mensuales
    CREATE TABLE IF NOT EXISTS balances_mensuales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        configuracion_id UUID REFERENCES configuracion_parejas(id) ON DELETE CASCADE,
        anio INTEGER NOT NULL,
        mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
        ingresos_totales DECIMAL(12,2) DEFAULT 0,
        gastos_totales DECIMAL(12,2) DEFAULT 0,
        ahorro DECIMAL(12,2) DEFAULT 0,
        contribucion_usuario DECIMAL(12,2) DEFAULT 0,
        contribucion_pareja DECIMAL(12,2) DEFAULT 0,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(configuracion_id, anio, mes)
    );

    -- Tabla de categorías personalizadas (opcional)
    CREATE TABLE IF NOT EXISTS categorias_personalizadas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        configuracion_id UUID REFERENCES configuracion_parejas(id) ON DELETE CASCADE,
        nombre VARCHAR(50) NOT NULL,
        color VARCHAR(7) DEFAULT '#667eea',
        icono VARCHAR(50) DEFAULT 'default',
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(configuracion_id, nombre)
    );

    -- Índices para mejor rendimiento
    CREATE INDEX IF NOT EXISTS idx_configuracion_parejas_usuario_id ON configuracion_parejas(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_ingresos_pareja_configuracion_id ON ingresos_pareja(configuracion_id);
    CREATE INDEX IF NOT EXISTS idx_ingresos_pareja_fecha ON ingresos_pareja(fecha);
    CREATE INDEX IF NOT EXISTS idx_gastos_compartidos_configuracion_id ON gastos_compartidos(configuracion_id);
    CREATE INDEX IF NOT EXISTS idx_gastos_compartidos_fecha ON gastos_compartidos(fecha);
    CREATE INDEX IF NOT EXISTS idx_gastos_compartidos_categoria ON gastos_compartidos(categoria);
    CREATE INDEX IF NOT EXISTS idx_balances_mensuales_configuracion_id ON balances_mensuales(configuracion_id);
    CREATE INDEX IF NOT EXISTS idx_balances_mensuales_anio_mes ON balances_mensuales(anio, mes);

    -- Función para actualizar automáticamente los porcentajes
    CREATE OR REPLACE FUNCTION actualizar_porcentajes_configuracion()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Calcular total de ingresos
        NEW.porcentaje_usuario = CASE 
            WHEN (NEW.ingresos_usuario + NEW.ingresos_pareja) > 0 
            THEN ROUND((NEW.ingresos_usuario::NUMERIC / (NEW.ingresos_usuario + NEW.ingresos_pareja) * 100) * 100) / 100
            ELSE 50 
        END;
        
        NEW.porcentaje_pareja = 100 - NEW.porcentaje_usuario;
        
        NEW.fecha_actualizacion = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger para actualizar porcentajes automáticamente
    CREATE TRIGGER trigger_actualizar_porcentajes
        BEFORE INSERT OR UPDATE ON configuracion_parejas
        FOR EACH ROW
        EXECUTE FUNCTION actualizar_porcentajes_configuracion();

    -- Función para calcular división de gastos automáticamente
    CREATE OR REPLACE FUNCTION calcular_division_gasto()
    RETURNS TRIGGER AS $$
    DECLARE
        config RECORD;
    BEGIN
        -- Obtener configuración de la pareja
        SELECT * INTO config FROM configuracion_parejas WHERE id = NEW.configuracion_id;
        
        IF config IS NOT NULL THEN
            NEW.porcentaje_usuario = config.porcentaje_usuario;
            NEW.porcentaje_pareja = config.porcentaje_pareja;
            NEW.monto_usuario = ROUND((NEW.monto * config.porcentaje_usuario / 100) * 100) / 100;
            NEW.monto_pareja = ROUND((NEW.monto * config.porcentaje_pareja / 100) * 100) / 100;
        END IF;
        
        NEW.actualizado_en = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger para calcular división de gastos
    CREATE TRIGGER trigger_calcular_division_gasto
        BEFORE INSERT OR UPDATE ON gastos_compartidos
        FOR EACH ROW
        EXECUTE FUNCTION calcular_division_gasto();

    -- Función para actualizar balances mensuales
    CREATE OR REPLACE FUNCTION actualizar_balance_mensual()
    RETURNS TRIGGER AS $$
    DECLARE
        anio_actual INTEGER;
        mes_actual INTEGER;
        balance_existente RECORD;
        ingresos_totales DECIMAL(12,2);
        gastos_totales DECIMAL(12,2);
        contribucion_usuario DECIMAL(12,2);
        contribucion_pareja DECIMAL(12,2);
    BEGIN
        anio_actual := EXTRACT(YEAR FROM COALESCE(NEW.fecha, CURRENT_DATE));
        mes_actual := EXTRACT(MONTH FROM COALESCE(NEW.fecha, CURRENT_DATE));
        
        -- Calcular totales del mes
        SELECT 
            COALESCE(SUM(monto), 0) as ingresos
        INTO ingresos_totales
        FROM ingresos_pareja 
        WHERE configuracion_id = NEW.configuracion_id 
        AND EXTRACT(YEAR FROM fecha) = anio_actual 
        AND EXTRACT(MONTH FROM fecha) = mes_actual;
        
        SELECT 
            COALESCE(SUM(monto), 0) as gastos,
            COALESCE(SUM(monto_usuario), 0) as contrib_usuario,
            COALESCE(SUM(monto_pareja), 0) as contrib_pareja
        INTO gastos_totales, contribucion_usuario, contribucion_pareja
        FROM gastos_compartidos 
        WHERE configuracion_id = NEW.configuracion_id 
        AND EXTRACT(YEAR FROM fecha) = anio_actual 
        AND EXTRACT(MONTH FROM fecha) = mes_actual;
        
        -- Verificar si ya existe un registro para este mes
        SELECT * INTO balance_existente 
        FROM balances_mensuales 
        WHERE configuracion_id = NEW.configuracion_id 
        AND anio = anio_actual 
        AND mes = mes_actual;
        
        IF balance_existente IS NOT NULL THEN
            UPDATE balances_mensuales SET
                ingresos_totales = ingresos_totales,
                gastos_totales = gastos_totales,
                ahorro = ingresos_totales - gastos_totales,
                contribucion_usuario = contribucion_usuario,
                contribucion_pareja = contribucion_pareja,
                fecha_actualizacion = NOW()
            WHERE id = balance_existente.id;
        ELSE
            INSERT INTO balances_mensuales (
                configuracion_id, anio, mes, ingresos_totales, gastos_totales, 
                ahorro, contribucion_usuario, contribucion_pareja
            ) VALUES (
                NEW.configuracion_id, anio_actual, mes_actual, ingresos_totales, gastos_totales,
                ingresos_totales - gastos_totales, contribucion_usuario, contribucion_pareja
            );
        END IF;
        
        RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    -- Triggers para actualizar balances
    CREATE TRIGGER trigger_actualizar_balance_ingresos
        AFTER INSERT OR UPDATE OR DELETE ON ingresos_pareja
        FOR EACH STATEMENT
        EXECUTE FUNCTION actualizar_balance_mensual();

    CREATE TRIGGER trigger_actualizar_balance_gastos
        AFTER INSERT OR UPDATE OR DELETE ON gastos_compartidos
        FOR EACH STATEMENT
        EXECUTE FUNCTION actualizar_balance_mensual();

    -- Política de seguridad (RLS) para configuración_parejas
    ALTER TABLE configuracion_parejas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Los usuarios solo pueden ver su propia configuración"
        ON configuracion_parejas FOR SELECT
        USING (auth.uid() = usuario_id);

    CREATE POLICY "Los usuarios solo pueden modificar su propia configuración"
        ON configuracion_parejas FOR ALL
        USING (auth.uid() = usuario_id)
        WITH CHECK (auth.uid() = usuario_id);

    -- Política de seguridad para ingresos_pareja
    ALTER TABLE ingresos_pareja ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Los usuarios solo pueden ver sus ingresos"
        ON ingresos_pareja FOR SELECT
        USING (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        );

    CREATE POLICY "Los usuarios solo pueden modificar sus ingresos"
        ON ingresos_pareja FOR ALL
        USING (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        )
        WITH CHECK (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        );

    -- Política de seguridad para gastos_compartidos
    ALTER TABLE gastos_compartidos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Los usuarios solo pueden ver sus gastos"
        ON gastos_compartidos FOR SELECT
        USING (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        );

    CREATE POLICY "Los usuarios solo pueden modificar sus gastos"
        ON gastos_compartidos FOR ALL
        USING (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        )
        WITH CHECK (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        );

    -- Política de seguridad para balances_mensuales
    ALTER TABLE balances_mensuales ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Los usuarios solo pueden ver sus balances"
        ON balances_mensuales FOR SELECT
        USING (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        );

    -- Política de seguridad para categorias_personalizadas
    ALTER TABLE categorias_personalizadas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Los usuarios solo pueden ver sus categorías"
        ON categorias_personalizadas FOR SELECT
        USING (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        );

    CREATE POLICY "Los usuarios solo pueden modificar sus categorías"
        ON categorias_personalizadas FOR ALL
        USING (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        )
        WITH CHECK (
            configuracion_id IN (
                SELECT id FROM configuracion_parejas WHERE usuario_id = auth.uid()
            )
        );

    -- Vista para resumen financiero
    CREATE OR REPLACE VIEW resumen_financiero AS
    SELECT 
        cp.usuario_id,
        cp.nombre_usuario,
        cp.nombre_pareja,
        cp.ingresos_usuario,
        cp.ingresos_pareja,
        cp.porcentaje_usuario,
        cp.porcentaje_pareja,
        COALESCE(SUM(ic.monto), 0) as total_ingresos_mes,
        COALESCE(SUM(gc.monto), 0) as total_gastos_mes,
        COALESCE(SUM(gc.monto_usuario), 0) as contribucion_usuario_mes,
        COALESCE(SUM(gc.monto_pareja), 0) as contribucion_pareja_mes,
        (COALESCE(SUM(ic.monto), 0) - COALESCE(SUM(gc.monto), 0)) as ahorro_mes
    FROM configuracion_parejas cp
    LEFT JOIN ingresos_pareja ic ON cp.id = ic.configuracion_id 
        AND EXTRACT(YEAR FROM ic.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM ic.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
    LEFT JOIN gastos_compartidos gc ON cp.id = gc.configuracion_id
        AND EXTRACT(YEAR FROM gc.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM gc.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
    GROUP BY cp.usuario_id, cp.nombre_usuario, cp.nombre_pareja, 
            cp.ingresos_usuario, cp.ingresos_pareja, 
            cp.porcentaje_usuario, cp.porcentaje_pareja;

    -- Datos de ejemplo (opcional, para pruebas)
    -- INSERT INTO configuracion_parejas (usuario_id, nombre_usuario, nombre_pareja, ingresos_usuario, ingresos_pareja)
    -- VALUES ('user-id-aqui', 'Juan', 'María', 5000.00, 3000.00);

    -- INSERT INTO gastos_compartidos (configuracion_id, descripcion, monto, categoria, fecha, pagado_por)
    -- VALUES 
    --     ('config-id-aqui', 'Supermercado semanal', 150.00, 'alimentacion', CURRENT_DATE, 'usuario'),
    --     ('config-id-aqui', 'Renta mensual', 800.00, 'vivienda', CURRENT_DATE, 'pareja'),
    --     ('config-id-aqui', 'Servicios internet', 50.00, 'servicios', CURRENT_DATE, 'usuario');
