export type PlayerStatus = 'confirmed' | 'maybe' | 'not_going';

export interface Player {
  id: string;
  name: string;
  whatsapp?: string;
  preferredPosition?: string;
  status: PlayerStatus;
  goals?: number;
  assists?: number;
}

export interface Material {
  id: string;
  item: string;
  responsiblePlayer: string;
}

export interface Game {
  id: string;
  date: string;
  time: string;
  location: string;
  playersPerTeam: number;
  ballResponsible: string;
  vestResponsible: string;
  players: Player[];
  materials: Material[];
  teams?: { team1: Player[]; team2: Player[] };
  finished?: boolean;
  finalScoreTeam1?: number;
  finalScoreTeam2?: number;
  events?: MatchEvent[];
}

export type MatchEventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'substitution' | 'note';

export interface MatchEvent {
  id: string;
  game_id: string;
  minute: number;
  event_type: MatchEventType;
  team_number?: 1 | 2;
  player_id?: string | null;
  assist_player_id?: string | null;
  description?: string | null;
}
