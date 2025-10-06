import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Player } from "@/types/game";
import { ScrollArea } from "@/components/ui/scroll-area";
import { clampNumber } from "@/lib/validation";

interface FinishGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team1: Player[];
  team2: Player[];
  onFinish: (scoreTeam1: number, scoreTeam2: number, playerStats: Array<{ playerId: string; goals: number; assists: number }>) => void;
}

export const FinishGameDialog = ({
  open,
  onOpenChange,
  team1,
  team2,
  onFinish,
}: FinishGameDialogProps) => {
  const [scoreTeam1, setScoreTeam1] = useState(0);
  const [scoreTeam2, setScoreTeam2] = useState(0);
  const [playerStats, setPlayerStats] = useState<Record<string, { goals: number; assists: number }>>({});

  const handleStatChange = (playerId: string, field: 'goals' | 'assists', value: number) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        goals: prev[playerId]?.goals || 0,
        assists: prev[playerId]?.assists || 0,
        [field]: clampNumber(value, 0, 99),
      },
    }));
  };

  const handleSubmit = () => {
    const stats = Object.entries(playerStats).map(([playerId, data]) => ({
      playerId,
      goals: clampNumber(data.goals ?? 0, 0, 99),
      assists: clampNumber(data.assists ?? 0, 0, 99),
    }));
    const s1 = clampNumber(Number(scoreTeam1) || 0, 0, 99);
    const s2 = clampNumber(Number(scoreTeam2) || 0, 0, 99);
    onFinish(s1, s2, stats);
    onOpenChange(false);
  };

  const allPlayers = [...team1, ...team2];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Encerrar Jogo</DialogTitle>
          <DialogDescription>
            Informe o placar final e as estatísticas dos jogadores
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placar Time 1</Label>
                <Input
                  type="number"
                  min="0"
                  value={scoreTeam1}
                  onChange={(e) => setScoreTeam1(clampNumber(parseInt(e.target.value) || 0, 0, 99))}
                />
              </div>
              <div className="space-y-2">
                <Label>Placar Time 2</Label>
                <Input
                  type="number"
                  min="0"
                  value={scoreTeam2}
                  onChange={(e) => setScoreTeam2(clampNumber(parseInt(e.target.value) || 0, 0, 99))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Estatísticas dos Jogadores</h3>
              {allPlayers.map((player) => (
                <div key={player.id} className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">{player.name}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`goals-${player.id}`} className="text-sm">Gols</Label>
                      <Input
                        id={`goals-${player.id}`}
                        type="number"
                        min="0"
                        value={playerStats[player.id]?.goals || 0}
                        onChange={(e) =>
                          handleStatChange(player.id, 'goals', parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`assists-${player.id}`} className="text-sm">Assistências</Label>
                      <Input
                        id={`assists-${player.id}`}
                        type="number"
                        min="0"
                        value={playerStats[player.id]?.assists || 0}
                        onChange={(e) =>
                          handleStatChange(player.id, 'assists', parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Encerrar Jogo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
