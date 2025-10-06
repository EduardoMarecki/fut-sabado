import React, { useMemo, useState } from 'react';
import { MatchEvent, MatchEventType, Player } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  events: MatchEvent[];
  players: Player[];
  onAdd: (event: Omit<MatchEvent, 'id' | 'game_id'>) => Promise<void> | void;
  disabled?: boolean;
}

export const MatchTimeline: React.FC<Props> = ({ events, players, onAdd, disabled }) => {
  const [minute, setMinute] = useState<number>(0);
  const [eventType, setEventType] = useState<MatchEventType>('note');
  const [teamNumber, setTeamNumber] = useState<1 | 2 | undefined>(undefined);
  const [playerId, setPlayerId] = useState<string | undefined>(undefined);
  const [assistPlayerId, setAssistPlayerId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>('');

  const playerById = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach(p => map.set(p.id, p));
    return map;
  }, [players]);

  const resetForm = () => {
    setMinute(0);
    setEventType('note');
    setTeamNumber(undefined);
    setPlayerId(undefined);
    setAssistPlayerId(undefined);
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (minute < 0) return alert('Minuto deve ser zero ou positivo');
    const payload: Omit<MatchEvent, 'id' | 'game_id'> = {
      minute,
      event_type: eventType,
      team_number: teamNumber,
      player_id: playerId ?? null,
      assist_player_id: assistPlayerId ?? null,
      description: description || null,
    };
    await onAdd(payload);
    resetForm();
  };

  const renderEvent = (ev: MatchEvent) => {
    const player = ev.player_id ? playerById.get(ev.player_id) : undefined;
    const assist = ev.assist_player_id ? playerById.get(ev.assist_player_id) : undefined;
    const teamLabel = ev.team_number ? `Equipe ${ev.team_number}` : '';
    const minuteLabel = `${ev.minute}'`;
    let text = '';
    switch (ev.event_type) {
      case 'goal':
        text = `Gol ${teamLabel}: ${player?.name || '—'}${assist ? ` (Assistência: ${assist.name})` : ''}`;
        break;
      case 'assist':
        text = `Assistência ${teamLabel}: ${assist?.name || player?.name || '—'}`;
        break;
      case 'yellow_card':
        text = `Cartão Amarelo ${teamLabel}: ${player?.name || '—'}`;
        break;
      case 'red_card':
        text = `Cartão Vermelho ${teamLabel}: ${player?.name || '—'}`;
        break;
      case 'substitution':
        text = `Substituição ${teamLabel}: ${ev.description || ''}`;
        break;
      case 'note':
        text = ev.description || '';
        break;
      default:
        text = ev.description || '';
    }
    return (
      <div key={ev.id} className="flex items-start gap-3 py-2">
        <div className="text-sm text-muted-foreground w-12">{minuteLabel}</div>
        <div className="flex-1">
          <div className="text-sm font-medium">{text}</div>
          {ev.description && ev.event_type !== 'note' && (
            <div className="text-xs text-muted-foreground">{ev.description}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline da Partida</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-6">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            events.map(renderEvent)
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm text-muted-foreground">Minuto</label>
            <input
              type="number"
              min={0}
              value={minute}
              onChange={e => setMinute(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm text-muted-foreground">Tipo</label>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value as MatchEventType)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="goal">Gol</option>
              <option value="assist">Assistência</option>
              <option value="yellow_card">Amarelo</option>
              <option value="red_card">Vermelho</option>
              <option value="substitution">Substituição</option>
              <option value="note">Observação</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm text-muted-foreground">Equipe</label>
            <select
              value={teamNumber ?? ''}
              onChange={e => setTeamNumber(e.target.value ? (Number(e.target.value) as 1 | 2) : undefined)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="">—</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm text-muted-foreground">Jogador</label>
            <select
              value={playerId ?? ''}
              onChange={e => setPlayerId(e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="">—</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm text-muted-foreground">Assistência</label>
            <select
              value={assistPlayerId ?? ''}
              onChange={e => setAssistPlayerId(e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="">—</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-5">
            <label className="block text-sm text-muted-foreground">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes do evento (opcional)"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div className="md:col-span-5 flex justify-end">
            <Button type="submit" disabled={disabled} className="bg-primary hover:bg-primary/90">
              Adicionar Evento
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MatchTimeline;