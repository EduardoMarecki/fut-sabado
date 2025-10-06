import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'organizer' | 'player';
}

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    return data.session;
  }, []);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Erro ao carregar perfil:', error);
      return null;
    }
    if (!data) {
      return null;
    }
    setProfile(data as Profile);
    return data as Profile;
  }, []);

  const ensureProfile = useCallback(async (userId: string, name?: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, name: name || 'Jogador', role: 'player' }, { onConflict: 'id' });
      if (error) throw error;
      await loadProfile(userId);
    } catch (e) {
      console.error('Falha ao garantir perfil:', e);
    }
  }, [loadProfile]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const current = await loadSession();
      await loadProfile(current?.user?.id || null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadProfile(newSession?.user?.id || null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [loadSession, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Falha no login');
      throw error;
    }
    toast.success('Login realizado');
    if (data.session?.user?.id) {
      await ensureProfile(data.session.user.id, data.session.user.email || undefined);
    }
  }, [ensureProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error('Falha no cadastro');
      throw error;
    }
    toast.success('Cadastro realizado, faça login');
    if (data.user?.id) {
      await ensureProfile(data.user.id, email);
    }
  }, [ensureProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    toast.success('Logout realizado');
  }, []);

  return {
    session,
    profile,
    role: profile?.role || 'player',
    loading,
    signIn,
    signUp,
    signOut,
  };
}