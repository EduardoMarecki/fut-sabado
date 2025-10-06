import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shuffle, Plus, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlayerConfirmation } from "@/components/PlayerConfirmation";
import { TeamDisplay } from "@/components/TeamDisplay";
import { MaterialsList } from "@/components/MaterialsList";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";
import { usePlayers } from "@/hooks/usePlayers";
import { FinishGameDialog } from "@/components/FinishGameDialog";
import { PlayerStatus } from "@/types/game";
import { useGameDetails } from "@/hooks/useGameDetails";
import { RegistryPlayersTab } from "@/components/RegistryPlayersTab";

const GameDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { game, loading, addPlayer, addPlayerFromRegistry, updatePlayerStatus, drawTeams, deletePlayer, finishGame, rsvp } = useGameDetails(id);
  const { players: registryPlayers } = usePlayers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [confirmDrawOpen, setConfirmDrawOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PlayerStatus>('confirmed');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Jogo não encontrado</p>
      </div>
    );
  }

  const confirmedPlayers = game.players.filter(p => p.status === 'confirmed');

  const handleAddPlayer = async (name: string, whatsapp: string, status: PlayerStatus, preferredPosition?: string) => {
    // Se o nome existir no cadastro, utiliza o registro
    const match = registryPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (match) {
      await addPlayerFromRegistry(match.id, status);
      return;
    }
    await addPlayer(name, whatsapp, status, preferredPosition);
  };

  const handleUpdateStatus = async (playerId: string, status: PlayerStatus) => {
    await updatePlayerStatus(playerId, status);
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (confirm('Tem certeza que deseja remover este jogador?')) {
      await deletePlayer(playerId);
    }
  };

  const handleFinishGame = async (scoreTeam1: number, scoreTeam2: number, playerStats: Array<{ playerId: string; goals: number; assists: number }>) => {
    await finishGame(scoreTeam1, scoreTeam2, playerStats);
  };

  const handleDrawTeams = () => {
    if (game.teams) {
      setConfirmDrawOpen(true);
    } else {
      drawTeams();
    }
  };

  const confirmRedraw = () => {
    drawTeams();
    setConfirmDrawOpen(false);
  };

  const openDialogForStatus = (status: PlayerStatus) => {
    setSelectedStatus(status);
    setDialogOpen(true);
  };

  // RSVP desativado temporariamente
  const rsvpButtons = null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="text-2xl">Detalhes do Racha</CardTitle>
              <div className="text-muted-foreground">
                {new Date(game.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {game.time}
              </div>
              {game.finished && (
                <div className="mt-2 p-3 bg-accent/20 border border-accent rounded-lg">
                  <p className="font-semibold text-accent-foreground">
                    ⚽ Jogo Encerrado - Placar: {game.finalScoreTeam1} x {game.finalScoreTeam2}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Local:</span>
                  <p className="font-semibold text-foreground">{game.location}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Formato:</span>
                  <p className="font-semibold text-foreground">{game.playersPerTeam} vs {game.playersPerTeam}</p>
                </div>
              </div>
              <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💰 <strong>Lembrete:</strong> Jogador avulso: R$ 25 | Mensalista: R$ 70
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Tabs defaultValue="presence" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4">
                  <TabsTrigger value="presence">Presença</TabsTrigger>
                  <TabsTrigger value="registry">Cadastrados</TabsTrigger>
                </TabsList>

                <TabsContent value="presence">
                  <div className="flex items-center justify-between">
                    <CardTitle>Lista de Presença</CardTitle>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {confirmedPlayers.length}/{game.playersPerTeam * 2} confirmados
                      </span>
                      <Button
                        onClick={() => openDialogForStatus('confirmed')}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        disabled={game.finished}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <PlayerConfirmation
                      players={game.players}
                      onUpdateStatus={handleUpdateStatus}
                      onDeletePlayer={handleDeletePlayer}
                      disabled={game.finished}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="registry">
                  <RegistryPlayersTab />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Button
            onClick={handleDrawTeams}
            className="w-full bg-accent hover:bg-accent/90"
            size="lg"
            disabled={game.finished}
          >
            <Shuffle className="h-5 w-5 mr-2" />
            Sortear Times
          </Button>

          {game.teams && !game.finished && (
            <Button
              onClick={() => setFinishDialogOpen(true)}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Flag className="h-5 w-5 mr-2" />
              Encerrar Jogo
            </Button>
          )}

          {game.teams && <TeamDisplay team1={game.teams.team1} team2={game.teams.team2} />}

          {game.materials.length > 0 && <MaterialsList materials={game.materials} />}

          {/* Timeline da partida removido temporariamente */}
        </div>
      </div>

      <AddPlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAddPlayer={handleAddPlayer}
        selectedStatus={selectedStatus}
      />

      {game?.teams && (
        <FinishGameDialog
          open={finishDialogOpen}
          onOpenChange={setFinishDialogOpen}
          team1={game.teams.team1}
          team2={game.teams.team2}
          onFinish={handleFinishGame}
        />
      )}

      <AlertDialog open={confirmDrawOpen} onOpenChange={setConfirmDrawOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sortear novamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Os times já foram sorteados anteriormente. Deseja sortear novamente? 
              Isso irá substituir os times atuais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRedraw}>
              Sortear Novamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GameDetails;
