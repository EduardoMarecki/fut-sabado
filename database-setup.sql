-- EXECUTE ESTE SQL NO LOVABLE CLOUD (Cloud tab > SQL Editor)
-- Copie e cole todo este conteúdo e execute

-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    players_per_team INTEGER NOT NULL,
    ball_responsible TEXT NOT NULL,
    vest_responsible TEXT NOT NULL,
    teams_drawn BOOLEAN DEFAULT false,
    finished BOOLEAN DEFAULT false,
    final_score_team1 INTEGER,
    final_score_team2 INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create game_players table
CREATE TABLE IF NOT EXISTS public.game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    whatsapp TEXT,
    preferred_position TEXT,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'maybe', 'not_going')),
    team_number INTEGER,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create players registry table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    whatsapp TEXT NULL UNIQUE,
    preferred_position TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    responsible_player TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create player_statistics table
CREATE TABLE IF NOT EXISTS public.player_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    whatsapp TEXT NULL UNIQUE,
    total_games INTEGER DEFAULT 0,
    total_goals INTEGER DEFAULT 0,
    total_assists INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow public read access on games" ON public.games
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on games" ON public.games
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on games" ON public.games
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on games" ON public.games
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access on game_players" ON public.game_players
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on game_players" ON public.game_players
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on game_players" ON public.game_players
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on game_players" ON public.game_players
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access on materials" ON public.materials
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on materials" ON public.materials
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on materials" ON public.materials
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on materials" ON public.materials
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access on player_statistics" ON public.player_statistics
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on player_statistics" ON public.player_statistics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on player_statistics" ON public.player_statistics
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on player_statistics" ON public.player_statistics
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access on players" ON public.players
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on players" ON public.players
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on players" ON public.players
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on players" ON public.players
    FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_materials_game_id ON public.materials(game_id);
CREATE INDEX IF NOT EXISTS idx_player_statistics_whatsapp ON public.player_statistics(whatsapp);
CREATE INDEX IF NOT EXISTS idx_player_statistics_name ON public.player_statistics(name);
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);

-- Evitar duplicidade de presença no mesmo jogo
-- Unicidade por WhatsApp (normalizado) quando informado
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_game_players_game_whatsapp'
  ) THEN
    CREATE UNIQUE INDEX ux_game_players_game_whatsapp
    ON public.game_players (
      game_id,
      (regexp_replace(whatsapp, '\\D', '', 'g'))
    )
    WHERE whatsapp IS NOT NULL;
  END IF;
END $$;

-- Unicidade por nome (lower) quando WhatsApp não informado
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_game_players_game_name_nowa'
  ) THEN
    CREATE UNIQUE INDEX ux_game_players_game_name_nowa
    ON public.game_players (
      game_id,
      lower(name)
    )
    WHERE whatsapp IS NULL;
  END IF;
END $$;
