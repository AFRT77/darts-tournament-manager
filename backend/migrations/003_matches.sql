-- Fase 4 y 5: enfrentamientos y legs
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player1_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  round INTEGER NOT NULL DEFAULT 1,
  bracket_position INTEGER NOT NULL DEFAULT 1,
  group_number INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'finished', 'walkover')),
  winner_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  player1_legs_won INTEGER NOT NULL DEFAULT 0,
  player2_legs_won INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.match_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  leg_number INTEGER NOT NULL,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, leg_number)
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_match_legs_match ON public.match_legs(match_id);

DROP TRIGGER IF EXISTS matches_set_updated_at ON public.matches;
CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_legs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matches are viewable by authenticated users" ON public.matches;
CREATE POLICY "Matches are viewable by authenticated users"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Match legs are viewable by authenticated users" ON public.match_legs;
CREATE POLICY "Match legs are viewable by authenticated users"
  ON public.match_legs FOR SELECT
  TO authenticated
  USING (true);
