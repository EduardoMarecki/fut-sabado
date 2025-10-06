import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Target, TrendingUp, ListFilter, Award, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface PlayerStats {
  id: string;
  name: string;
  whatsapp?: string | null;
  total_games: number;
  total_goals: number;
  total_assists: number;
  wins: number;
  losses: number;
  draws: number;
}

export const Statistics = () => {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [search, setSearch] = useState('');
  const [minGoals, setMinGoals] = useState('');
  const [minAssists, setMinAssists] = useState('');
  const [sortBy, setSortBy] = useState<'total_goals' | 'total_assists' | 'wins' | 'total_games' | 'name'>('total_goals');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [shouldScrollOnUpdate, setShouldScrollOnUpdate] = useState(false);
  const rankingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  // Recarrega automaticamente quando a ordenação muda via cabeçalho
  useEffect(() => {
    loadStatistics();
  }, [sortBy, sortDir]);

  // Após atualizar stats, se houve interação que muda filtros/ordenação, rolar até o ranking
  useEffect(() => {
    if (!loading && shouldScrollOnUpdate && rankingRef.current) {
      const el = rankingRef.current;
      const top = el.getBoundingClientRect().top + window.scrollY - 12; // pequeno offset
      requestAnimationFrame(() => {
        try {
          window.scrollTo({ top, behavior: 'smooth' });
        } finally {
          // aguarda breve intervalo para garantir que o layout estabilizou
          setTimeout(() => setShouldScrollOnUpdate(false), 150);
        }
      });
    }
  }, [loading, stats, shouldScrollOnUpdate]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      const buildQuery = (hasAssists: boolean) => {
        let q = supabase
          .from('player_statistics')
          .select('*');

        // Filtros
        if (search.trim()) {
          q = q.ilike('name', `%${search.trim()}%`);
        }
        const g = parseInt(minGoals, 10);
        if (!isNaN(g)) {
          q = q.gte('total_goals', g);
        }
        const a = parseInt(minAssists, 10);
        if (!isNaN(a) && hasAssists) {
          q = q.gte('total_assists', a);
        }

        // Ordenação dinâmica com múltiplos desempates
        let usedSortBy = sortBy as typeof sortBy;
        if (!hasAssists && usedSortBy === 'total_assists') {
          usedSortBy = 'total_goals';
        }
        q = q.order(usedSortBy, { ascending: sortDir === 'asc' });

        const tieBreakers = hasAssists
          ? ['wins', 'total_goals', 'total_assists', 'total_games', 'name']
          : ['wins', 'total_goals', 'total_games', 'name'];
        for (const col of tieBreakers) {
          if (col === usedSortBy) continue;
          const asc = col === 'name';
          q = q.order(col, { ascending: asc });
        }

        return q;
      };

      // Primeira tentativa: assumindo que total_assists existe
      let { data, error } = await buildQuery(true).limit(50);

      // Fallback se a coluna não existir
      if (error && (error as any).code === '42703' && String((error as any).message || '').includes('total_assists')) {
        const res = await buildQuery(false).limit(50);
        error = res.error as any;
        data = (res.data || []).map((row: any) => ({ ...row, total_assists: row.total_assists ?? 0 }));
      }

      if (error) throw error;
      setStats((data as any) || []);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: 'total_games' | 'total_goals' | 'total_assists' | 'wins' | 'name') => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'name' ? 'asc' : 'desc');
    }
  };

  const calculatePerformance = (wins: number, draws: number, losses: number) => {
    const total = wins + draws + losses;
    if (total === 0) return 0;
    return Math.round(((wins * 3 + draws) / (total * 3)) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando estatísticas...</p>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Nenhuma estatística disponível ainda. Comece jogando!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="md:col-span-2">
              <Input
                placeholder="Buscar por nome"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShouldScrollOnUpdate(true); }}
              />
            </div>
            <Input
              type="number"
              placeholder="Mín. Gols"
              value={minGoals}
              onChange={(e) => { setMinGoals(e.target.value); setShouldScrollOnUpdate(true); }}
            />
            <Input
              type="number"
              placeholder="Mín. Assistências"
              value={minAssists}
              onChange={(e) => { setMinAssists(e.target.value); setShouldScrollOnUpdate(true); }}
            />
            <div className="md:col-span-4">
              <Button onClick={() => { setShouldScrollOnUpdate(true); loadStatistics(); }}>Aplicar filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Artilheiros e Garçons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.slice(0, 5).map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-accent/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{player.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {player.total_games} {player.total_games === 1 ? 'jogo' : 'jogos'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-accent" />
                    <span className="font-bold text-lg text-foreground">{player.total_goals}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="font-bold text-lg text-foreground">{player.total_assists}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Aproveitamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.map((player) => {
              const performance = calculatePerformance(
                player.wins,
                player.draws,
                player.losses
              );
              return (
                <div
                  key={player.id}
                  className="p-3 bg-accent/5 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">{player.name}</p>
                    <span className="text-sm font-bold text-primary">{performance}%</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="text-green-600">V: {player.wins}</span>
                    <span className="text-yellow-600">E: {player.draws}</span>
                    <span className="text-red-600">D: {player.losses}</span>
                    <span className="text-accent">Gols: {player.total_goals}</span>
                    <span className="text-primary">Assists: {player.total_assists}</span>
                    <span className="">Jogos: {player.total_games}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card ref={rankingRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />

            Ranking Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Pos.</TableHead>
                  <TableHead
                    onClick={() => { setShouldScrollOnUpdate(true); handleSort('name'); }}
                    className="cursor-pointer select-none min-w-[160px]"
                  >
                    <div className="flex items-center gap-2">
                      <span>Jogador</span>
                      {sortBy === 'name' && (sortDir === 'asc' ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ))}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => { setShouldScrollOnUpdate(true); handleSort('total_games'); }}
                    className="cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span>Jogos</span>
                      {sortBy === 'total_games' && (sortDir === 'asc' ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ))}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => { setShouldScrollOnUpdate(true); handleSort('total_goals'); }}
                    className="cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span>Gols</span>
                      {sortBy === 'total_goals' && (sortDir === 'asc' ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ))}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => { setShouldScrollOnUpdate(true); handleSort('total_assists'); }}
                    className="cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span>Assistências</span>
                      {sortBy === 'total_assists' && (sortDir === 'asc' ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ))}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => { setShouldScrollOnUpdate(true); handleSort('wins'); }}
                    className="cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span>Vitórias</span>
                      {sortBy === 'wins' && (sortDir === 'asc' ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ))}
                    </div>
                  </TableHead>
                  <TableHead>G/J</TableHead>
                  <TableHead>A/J</TableHead>
                  <TableHead>Win %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((p, idx) => {
                  const gpg = p.total_games > 0 ? (p.total_goals / p.total_games) : 0;
                  const apg = p.total_games > 0 ? (p.total_assists / p.total_games) : 0;
                  const winRate = p.total_games > 0 ? Math.round((p.wins / p.total_games) * 100) : 0;
                  const topClass = idx < 3 ? 'bg-accent/10' : '';
                  return (
                    <TableRow key={p.id} className={topClass}>
                      <TableCell className="font-semibold">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.total_games}</TableCell>
                      <TableCell>{p.total_goals}</TableCell>
                      <TableCell>{p.total_assists}</TableCell>
                      <TableCell>{p.wins}</TableCell>
                      <TableCell>{gpg.toFixed(2)}</TableCell>
                      <TableCell>{apg.toFixed(2)}</TableCell>
                      <TableCell>{winRate}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
