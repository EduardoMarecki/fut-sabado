import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGames } from "@/hooks/useGames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeString, clampNumber, assertNonEmpty } from "@/lib/validation";

const NewGame = () => {
  const navigate = useNavigate();
  const { createGame } = useGames();
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    playersPerTeam: '5',
    ballResponsible: '',
    vestResponsible: '',
    // seasonId removido: coluna indisponível no schema atual
    // competitionId removido: coluna não disponível no schema atual
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.time || !formData.location) {
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }

    setSubmitting(true);
    try {
      // Format date to ensure it's saved correctly in the database
      const localDate = new Date(formData.date + 'T00:00:00');
      const formattedDate = localDate.toISOString().split('T')[0];
      
      const location = sanitizeString(formData.location);
      const ballResponsible = sanitizeString(formData.ballResponsible);
      const vestResponsible = sanitizeString(formData.vestResponsible);
      const playersPerTeam = clampNumber(parseInt(formData.playersPerTeam) || 5, 3, 11);
      if (!assertNonEmpty(location)) {
        toast.error('Local inválido');
        setSubmitting(false);
        return;
      }
      // Checagem de conflito simples no cliente
      const { data: existing, error: conflictErr } = await supabase
        .from('games')
        .select('id')
        .eq('date', formattedDate)
        .eq('time', formData.time)
        .eq('location', location)
        .or('finished.is.null,finished.eq.false')
        .limit(1)
        .maybeSingle();
      if (conflictErr) {
        console.warn('Conflict check failed, proceeding without it:', conflictErr.message);
      }
      if (existing) {
        toast.error('Conflito: já existe um jogo neste local, data e horário');
        setSubmitting(false);
        return;
      }

      // Inserção direta no banco
      const { data: created, error: insertErr } = await supabase
        .from('games')
        .insert({
          date: formattedDate,
          time: formData.time,
          location,
          players_per_team: playersPerTeam,
          ball_responsible: ballResponsible,
          vest_responsible: vestResponsible,
          // season_id removido
        })
        .select('id')
        .single();
      if (insertErr) {
        toast.error(insertErr.message || 'Falha ao criar jogo');
        setSubmitting(false);
        return;
      }
      // await logEvent('game_created', 'game', created.id, { location, date: formattedDate });
      navigate('/');
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="text-2xl">Criar Novo Racha</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/** Campo de temporada removido, não usado no schema atual */}

              {/** Campo de competição removido, não usado no schema atual */}

              <div className="space-y-2">
                <Label htmlFor="time">Horário *</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Local *</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Ex: Society do Parque"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="playersPerTeam">Jogadores por Time</Label>
                <Input
                  id="playersPerTeam"
                  name="playersPerTeam"
                  type="number"
                  min="3"
                  max="11"
                  value={formData.playersPerTeam}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ballResponsible">Responsável pela Bola</Label>
                <Input
                  id="ballResponsible"
                  name="ballResponsible"
                  type="text"
                  placeholder="Nome do responsável"
                  value={formData.ballResponsible}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vestResponsible">Responsável pelos Coletes</Label>
                <Input
                  id="vestResponsible"
                  name="vestResponsible"
                  type="text"
                  placeholder="Nome do responsável"
                  value={formData.vestResponsible}
                  onChange={handleChange}
                />
              </div>

              <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💰 <strong>Lembrete:</strong> Jogador avulso: R$ 25 | Mensalista: R$ 70
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
                disabled={submitting}
              >
                <Calendar className="h-5 w-5 mr-2" />
                {submitting ? 'Criando...' : 'Criar Racha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewGame;
