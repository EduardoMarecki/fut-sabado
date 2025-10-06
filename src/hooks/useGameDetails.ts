import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Game, Player, PlayerStatus, MatchEvent } from '@/types/game';
import { toast } from 'sonner';
import { logEvent } from '@/lib/audit';
import { sanitizeString, isValidWhatsapp } from '@/lib/validation';

export const useGameDetails = (gameId: string | undefined) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const loadGame = async () => {
    if (!gameId) return;
    if (loadingRef.current) return;

    try {
      setLoading(true);
      loadingRef.current = true;
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      // Carregamentos paralelos com tolerância a aborts
      const playersQuery = supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId);

      const materialsQuery = supabase
        .from('materials')
        .select('*')
        .eq('game_id', gameId);

      const eventsQuery = supabase
        .from('match_events')
        .select('*')
        .eq('game_id', gameId)
        .order('minute', { ascending: true });

      const [playersResult, materialsResult, eventsResult] = await Promise.allSettled([
        playersQuery,
        materialsQuery,
        eventsQuery,
      ]);

      const safeData = <T>(res: PromiseSettledResult<any>): T[] => {
        if (res.status === 'fulfilled') {
          return (res.value?.data || []) as T[];
        }
        const msg = String((res as any)?.reason?.message || '').toLowerCase();
        const name = String((res as any)?.reason?.name || '').toLowerCase();
        const aborted = name.includes('abort') || msg.includes('abort');
        if (!aborted) {
          console.warn('Carga parcial falhou:', (res as any)?.reason);
        }
        return [] as T[];
      };

      const playersData = safeData<any>(playersResult);
      const materialsData = safeData<any>(materialsResult);
      const eventsData = safeData<any>(eventsResult);

      const players: Player[] = (playersData || []).map(p => ({
        id: p.id,
        name: p.name,
        whatsapp: p.whatsapp,
        preferredPosition: p.preferred_position,
        status: p.status as PlayerStatus,
        goals: p.goals,
        assists: p.assists
      }));

      const team1 = (playersData || [])
        .filter(p => p.team_number === 1)
        .map(p => ({
          id: p.id,
          name: p.name,
          whatsapp: p.whatsapp,
          preferredPosition: p.preferred_position,
          status: p.status as PlayerStatus,
          goals: p.goals,
          assists: p.assists
        }));

      const team2 = (playersData || [])
        .filter(p => p.team_number === 2)
        .map(p => ({
          id: p.id,
          name: p.name,
          whatsapp: p.whatsapp,
          preferredPosition: p.preferred_position,
          status: p.status as PlayerStatus,
          goals: p.goals,
          assists: p.assists
        }));

      setGame({
        id: gameData.id,
        date: gameData.date,
        time: gameData.time,
        location: gameData.location,
        playersPerTeam: gameData.players_per_team,
        ballResponsible: gameData.ball_responsible,
        vestResponsible: gameData.vest_responsible,
        players,
        materials: (materialsData || []).map(m => ({
          id: m.id,
          item: m.item,
          responsiblePlayer: m.responsible_player
        })),
        teams: team1.length > 0 && team2.length > 0 ? { team1, team2 } : undefined,
        finished: gameData.finished,
        finalScoreTeam1: gameData.final_score_team1,
        finalScoreTeam2: gameData.final_score_team2,
        events: ((eventsData || []) as any[]).map(e => ({
          id: e.id,
          game_id: e.game_id,
          minute: e.minute,
          event_type: e.event_type,
          team_number: e.team_number ?? undefined,
          player_id: e.player_id ?? null,
          assist_player_id: e.assist_player_id ?? null,
          description: e.description ?? null,
        })) as MatchEvent[]
      });
    } catch (error) {
      console.error('Error loading game:', error);
      toast.error('Erro ao carregar jogo');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadGame();
  }, [gameId]);

  const addPlayer = async (name: string, whatsapp: string, status: PlayerStatus, preferredPosition?: string) => {
    if (!gameId) return;
    if (game?.finished) {
      toast.info('Jogo finalizado: edição de presença desabilitada.');
      return;
    }

    try {
      const cleanName = sanitizeString(name);
      const cleanPreferred = preferredPosition ? sanitizeString(preferredPosition) : undefined;
      const cleanWhatsapp = whatsapp && isValidWhatsapp(whatsapp) ? whatsapp : '';
      // Prevenir duplicidade: WhatsApp (preferencial) ou nome quando sem WhatsApp
      const newWhatsDigits = (cleanWhatsapp || '').replace(/\D/g, '');
      const nameKey = cleanName.toLocaleLowerCase('pt-BR');
      const alreadyExists = !!game?.players?.some(p => {
        const pWhats = (p.whatsapp || '').replace(/\D/g, '');
        const whatsMatch = !!newWhatsDigits && !!pWhats && pWhats === newWhatsDigits;
        const nameMatch = !newWhatsDigits && (p.name || '').toLocaleLowerCase('pt-BR') === nameKey;
        return whatsMatch || nameMatch;
      });
      if (alreadyExists) {
        toast.info('Jogador já confirmado para este jogo.');
        return;
      }
      const { error } = await supabase
        .from('game_players')
        .insert({
          game_id: gameId,
          name: cleanName,
          whatsapp: cleanWhatsapp || null,
          preferred_position: cleanPreferred || null,
          status
        });

      if (error) throw error;

      await loadGame();
      toast.success('Presença confirmada!');
      await logEvent('player_added', 'game', gameId, { name: cleanName, whatsapp: cleanWhatsapp || null });
    } catch (error) {
      console.error('Error adding player:', error);
      toast.error('Erro ao adicionar jogador');
    }
  };

  const addPlayerFromRegistry = async (registryPlayerId: string, status: PlayerStatus) => {
    if (!gameId) return;
    if (game?.finished) {
      toast.info('Jogo finalizado: edição de presença desabilitada.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, whatsapp, preferred_position')
        .eq('id', registryPlayerId)
        .single();
      if (error) throw error;
      // Checagem de duplicidade antes de inserir
      const regName = sanitizeString(data.name);
      const regWhats = (data.whatsapp || '').replace(/\D/g, '');
      const regNameKey = regName.toLocaleLowerCase('pt-BR');
      const alreadyRegExists = !!game?.players?.some(p => {
        const pWhats = (p.whatsapp || '').replace(/\D/g, '');
        const whatsMatch = !!regWhats && !!pWhats && pWhats === regWhats;
        const nameMatch = !regWhats && (p.name || '').toLocaleLowerCase('pt-BR') === regNameKey;
        return whatsMatch || nameMatch;
      });
      if (alreadyRegExists) {
        toast.info('Jogador já confirmado para este jogo.');
        return;
      }
      const { error: insError } = await supabase
        .from('game_players')
        .insert({
          game_id: gameId,
          name: data.name,
          whatsapp: data.whatsapp ?? null,
          preferred_position: data.preferred_position ?? null,
          status
        });
      if (insError) throw insError;
      await loadGame();
      toast.success('Presença confirmada pelo cadastro!');
      await logEvent('player_added_registry', 'game', gameId, { registryPlayerId });
    } catch (err) {
      console.error('Error adding player from registry:', err);
      toast.error('Erro ao adicionar jogador do cadastro');
    }
  };

  const updatePlayerStatus = async (playerId: string, status: PlayerStatus) => {
    if (game?.finished) {
      toast.info('Jogo finalizado: edição de presença desabilitada.');
      return;
    }
    try {
      const { error } = await supabase
        .from('game_players')
        .update({ status, team_number: null })
        .eq('id', playerId);

      if (error) throw error;

      await loadGame();
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Error updating player status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const drawTeams = async () => {
    if (!game) return;
    if (game.finished) {
      toast.info('Jogo finalizado: sorteio desabilitado.');
      return;
    }

    const confirmed = game.players.filter(p => p.status === 'confirmed');
    
    if (confirmed.length < game.playersPerTeam * 2) {
      toast.error(`É necessário ${game.playersPerTeam * 2} jogadores confirmados!`);
      return;
    }

    try {
      // Chave única do jogador
      const getKey = (p: Player) => (p.whatsapp ? p.whatsapp : (p.name || '').toLocaleLowerCase('pt-BR'));
      const withWhatsapps = confirmed.filter(p => !!p.whatsapp).map(p => p.whatsapp as string);
      const withoutWhatsapps = confirmed.filter(p => !p.whatsapp).map(p => p.name);

      // Estatísticas agregadas
      const statsMap = new Map<string, { wins: number; losses: number; draws: number; total_goals: number; total_assists?: number; total_games: number }>();
      if (withWhatsapps.length > 0) {
        const { data: statsByWhatsapp } = await supabase
          .from('player_statistics')
          .select('name, whatsapp, total_games, total_goals, total_assists, wins, losses, draws')
          .in('whatsapp', withWhatsapps);
        for (const s of statsByWhatsapp || []) {
          statsMap.set(String(s.whatsapp), {
            wins: s.wins || 0,
            losses: s.losses || 0,
            draws: s.draws || 0,
            total_goals: s.total_goals || 0,
            total_assists: (s as any).total_assists ?? 0,
            total_games: s.total_games || 0,
          });
        }
      }
      if (withoutWhatsapps.length > 0) {
        const { data: statsByName } = await supabase
          .from('player_statistics')
          .select('name, whatsapp, total_games, total_goals, total_assists, wins, losses, draws')
          .in('name', withoutWhatsapps);
        for (const s of statsByName || []) {
          const key = (s.name || '').toLocaleLowerCase('pt-BR');
          statsMap.set(key, {
            wins: s.wins || 0,
            losses: s.losses || 0,
            draws: s.draws || 0,
            total_goals: s.total_goals || 0,
            total_assists: (s as any).total_assists ?? 0,
            total_games: s.total_games || 0,
          });
        }
      }

      // Jogos recentes para diversidade
      const { data: recentGames } = await supabase
        .from('games')
        .select('id')
        .eq('teams_drawn', true)
        .order('date', { ascending: false })
        .limit(12);
      const recentIds = (recentGames || []).map(g => g.id);

      let recentGamePlayers: Array<{ game_id: string; name: string; whatsapp: string | null; team_number: number | null }> = [];
      if (recentIds.length > 0) {
        const { data: rgp } = await supabase
          .from('game_players')
          .select('game_id, name, whatsapp, team_number')
          .in('game_id', recentIds)
          .in('team_number', [1, 2]);
        recentGamePlayers = rgp || [];
      }

      const currentKeys = new Set(confirmed.map(getKey));
      const pairCount = new Map<string, number>();
      const keyPair = (a: string, b: string) => {
        const [x, y] = [a, b].sort();
        return `${x}|${y}`;
      };
      const byGame: Record<string, { team1: string[]; team2: string[] }> = {};
      for (const gp of recentGamePlayers) {
        const gId = gp.game_id;
        const k = gp.whatsapp ? gp.whatsapp : (gp.name || '').toLocaleLowerCase('pt-BR');
        if (!currentKeys.has(k)) continue;
        if (!byGame[gId]) byGame[gId] = { team1: [], team2: [] };
        if (gp.team_number === 1) byGame[gId].team1.push(k);
        if (gp.team_number === 2) byGame[gId].team2.push(k);
      }
      for (const g of Object.values(byGame)) {
        const processTeam = (arr: string[]) => {
          for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
              const pcKey = keyPair(arr[i], arr[j]);
              pairCount.set(pcKey, (pairCount.get(pcKey) || 0) + 1);
            }
          }
        };
        processTeam(g.team1);
        processTeam(g.team2);
      }

      const computeStrength = (p: Player) => {
        const s = statsMap.get(getKey(p));
        const wins = s?.wins || 0;
        const losses = s?.losses || 0;
        const draws = s?.draws || 0;
        const goals = s?.total_goals || 0;
        const assists = s?.total_assists || 0;
        const base = wins * 2 + goals * 1 + assists * 0.5 + draws * 0.5 - losses * 0.5;
        return base + Math.random() * 0.1;
      };

      type Cand = { player: Player; key: string; strength: number; pos?: string };
      const candidates: Cand[] = confirmed.map(p => ({
        player: p,
        key: getKey(p),
        strength: computeStrength(p),
        pos: p.preferredPosition || undefined,
      }));
      candidates.sort((a, b) => b.strength - a.strength);

      const team1: Cand[] = [];
      const team2: Cand[] = [];
      const posList = ['Zagueiro', 'Meio-Campo', 'Atacante'];
      const countPos = (arr: Cand[]) => {
        const map = new Map<string, number>();
        for (const p of arr) {
          if (p.pos && posList.includes(p.pos)) {
            map.set(p.pos, (map.get(p.pos) || 0) + 1);
          }
        }
        return map;
      };

      const teamStrength = (arr: Cand[]) => arr.reduce((acc, c) => acc + c.strength, 0);
      const teammatePenalty = (arr: Cand[], cand: Cand) => arr.reduce((acc, c) => acc + (pairCount.get(keyPair(c.key, cand.key)) || 0), 0);
      const positionPenaltyAfter = (t1: Cand[], t2: Cand[], cand: Cand, assignTo: 1 | 2) => {
        const p1 = countPos(t1);
        const p2 = countPos(t2);
        if (cand.pos && posList.includes(cand.pos)) {
          if (assignTo === 1) p1.set(cand.pos, (p1.get(cand.pos) || 0) + 1);
          else p2.set(cand.pos, (p2.get(cand.pos) || 0) + 1);
        }
        let sumDiff = 0;
        for (const pos of posList) {
          sumDiff += Math.abs((p1.get(pos) || 0) - (p2.get(pos) || 0));
        }
        return sumDiff;
      };

      const wStrength = 1.0;
      const wPosition = 1.3;
      const wTeammate = 1.0;

      for (const cand of candidates) {
        const cap1 = team1.length < game.playersPerTeam;
        const cap2 = team2.length < game.playersPerTeam;
        if (!cap1 && !cap2) break;
        if (cap1 && !cap2) { team1.push(cand); continue; }
        if (!cap1 && cap2) { team2.push(cand); continue; }
        const strengthDiff1 = Math.abs((teamStrength(team1) + cand.strength) - teamStrength(team2));
        const strengthDiff2 = Math.abs(teamStrength(team1) - (teamStrength(team2) + cand.strength));
        const posPen1 = positionPenaltyAfter(team1, team2, cand, 1);
        const posPen2 = positionPenaltyAfter(team1, team2, cand, 2);
        const matePen1 = teammatePenalty(team1, cand);
        const matePen2 = teammatePenalty(team2, cand);
        const score1 = wStrength * strengthDiff1 + wPosition * posPen1 + wTeammate * matePen1 + Math.random() * 0.05;
        const score2 = wStrength * strengthDiff2 + wPosition * posPen2 + wTeammate * matePen2 + Math.random() * 0.05;
        if (score1 <= score2) team1.push(cand); else team2.push(cand);
      }

      const team1Players = team1.map(c => c.player);
      const team2Players = team2.map(c => c.player);

      await Promise.all([
        ...team1Players.map(p => 
          supabase
            .from('game_players')
            .update({ team_number: 1 })
            .eq('id', p.id)
        ),
        ...team2Players.map(p => 
          supabase
            .from('game_players')
            .update({ team_number: 2 })
            .eq('id', p.id)
        )
      ]);

      await supabase
        .from('games')
        .update({ teams_drawn: true })
        .eq('id', gameId);

      await loadGame();
      toast.success('Times sorteados com sucesso!');
      await logEvent('teams_drawn', 'game', gameId, { team1: team1Players.map(p=>p.id), team2: team2Players.map(p=>p.id) });
    } catch (error) {
      console.error('Error drawing teams:', error);
      toast.error('Erro ao sortear times');
    }
  };

  const deletePlayer = async (playerId: string) => {
    if (game?.finished) {
      toast.info('Jogo finalizado: edição de presença desabilitada.');
      return;
    }
    try {
      const { error } = await supabase
        .from('game_players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      await loadGame();
      toast.success('Jogador removido!');
      await logEvent('player_deleted', 'game', gameId ?? null, { playerId });
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('Erro ao remover jogador');
    }
  };

  const finishGame = async (
    finalScoreTeam1: number,
    finalScoreTeam2: number,
    playerStats: Array<{ playerId: string; goals: number; assists: number }>
  ) => {
    if (!gameId) return;

    // Detecta se a coluna total_assists existe para evitar erros 42703
    const detectAssistsColumn = async (): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('player_statistics')
          .select('total_assists')
          .limit(1);
        if (error && (error as any).code === '42703') {
          return false;
        }
        return true;
      } catch (e: any) {
        // Em caso de erro inesperado, assumimos que não existe para garantir robustez
        return false;
      }
    };

    const hasAssistsColumn = await detectAssistsColumn();

    const attemptRpc = async () => {
      const { error } = await supabase.rpc('finish_game', {
        p_game_id: gameId,
        p_final_score_team1: finalScoreTeam1,
        p_final_score_team2: finalScoreTeam2,
        p_player_stats: playerStats,
      });
      return error as any;
    };

    const finishClientSide = async () => {
      // Atualiza o jogo como finalizado com o placar
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          finished: true,
          final_score_team1: finalScoreTeam1,
          final_score_team2: finalScoreTeam2,
        })
        .eq('id', gameId);
      if (gameUpdateError) throw gameUpdateError;

      // Mapa de estatísticas por jogador para atualização de gols/assistências
      const statMap = new Map<string, { goals: number; assists: number }>();
      for (const s of playerStats) {
        statMap.set(s.playerId, {
          goals: Math.max(0, s.goals || 0),
          assists: Math.max(0, s.assists || 0),
        });
      }

      // Atualiza gols/assistências dos jogadores informados
      for (const [playerId, s] of statMap.entries()) {
        const { error: gpUpdateError } = await supabase
          .from('game_players')
          .update({ goals: s.goals, assists: s.assists })
          .eq('id', playerId)
          .eq('game_id', gameId);
        if (gpUpdateError) throw gpUpdateError;
      }

      // Carrega jogadores confirmados (time 1 e 2) para atualizar estatísticas agregadas
      const { data: teamPlayers, error: loadPlayersError } = await supabase
        .from('game_players')
        .select('id, name, whatsapp, team_number')
        .eq('game_id', gameId)
        .in('team_number', [1, 2]);
      if (loadPlayersError) throw loadPlayersError;

      const isDraw = finalScoreTeam1 === finalScoreTeam2;
      const team1Won = finalScoreTeam1 > finalScoreTeam2;
      const team2Won = finalScoreTeam2 > finalScoreTeam1;

      for (const p of teamPlayers || []) {
        const goals = statMap.get(p.id)?.goals || 0;
        const assists = statMap.get(p.id)?.assists || 0;
        const winInc = (p.team_number === 1 && team1Won) || (p.team_number === 2 && team2Won) ? 1 : 0;
        const lossInc = (p.team_number === 1 && team2Won) || (p.team_number === 2 && team1Won) ? 1 : 0;
        const drawInc = isDraw ? 1 : 0;

        let current: any = null;
        const selectColsWithWhatsapp = hasAssistsColumn
          ? 'id, total_games, total_goals, total_assists, wins, losses, draws, whatsapp'
          : 'id, total_games, total_goals, wins, losses, draws, whatsapp';
        const selectColsWithName = hasAssistsColumn
          ? 'id, total_games, total_goals, total_assists, wins, losses, draws, name'
          : 'id, total_games, total_goals, wins, losses, draws, name';
        if (p.whatsapp) {
          const { data: existingStats, error: statsLoadError } = await supabase
            .from('player_statistics')
            .select(selectColsWithWhatsapp)
            .eq('whatsapp', p.whatsapp)
            .limit(1);
          if (statsLoadError) throw statsLoadError;
          current = existingStats && existingStats.length > 0 ? existingStats[0] : null;
        } else {
          const { data: existingByName, error: statsLoadError } = await supabase
            .from('player_statistics')
            .select(selectColsWithName)
            .eq('name', p.name)
            .limit(1);
          if (statsLoadError) throw statsLoadError;
          current = existingByName && existingByName.length > 0 ? existingByName[0] : null;
        }

        const payloadBase: any = {
          name: p.name,
          whatsapp: p.whatsapp ?? null,
          total_games: (current?.total_games || 0) + 1,
          total_goals: (current?.total_goals || 0) + Math.max(0, goals),
          wins: (current?.wins || 0) + winInc,
          losses: (current?.losses || 0) + lossInc,
          draws: (current?.draws || 0) + drawInc,
          updated_at: new Date().toISOString(),
        };
        const payload: Record<string, any> = hasAssistsColumn
          ? { ...payloadBase, total_assists: (current?.total_assists || 0) + Math.max(0, assists) }
          : payloadBase;

        if (p.whatsapp) {
          const { error: upsertError } = await supabase
            .from('player_statistics')
            .upsert(payload, { onConflict: 'whatsapp' });
          if (upsertError) throw upsertError;
        } else if (current?.id) {
          const { error: updateError } = await supabase
            .from('player_statistics')
            .update(payload)
            .eq('id', current.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('player_statistics')
            .insert(payload);
          if (insertError) throw insertError;
        }
      }
    };

    // Pós-processamento quando RPC é bem-sucedido: atualiza estatísticas por nome para jogadores sem WhatsApp
    const updateNoWhatsappStats = async () => {
      // Mapa de estatísticas por jogador para atualização de gols/assistências
      const statMap = new Map<string, { goals: number; assists: number }>();
      for (const s of playerStats) {
        statMap.set(s.playerId, {
          goals: Math.max(0, s.goals || 0),
          assists: Math.max(0, s.assists || 0),
        });
      }

      // Carrega jogadores confirmados (time 1 e 2)
      const { data: teamPlayers, error: loadPlayersError } = await supabase
        .from('game_players')
        .select('id, name, whatsapp, team_number')
        .eq('game_id', gameId)
        .in('team_number', [1, 2]);
      if (loadPlayersError) throw loadPlayersError;

      const isDraw = finalScoreTeam1 === finalScoreTeam2;
      const team1Won = finalScoreTeam1 > finalScoreTeam2;
      const team2Won = finalScoreTeam2 > finalScoreTeam1;

      for (const p of (teamPlayers || []).filter(tp => !tp.whatsapp)) {
        const goals = statMap.get(p.id)?.goals || 0;
        const assists = statMap.get(p.id)?.assists || 0;
        const winInc = (p.team_number === 1 && team1Won) || (p.team_number === 2 && team2Won) ? 1 : 0;
        const lossInc = (p.team_number === 1 && team2Won) || (p.team_number === 2 && team1Won) ? 1 : 0;
        const drawInc = isDraw ? 1 : 0;

        const { data: existingByName, error: statsLoadError } = await supabase
          .from('player_statistics')
          .select(hasAssistsColumn
            ? 'id, total_games, total_goals, total_assists, wins, losses, draws, name'
            : 'id, total_games, total_goals, wins, losses, draws, name')
          .eq('name', p.name)
          .limit(1);
        if (statsLoadError) throw statsLoadError;
        const current = existingByName && existingByName.length > 0 ? existingByName[0] : null;

        const payloadBase: any = {
          name: p.name,
          whatsapp: null,
          total_games: (current as any)?.total_games || 0 + 1,
          total_goals: ((current as any)?.total_goals || 0) + Math.max(0, goals),
          wins: ((current as any)?.wins || 0) + winInc,
          losses: ((current as any)?.losses || 0) + lossInc,
          draws: ((current as any)?.draws || 0) + drawInc,
          updated_at: new Date().toISOString(),
        };
        const payload: Record<string, any> = hasAssistsColumn
          ? { ...payloadBase, total_assists: ((current as any)?.total_assists || 0) + Math.max(0, assists) }
          : payloadBase;

        if (current && 'id' in current && current.id) {
          const { error: updateError } = await supabase
            .from('player_statistics')
            .update(payload)
            .eq('id', current.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('player_statistics')
            .insert(payload);
          if (insertError) throw insertError;
        }
      }
    };

    try {
      const rpcError = await attemptRpc();
      if (rpcError) {
        const msg = (rpcError.message || '').toLowerCase();
        const needFallback =
          rpcError.code === 'PGRST202' ||
          rpcError.code === '42703' ||
          msg.includes('could not find the function') ||
          msg.includes('finish_game') ||
          (msg.includes('column') && (msg.includes('does not exist') || msg.includes('total_assists')));
        if (needFallback) {
          await finishClientSide();
        } else {
          throw rpcError;
        }
      } else {
        // RPC OK: garantir atualização para jogadores sem WhatsApp
        await updateNoWhatsappStats();
      }

      await loadGame();
      toast.success('Jogo encerrado com sucesso!');
      await logEvent('game_finished', 'game', gameId, { finalScoreTeam1, finalScoreTeam2 });
    } catch (error) {
      console.error('Error finishing game:', error);
      toast.error('Erro ao encerrar jogo');
    }
  };

  // RSVP desativado temporariamente enquanto não há autenticação
  const rsvp = async (_status: PlayerStatus) => {
    toast.info('RSVP temporariamente desativado');
  };

  const addEvent = async (event: Omit<MatchEvent, 'id' | 'game_id'>) => {
    if (!gameId) return;
    if (game?.finished) {
      toast.info('Jogo finalizado: adição de eventos desabilitada.');
      return;
    }
    try {
      const insertPayload = {
        game_id: gameId,
        minute: event.minute,
        event_type: event.event_type,
        team_number: event.team_number ?? null,
        player_id: event.player_id ?? null,
        assist_player_id: event.assist_player_id ?? null,
        description: event.description ?? null,
      };
      const { error } = await supabase
        .from('match_events')
        .insert(insertPayload);
      if (error) throw error;
      await loadGame();
      toast.success('Evento adicionado!');
      await logEvent('match_event_added', 'game', gameId, insertPayload);
    } catch (error: any) {
      console.error('Error adding event:', error);
      const msg = (error?.message || '').toLowerCase();
      const code = error?.code || '';
      const authIssue = msg.includes('not authorized') || code === 'P0001';
      const missingTable = code === 'PGRST205' || msg.includes('could not find the table') || msg.includes('match_events');
      if (authIssue || missingTable) {
        toast.info(missingTable
          ? 'Tabela de eventos ausente no banco; adicionando localmente.'
          : 'Sem permissão para gravar no banco; adicionando evento localmente.');
        const localEvent: MatchEvent = {
          id: crypto.randomUUID(),
          game_id: gameId,
          minute: event.minute,
          event_type: event.event_type,
          team_number: event.team_number ?? undefined,
          player_id: event.player_id ?? null,
          assist_player_id: event.assist_player_id ?? null,
          description: event.description ?? null,
        };
        setGame((prev) => {
          if (!prev) return prev;
          const currentEvents = prev.events ?? [];
          return { ...prev, events: [...currentEvents, localEvent] } as Game;
        });
        return;
      }
      toast.error('Erro ao adicionar evento');
    }
  };

  return {
    game,
    loading,
    addPlayer,
    addPlayerFromRegistry,
    updatePlayerStatus,
    drawTeams,
    deletePlayer,
    finishGame,
    rsvp,
    addEvent,
    refreshGame: loadGame
  };
};
