import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Game, Player, Material } from '@/types/game';
import { toast } from 'sonner';
import { logEvent } from '@/lib/audit';

export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [hasMore, setHasMore] = useState(false);

  const loadGames = async () => {
    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data: gamesData, error: gamesError, count } = await supabase
        .from('games')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('date', { ascending: true })
        .range(from, to);

      if (gamesError) throw gamesError;

      const gamesWithDetails = await Promise.all(
        (gamesData || []).map(async (game) => {
          const playersQuery = supabase
            .from('game_players')
            .select('*')
            .eq('game_id', game.id);

          const materialsQuery = supabase
            .from('materials')
            .select('*')
            .eq('game_id', game.id);

          const [playersResult, materialsResult] = await Promise.allSettled([
            playersQuery,
            materialsQuery,
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

          const players: Player[] = (playersData || []).map(p => ({
            id: p.id,
            name: p.name,
            whatsapp: p.whatsapp,
            status: p.status as Player['status']
          }));

          const materials: Material[] = (materialsData || []).map(m => ({
            id: m.id,
            item: m.item,
            responsiblePlayer: m.responsible_player
          }));

          const team1 = (playersData || [])
            .filter(p => p.team_number === 1)
            .map(p => ({
              id: p.id,
              name: p.name,
              whatsapp: p.whatsapp,
              status: p.status as Player['status']
            }));

          const team2 = (playersData || [])
            .filter(p => p.team_number === 2)
            .map(p => ({
              id: p.id,
              name: p.name,
              whatsapp: p.whatsapp,
              status: p.status as Player['status']
            }));

          return {
            id: game.id,
            date: game.date,
            time: game.time,
            location: game.location,
            playersPerTeam: game.players_per_team,
            ballResponsible: game.ball_responsible,
            vestResponsible: game.vest_responsible,
            players,
            materials,
            finished: game.finished,
            teams: team1.length > 0 && team2.length > 0 ? { team1, team2 } : undefined
          };
        })
      );

      setGames(gamesWithDetails);
      if (count != null) {
        setHasMore(from + gamesWithDetails.length < count);
      } else {
        setHasMore(gamesWithDetails.length === pageSize);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      toast.error('Erro ao carregar jogos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, [page]);

  const createGame = async (gameData: Omit<Game, 'id' | 'players' | 'materials'>) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          date: gameData.date,
          time: gameData.time,
          location: gameData.location,
          players_per_team: gameData.playersPerTeam,
          ball_responsible: gameData.ballResponsible,
          vest_responsible: gameData.vestResponsible,
        })
        .select()
        .single();

      if (error) throw error;

      await loadGames();
      toast.success('Racha criado com sucesso!');
      // Auditoria mínima
      await logEvent('game_created', 'game', data.id, { location: data.location, date: data.date });
      return data.id;
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Erro ao criar racha');
      throw error;
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      // Sempre fazer soft delete: marcar deleted_at
      const { error } = await supabase
        .from('games')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', gameId);

      if (error) throw error;

      await loadGames();
      toast.success('Racha ocultado com sucesso!');
      await logEvent('game_soft_deleted', 'game', gameId, null);
    } catch (error) {
      console.error('Error deleting game:', error);
      toast.error('Erro ao ocultar racha');
    }
  };

  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => setPage((p) => Math.max(1, p - 1));

  return { games, loading, createGame, deleteGame, refreshGames: loadGames, page, nextPage, prevPage, hasMore };
};
