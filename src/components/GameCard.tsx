import { Calendar, MapPin, Users, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Game } from "@/types/game";

interface GameCardProps {
  game: Game;
  onViewDetails: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}

export const GameCard = ({ game, onViewDetails, onDelete }: GameCardProps) => {
  const confirmedPlayers = game.players.filter(p => p.status === 'confirmed').length;
  const totalPlayers = game.playersPerTeam * 2;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/30"
      onClick={() => onViewDetails(game.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl font-bold text-foreground">
            Racha em {game.location}
          </CardTitle>
          <Badge 
            variant={confirmedPlayers >= totalPlayers ? "default" : "secondary"}
            className="ml-2"
          >
            {confirmedPlayers}/{totalPlayers}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{new Date(game.date).toLocaleDateString('pt-BR')} às {game.time}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{game.location}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">{game.playersPerTeam} vs {game.playersPerTeam}</span>
        </div>

        <div className="pt-2 flex gap-2">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(game.id);
            }}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            Ver Detalhes
          </Button>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              const ok = confirm('Deseja ocultar este racha da lista? Você poderá restaurá-lo no futuro.');
              if (!ok) return;
              onDelete(game.id);
            }}
            variant="destructive"
            size="icon"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
