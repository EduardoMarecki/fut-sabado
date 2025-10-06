import { useNavigate } from "react-router-dom";
import { Plus, Calendar, BarChart3, Trash2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { Statistics } from "@/components/Statistics";
import { useGames } from "@/hooks/useGames";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegistryPlayersTab } from "@/components/RegistryPlayersTab";

const Index = () => {
  const navigate = useNavigate();
  const { games, loading, deleteGame, page, nextPage, prevPage, hasMore } = useGames();
  const upcomingGames = games.filter(g => !g.finished);
  const finishedGames = games.filter(g => g.finished);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/90 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">⚽ Racha Fácil</h1>
          <p className="text-xl mb-8 text-white/90">
            Organize seus rachas e sorteie times sem complicação
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/new-game')}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-white font-bold px-8 py-6 text-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Novo Racha
            </Button>
            <Button
              onClick={() => navigate('/trash')}
              size="lg"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/40 text-white font-bold px-8 py-6 text-lg"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Lixeira
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs for Games and Statistics */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="games" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Jogos
            </TabsTrigger>
            <TabsTrigger value="registry" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Cadastrados
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games">
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">Carregando jogos...</p>
                </div>
              ) : (
                <>
                  <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2 mb-6">
                      <TabsTrigger value="upcoming" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Próximos
                      </TabsTrigger>
                      <TabsTrigger value="finished" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Finalizados
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming">
                      <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-8 w-8 text-primary" />
                        Próximos Jogos
                      </h2>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingGames.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            onViewDetails={(id) => navigate(`/game/${id}`)}
                            onDelete={deleteGame}
                          />
                        ))}
                      </div>

                      {upcomingGames.length === 0 && (
                        <div className="text-center py-16">
                          <p className="text-muted-foreground text-lg mb-4">
                            Nenhum jogo agendado ainda
                          </p>
                          <Button
                            onClick={() => navigate('/new-game')}
                            variant="outline"
                            size="lg"
                          >
                            Criar Primeiro Jogo
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-6">
                        <Button variant="outline" onClick={prevPage} disabled={page === 1}>
                          Página anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">Página {page}</span>
                        <Button variant="outline" onClick={nextPage} disabled={!hasMore}>
                          Próxima página
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="finished">
                      <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-8 w-8 text-primary" />
                        Jogos Finalizados
                      </h2>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {finishedGames.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            onViewDetails={(id) => navigate(`/game/${id}`)}
                            onDelete={deleteGame}
                          />
                        ))}
                      </div>

                      {finishedGames.length === 0 && (
                        <div className="text-center py-16">
                          <p className="text-muted-foreground text-lg mb-4">
                            Nenhum jogo finalizado ainda
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-6">
                        <Button variant="outline" onClick={prevPage} disabled={page === 1}>
                          Página anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">Página {page}</span>
                        <Button variant="outline" onClick={nextPage} disabled={!hasMore}>
                          Próxima página
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="statistics">
            <Statistics />
          </TabsContent>

          <TabsContent value="registry">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-2 mb-4">
                <Users2 className="h-8 w-8 text-primary" />
                Jogadores Cadastrados
              </h2>
              <RegistryPlayersTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
