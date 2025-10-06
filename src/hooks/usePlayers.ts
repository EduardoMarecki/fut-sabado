import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeString, isValidWhatsapp } from '@/lib/validation';

export interface RegistryPlayer {
  id: string;
  name: string;
  whatsapp?: string | null;
  preferred_position?: string | null;
}

export const usePlayers = () => {
  const [players, setPlayers] = useState<RegistryPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setPlayers((data || []).map(p => ({
        id: p.id,
        name: p.name,
        whatsapp: p.whatsapp ?? null,
        preferred_position: p.preferred_position ?? null,
      })));
    } catch (err) {
      console.error('Erro ao carregar jogadores cadastrados:', err);
      toast.error('Erro ao carregar jogadores cadastrados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const addRegistryPlayer = async (name: string, whatsapp?: string, preferredPosition?: string) => {
    try {
      const cleanName = sanitizeString(name, 80);
      const cleanWhatsapp = whatsapp && isValidWhatsapp(whatsapp) ? sanitizeString(whatsapp, 20) : '';
      const cleanPreferred = preferredPosition ? sanitizeString(preferredPosition, 40) : undefined;
      if (!cleanName) {
        toast.error('Nome é obrigatório');
        return;
      }

      const { error } = await supabase
        .from('players')
        .insert({
          name: cleanName,
          whatsapp: cleanWhatsapp || null,
          preferred_position: cleanPreferred || null,
        });
      if (error) throw error;
      toast.success('Jogador cadastrado!');
      await loadPlayers();
    } catch (err) {
      console.error('Erro ao cadastrar jogador:', err);
      toast.error('Erro ao cadastrar jogador');
    }
  };

  const updateRegistryPlayer = async (id: string, name: string, whatsapp?: string | null, preferredPosition?: string | null) => {
    try {
      const cleanName = sanitizeString(name, 80);
      const cleanWhatsapp = whatsapp && isValidWhatsapp(whatsapp) ? sanitizeString(whatsapp, 20) : '';
      const cleanPreferred = preferredPosition ? sanitizeString(preferredPosition, 40) : undefined;
      if (!cleanName) {
        toast.error('Nome é obrigatório');
        return;
      }
      const { error } = await supabase
        .from('players')
        .update({
          name: cleanName,
          whatsapp: cleanWhatsapp || null,
          preferred_position: cleanPreferred || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Jogador atualizado!');
      await loadPlayers();
    } catch (err) {
      console.error('Erro ao atualizar jogador:', err);
      toast.error('Erro ao atualizar jogador');
    }
  };

  const deleteRegistryPlayer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Jogador removido!');
      await loadPlayers();
    } catch (err) {
      console.error('Erro ao remover jogador:', err);
      toast.error('Erro ao remover jogador');
    }
  };

  return { players, loading, refresh: loadPlayers, addRegistryPlayer, updateRegistryPlayer, deleteRegistryPlayer };
};