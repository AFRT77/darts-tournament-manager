-- Fase 3: torneos e inscripciones
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('knockout', 'round_robin', 'groups_knockout')),
  game_type TEXT NOT NULL CHECK (game_type IN ('501', '301', 'cricket')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'finished')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seed INTEGER,
  group_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON public.tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_player ON public.tournament_players(player_id);

DROP TRIGGER IF EXISTS tournaments_set_updated_at ON public.tournaments;
CREATE TRIGGER tournaments_set_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournaments are viewable by authenticated users" ON public.tournaments;
CREATE POLICY "Tournaments are viewable by authenticated users"
  ON public.tournaments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tournament players are viewable by authenticated users" ON public.tournament_players;
CREATE POLICY "Tournament players are viewable by authenticated users"
  ON public.tournament_players FOR SELECT
  TO authenticated
  USING (true);
