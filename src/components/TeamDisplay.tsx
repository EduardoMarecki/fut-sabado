import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player } from "@/types/game";

interface TeamDisplayProps {
  team1: Player[];
  team2: Player[];
}

export const TeamDisplay = ({ team1, team2 }: TeamDisplayProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            Time 1
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {team1.map((player) => (
              <li
                key={player.id}
                className="p-3 bg-card rounded-lg border border-border font-medium text-foreground"
              >
                <div className="flex items-center justify-between">
                  <span>{player.name}</span>
                  {player.preferredPosition && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {player.preferredPosition}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <Users className="h-5 w-5" />
            Time 2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {team2.map((player) => (
              <li
                key={player.id}
                className="p-3 bg-card rounded-lg border border-border font-medium text-foreground"
              >
                <div className="flex items-center justify-between">
                  <span>{player.name}</span>
                  {player.preferredPosition && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {player.preferredPosition}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
