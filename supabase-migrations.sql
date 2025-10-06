-- Auditoria mínima
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event text not null,
  entity_type text not null,
  entity_id text null,
  details jsonb null
);

alter table audit_log enable row level security;
create policy if not exists "Allow public read access on audit_log" on audit_log
  for select using (true);
create policy if not exists "Allow public insert on audit_log" on audit_log
  for insert with check (true);

-- Função RPC para finalizar jogo e atualizar estatísticas
create or replace function finish_game(
  p_game_id uuid,
  p_final_score_team1 integer,
  p_final_score_team2 integer,
  p_player_stats jsonb
) returns void as $$
declare
  stat record;
  player_rec record;
begin
  if p_final_score_team1 < 0 or p_final_score_team2 < 0 then
    raise exception 'Scores must be non-negative';
  end if;

  update games
  set finished = true,
      final_score_team1 = p_final_score_team1,
      final_score_team2 = p_final_score_team2
  where id = p_game_id;

  for stat in select
    (elem->>'playerId')::uuid as player_id,
    coalesce((elem->>'goals')::int, 0) as goals,
    coalesce((elem->>'assists')::int, 0) as assists
  from jsonb_array_elements(p_player_stats) as elem
  loop
    update game_players
    set goals = greatest(0, stat.goals),
        assists = greatest(0, stat.assists)
    where id = stat.player_id and game_id = p_game_id;
  end loop;

  for player_rec in
    select id, name, whatsapp, team_number
    from game_players
    where game_id = p_game_id and team_number in (1, 2) and whatsapp is not null
  loop
    insert into player_statistics (name, whatsapp, total_games, total_goals, wins, losses, draws, updated_at)
    values (
      player_rec.name,
      player_rec.whatsapp,
      1,
      0,
      case when player_rec.team_number = 1 and p_final_score_team1 > p_final_score_team2 then 1
           when player_rec.team_number = 2 and p_final_score_team2 > p_final_score_team1 then 1
           else 0 end,
      case when player_rec.team_number = 1 and p_final_score_team1 < p_final_score_team2 then 1
           when player_rec.team_number = 2 and p_final_score_team2 < p_final_score_team1 then 1
           else 0 end,
      case when p_final_score_team1 = p_final_score_team2 then 1 else 0 end,
      now()
    )
    on conflict (whatsapp) do update set
      name = excluded.name,
      total_games = player_statistics.total_games + 1,
      wins = player_statistics.wins + excluded.wins,
      losses = player_statistics.losses + excluded.losses,
      draws = player_statistics.draws + excluded.draws,
      updated_at = now();
  end loop;

  for stat in select
    (elem->>'playerId')::uuid as player_id,
    coalesce((elem->>'goals')::int, 0) as goals,
    coalesce((elem->>'assists')::int, 0) as assists
  from jsonb_array_elements(p_player_stats) as elem
  loop
    update player_statistics ps
    set total_goals = ps.total_goals + greatest(0, stat.goals),
        total_assists = coalesce(ps.total_assists, 0) + greatest(0, stat.assists),
        updated_at = now()
    from game_players gp
    where gp.id = stat.player_id
      and gp.game_id = p_game_id
      and gp.whatsapp is not null
      and ps.whatsapp = gp.whatsapp;
  end loop;
end;
$$ language plpgsql security definer;

comment on function finish_game(uuid, integer, integer, jsonb) is 'Finalize a game and update player stats';

create index if not exists idx_games_date on games(date);
create index if not exists idx_game_players_game_id on game_players(game_id);
create index if not exists idx_materials_game_id on materials(game_id);

-- Registro global de jogadores
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text null unique,
  preferred_position text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;
drop policy if exists "Public read players" on public.players;
create policy "Public read players" on public.players for select using (true);
drop policy if exists "Public insert players" on public.players;
create policy "Public insert players" on public.players for insert with check (true);
drop policy if exists "Public update players" on public.players;
create policy "Public update players" on public.players for update using (true);
drop policy if exists "Public delete players" on public.players;
create policy "Public delete players" on public.players for delete using (true);
create index if not exists idx_players_name on public.players(name);

-- Autenticação e Perfis
create table if not exists public.profiles (
  id uuid primary key,
  name text not null default '',
  role text not null default 'player' check (role in ('admin','organizer','player')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy if not exists "Own profile read" on public.profiles for select using (auth.uid() = id);
create policy if not exists "Own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy if not exists "Own profile update" on public.profiles for update using (auth.uid() = id);
create policy if not exists "Admin read all profiles" on public.profiles for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Temporadas
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  name text not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz null
);

alter table public.seasons enable row level security;
create policy if not exists "Public read seasons" on public.seasons for select using (true);
create policy if not exists "Org insert seasons" on public.seasons for insert with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','organizer'))
);
create policy if not exists "Org update seasons" on public.seasons for update using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','organizer'))
);
create policy if not exists "Org delete seasons" on public.seasons for delete using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','organizer'))
);

-- Competições
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  type text not null default 'league' check (type in ('league','cup','friendly')),
  created_at timestamptz not null default now()
);

alter table public.competitions enable row level security;
create policy if not exists "Public read competitions" on public.competitions for select using (true);
create policy if not exists "Org insert competitions" on public.competitions for insert with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','organizer'))
);
create policy if not exists "Org update competitions" on public.competitions for update using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','organizer'))
);
create policy if not exists "Org delete competitions" on public.competitions for delete using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','organizer'))
);

-- Alterações em games
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name = 'games' and column_name = 'season_id') then
    alter table public.games add column season_id uuid null references public.seasons(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name = 'games' and column_name = 'competition_id') then
    alter table public.games add column competition_id uuid null references public.competitions(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name = 'games' and column_name = 'deleted_at') then
    alter table public.games add column deleted_at timestamptz null;
  end if;
end $$;

-- Alterações em player_statistics: adicionar coluna de assistências
do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='player_statistics' and column_name='total_assists'
  ) then
    alter table public.player_statistics add column total_assists integer default 0;
  end if;
end $$;

-- RLS para games: permitir leitura pública e escrita sem autenticação
alter table public.games enable row level security;
create policy if not exists "Public read games" on public.games for select using (true);
create policy if not exists "Public insert games" on public.games for insert with check (true);
create policy if not exists "Public update games" on public.games for update using (true);
create policy if not exists "Public delete games" on public.games for delete using (true);
create policy if not exists "Public delete games" on public.games for delete using (true);

-- RSVP vinculado ao usuário
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name = 'game_players' and column_name = 'user_id') then
    alter table public.game_players add column user_id uuid null;
  end if;
end $$;

create index if not exists idx_game_players_user on public.game_players(user_id);
create unique index if not exists ux_game_players_game_user on public.game_players(game_id, user_id) where user_id is not null;

-- Evitar duplicidade de presença
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='ux_game_players_game_whatsapp') then
    create unique index ux_game_players_game_whatsapp
      on public.game_players (
        game_id,
        (regexp_replace(whatsapp, '\\D', '', 'g'))
      ) where whatsapp is not null;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='ux_game_players_game_name_nowa') then
    create unique index ux_game_players_game_name_nowa
      on public.game_players (
        game_id,
        lower(name)
      ) where whatsapp is null;
  end if;
end $$;

-- Timeline
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  minute integer not null check (minute >= 0 and minute <= 120),
  event_type text not null check (event_type in ('goal','assist','yellow_card','red_card','substitution','note')),
  team_number integer null check (team_number in (1,2)),
  player_id uuid null references public.game_players(id) on delete set null,
  assist_player_id uuid null references public.game_players(id) on delete set null,
  description text null
);

alter table public.match_events enable row level security;
create policy if not exists "Public read match_events" on public.match_events for select using (true);
create policy if not exists "Public insert match_events" on public.match_events for insert with check (true);
create policy if not exists "Public update match_events" on public.match_events for update using (true);
create policy if not exists "Public delete match_events" on public.match_events for delete using (true);

-- RPC: agendar jogo com detecção de conflito
create or replace function schedule_game(
  p_date text,
  p_time text,
  p_location text,
  p_players_per_team integer,
  p_ball_responsible text,
  p_vest_responsible text,
  p_season_id uuid,
  p_competition_id uuid
) returns uuid as $$
declare
  v_game_id uuid;
begin
  if exists (
    select 1 from public.games g
    where g.date = p_date and g.time = p_time and g.location = p_location and coalesce(g.finished,false) = false
  ) then
    raise exception 'Conflict: Another game at same date/time/location';
  end if;

  insert into public.games (date, time, location, players_per_team, ball_responsible, vest_responsible, season_id, competition_id)
  values (p_date, p_time, p_location, p_players_per_team, p_ball_responsible, p_vest_responsible, p_season_id, p_competition_id)
  returning id into v_game_id;

  return v_game_id;
end;
$$ language plpgsql security definer;

comment on function schedule_game(text, text, text, integer, text, text, uuid, uuid) is 'Schedule a game with conflict detection';

-- RPC: RSVP
create or replace function rsvp_game(
  p_game_id uuid,
  p_status text
) returns void as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_status not in ('confirmed','maybe','not_going') then
    raise exception 'Invalid status';
  end if;

  select name into v_name from public.profiles where id = v_uid;
  if v_name is null then v_name := 'Jogador'; end if;

  insert into public.game_players (game_id, user_id, name, status)
    values (p_game_id, v_uid, v_name, p_status)
  on conflict (game_id, user_id) do update set status = excluded.status, name = excluded.name;
end;
$$ language plpgsql security definer;

comment on function rsvp_game(uuid, text) is 'RSVP for authenticated player';

-- RPC: adicionar evento
create or replace function add_match_event(
  p_game_id uuid,
  p_event jsonb
) returns void as $$
declare
  v_minute integer;
  v_type text;
  v_team integer;
  v_player uuid;
  v_assist uuid;
  v_desc text;
begin
  v_minute := coalesce((p_event->>'minute')::int, 0);
  v_type := p_event->>'event_type';
  v_team := coalesce((p_event->>'team_number')::int, null);
  v_player := coalesce((p_event->>'player_id')::uuid, null);
  v_assist := coalesce((p_event->>'assist_player_id')::uuid, null);
  v_desc := p_event->>'description';

  if v_minute < 0 or v_minute > 120 then
    raise exception 'Invalid minute';
  end if;
  if v_type not in ('goal','assist','yellow_card','red_card','substitution','note') then
    raise exception 'Invalid event_type';
  end if;

  insert into public.match_events (game_id, minute, event_type, team_number, player_id, assist_player_id, description)
  values (p_game_id, v_minute, v_type, v_team, v_player, v_assist, v_desc);
end;
$$ language plpgsql security definer;

comment on function add_match_event(uuid, jsonb) is 'Add a timeline event to a game';

-- RPC: fechar temporada
create or replace function close_season(
  p_season_id uuid
) returns void as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin','organizer') then
    raise exception 'Not authorized to close seasons';
  end if;

  update public.seasons set status = 'closed', closed_at = now() where id = p_season_id;
end;
$$ language plpgsql security definer;

comment on function close_season(uuid) is 'Close a season (status=closed)';