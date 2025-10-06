import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logEvent } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type TrashGame = {
  id: string;
  date: string;
  time: string;
  location: string;
  finished?: boolean;
  deleted_at?: string | null;
};

const Trash = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<TrashGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);

  const loadDeletedGames = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("games")
        .select("id, date, time, location, finished, deleted_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setGames((data || []) as TrashGame[]);
    } catch (err) {
      console.error("Erro ao carregar lixeira:", err);
      toast.error("Erro ao carregar lixeira");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedGames();
  }, []);

  const restoreGame = async (id: string) => {
    try {
      const { error } = await supabase
        .from("games")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
      toast.success("Racha restaurado!");
      await logEvent("game_restored", "game", id, null);
      await loadDeletedGames();
    } catch (err) {
      console.error("Erro ao restaurar racha:", err);
      toast.error("Erro ao restaurar racha");
    } finally {
      setRestoreId(null);
    }
  };

  const purgeGame = async (id: string) => {
    try {
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Racha excluído permanentemente!");
      await logEvent("game_purged", "game", id, null);
      await loadDeletedGames();
    } catch (err) {
      console.error("Erro ao excluir permanentemente:", err);
      toast.error("Erro ao excluir permanentemente");
    } finally {
      setPurgeId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}> 
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Lixeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando itens...</p>
            ) : games.length === 0 ? (
              <p className="text-muted-foreground">Nenhum racha ocultado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>{g.date}</TableCell>
                      <TableCell>{g.time}</TableCell>
                      <TableCell>{g.location}</TableCell>
                      <TableCell>{g.finished ? "Encerrado" : "Em aberto"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setRestoreId(g.id)}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Restaurar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setPurgeId(g.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Confirm restore */}
        <AlertDialog open={!!restoreId} onOpenChange={(open) => !open && setRestoreId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar racha?</AlertDialogTitle>
              <AlertDialogDescription>
                O racha voltará a aparecer na lista de jogos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => restoreId && restoreGame(restoreId)}>Restaurar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm purge */}
        <AlertDialog open={!!purgeId} onOpenChange={(open) => !open && setPurgeId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados relacionados serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => purgeId && purgeGame(purgeId)}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Trash;