-- =============================================
-- Fix completo para RLS en Finanzas de Pareja
-- =============================================

-- Desactivar RLS temporalmente
ALTER TABLE ingresos_pareja DISABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_compartidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_parejas DISABLE ROW LEVEL SECURITY;
ALTER TABLE balances_mensuales DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Ver configuraciones" ON configuracion_parejas;
DROP POLICY IF EXISTS "Ver ingresos" ON ingresos_pareja;
DROP POLICY IF EXISTS "Ver gastos" ON gastos_compartidos;
DROP POLICY IF EXISTS "Los usuarios solo pueden ver sus ingresos" ON ingresos_pareja;
DROP POLICY IF EXISTS "Los usuarios solo pueden modificar sus ingresos" ON ingresos_pareja;
DROP POLICY IF EXISTS "Los usuarios solo pueden ver sus gastos" ON gastos_compartidos;
DROP POLICY IF EXISTS "Los usuarios solo pueden modificar sus gastos" ON gastos_compartidos;
DROP POLICY IF EXISTS "Los usuarios solo pueden ver su propia configuración" ON configuracion_parejas;
DROP POLICY IF EXISTS "Los usuarios solo pueden modificar su propia configuración" ON configuracion_parejas;

-- Crear políticas completas (lectura y escritura)
CREATE POLICY "Gestionar configuraciones" ON configuracion_parejas FOR ALL USING (auth.uid() = usuario_id);
CREATE POLICY "Gestionar ingresos" ON ingresos_pareja FOR ALL USING (auth.uid() = (SELECT usuario_id FROM configuracion_parejas WHERE id = configuracion_id));
CREATE POLICY "Gestionar gastos" ON gastos_compartidos FOR ALL USING (auth.uid() = (SELECT usuario_id FROM configuracion_parejas WHERE id = configuracion_id));

-- Volver a habilitar RLS
ALTER TABLE configuracion_parejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_pareja ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_compartidos ENABLE ROW LEVEL SECURITY;

-- Nota: balances_mensuales permanece sin RLS por ahora
