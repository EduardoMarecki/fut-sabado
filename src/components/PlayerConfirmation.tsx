import { Check, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Player, PlayerStatus } from "@/types/game";
import { cn } from "@/lib/utils";

interface PlayerConfirmationProps {
  players: Player[];
  onUpdateStatus: (playerId: string, status: PlayerStatus) => void;
  onDeletePlayer: (playerId: string) => void;
  disabled?: boolean;
}

export const PlayerConfirmation = ({ players, onUpdateStatus, onDeletePlayer, disabled }: PlayerConfirmationProps) => {
  const getStatusIcon = (status: PlayerStatus) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-4 w-4" />;
      case 'maybe':
        return <HelpCircle className="h-4 w-4" />;
      case 'not_going':
        return <X className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: PlayerStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary text-primary-foreground';
      case 'maybe':
        return 'bg-accent text-accent-foreground';
      case 'not_going':
        return 'bg-destructive text-destructive-foreground';
    }
  };

  return (
    <div className="space-y-3">
      {players.map((player) => (
        <div
          key={player.id}
          className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full transition-colors",
              getStatusColor(player.status)
            )}>
              {getStatusIcon(player.status)}
            </div>
            <div>
              <span className="font-medium text-foreground block">{player.name}</span>
              {player.preferredPosition && (
                <span className="text-xs text-muted-foreground">{player.preferredPosition}</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={player.status === 'confirmed' ? 'default' : 'outline'}
              onClick={() => onUpdateStatus(player.id, 'confirmed')}
              disabled={!!disabled}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={player.status === 'maybe' ? 'default' : 'outline'}
              onClick={() => onUpdateStatus(player.id, 'maybe')}
              className={player.status === 'maybe' ? 'bg-accent hover:bg-accent/90' : ''}
              disabled={!!disabled}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={player.status === 'not_going' ? 'destructive' : 'outline'}
              onClick={() => onUpdateStatus(player.id, 'not_going')}
              disabled={!!disabled}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeletePlayer(player.id)}
              className="hover:bg-destructive/10 hover:text-destructive"
              disabled={!!disabled}
            >
              🗑️
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
