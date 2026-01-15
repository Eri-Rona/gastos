-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS ingresos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_ingresos_user_id ON ingresos(user_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_categoria ON ingresos(categoria);
CREATE INDEX IF NOT EXISTS idx_ingresos_creado_en ON ingresos(creado_en);

-- Políticas de seguridad (RLS)
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios ingresos
CREATE POLICY "Los usuarios pueden ver sus propios ingresos" ON ingresos
    FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios puedan insertar sus propios ingresos
CREATE POLICY "Los usuarios pueden insertar sus propios ingresos" ON ingresos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar sus propios ingresos
CREATE POLICY "Los usuarios pueden actualizar sus propios ingresos" ON ingresos
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios puedan eliminar sus propios ingresos
CREATE POLICY "Los usuarios pueden eliminar sus propios ingresos" ON ingresos
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar el campo actualizado_en
CREATE OR REPLACE FUNCTION actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_ingresos_actualizado_en
    BEFORE UPDATE ON ingresos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_actualizado_en();

-- Categorías válidas (opcional: puedes crear una tabla separada para esto)
-- Trabajo: salario, bono, comisiones, horas_extra, aguinaldo, vacaciones_pagadas, prestaciones
-- Negocios: ventas, servicios, consultoria, freelance, inversion_negocio, ganancias_capital
-- Inversiones: dividendos, intereses, renta_inmuebles, ganancias_bolsa, criptomonedas, fondos_inversion
-- Freelance: proyectos_web, diseno_grafico, redaccion, traduccion, programacion, marketing_digital, consultoria_freelance
-- Varios: regalos, prestamos_recibidos, reembolsos, premios, herencias, loteria
-- Pasivos: pension, jubilacion, seguro_desempleo, apoyo_familiar, becas, subsidios
-- Otros: venta_articulos, alquiler_temporal, ingresos_extra, reembolso_gastos, ingresos_no_categorizados
