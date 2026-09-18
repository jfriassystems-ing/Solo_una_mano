-- ============================================
-- DOMINO LINK - Esquema de Base de Datos
-- ============================================

DROP TABLE IF EXISTS partidas CASCADE;
DROP TABLE IF EXISTS historial_partidas CASCADE;

-- Tabla principal de partidas activas
CREATE TABLE partidas (
  id SERIAL PRIMARY KEY,
  sala_id TEXT UNIQUE NOT NULL,
  estado TEXT DEFAULT 'jugando',              -- 'esperando' | 'jugando' | 'ronda_terminada' | 'partida_terminada'
  num_jugadores INT DEFAULT 4,
  turno INT DEFAULT 1,
  tablero JSONB DEFAULT '[]'::jsonb,
  pozo JSONB DEFAULT '[]'::jsonb,
  manos JSONB DEFAULT '{}'::jsonb,            -- { "1": [[a,b],...], ... }
  nombres JSONB DEFAULT '{}'::jsonb,          -- { "1": "Ana", "2": "Luis", ... }
  puntos_acumulados JSONB DEFAULT '{}'::jsonb,-- { "1": 45, "2": 30, ... }
  pases_seguidos INT DEFAULT 0,               -- para detectar tranca
  ultima_accion TEXT DEFAULT '',              -- "J1 jugó [3|4]" o "J2 robó del pozo"
  ganador_ronda INT,
  ganador_partida INT,
  objetivo_puntos INT DEFAULT 100,            -- partida a 100 pts
  num_ronda INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Historial (opcional, para estadísticas futuras)
CREATE TABLE historial_partidas (
  id SERIAL PRIMARY KEY,
  sala_id TEXT,
  ganador INT,
  nombres JSONB,
  puntos_finales JSONB,
  num_rondas INT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_partidas_updated_at
  BEFORE UPDATE ON partidas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Deshabilitar RLS (para desarrollo; en producción deberías activarlo)
ALTER TABLE partidas DISABLE ROW LEVEL SECURITY;
ALTER TABLE historial_partidas DISABLE ROW LEVEL SECURITY;

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE partidas;

-- Índice para búsquedas rápidas
CREATE INDEX idx_partidas_sala_id ON partidas(sala_id);

-- ============================================
-- LIMPIEZA AUTOMÁTICA (opcional, programar con pg_cron)
-- ============================================
-- DELETE FROM partidas WHERE created_at < now() - interval '24 hours';