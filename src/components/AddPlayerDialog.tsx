import { useMemo, useState } from "react";
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
import { PlayerStatus } from "@/types/game";
import { sanitizeString, isValidWhatsapp } from "@/lib/validation";
import { usePlayers } from "@/hooks/usePlayers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPlayer: (name: string, whatsapp: string, status: PlayerStatus, preferredPosition?: string) => void;
  selectedStatus: PlayerStatus;
}

export const AddPlayerDialog = ({ 
  open, 
  onOpenChange, 
  onAddPlayer,
  selectedStatus 
}: AddPlayerDialogProps) => {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [preferredPosition, setPreferredPosition] = useState("");
  const allowedPositions = ['Zagueiro', 'Meio-Campo', 'Atacante'] as const;
  const { players, addRegistryPlayer } = usePlayers();
  const [search, setSearch] = useState("");

  const filteredPlayers = useMemo(() => {
    const q = sanitizeString(search, 80).toLowerCase();
    return players.filter(p => !q || p.name.toLowerCase().includes(q));
  }, [players, search]);

  const handleSubmit = () => {
    const cleanName = sanitizeString(name, 80);
    const cleanWhatsapp = sanitizeString(whatsapp, 20);
    const cleanPreferred = preferredPosition ? sanitizeString(preferredPosition, 40) : undefined;
    const preferred = cleanPreferred && allowedPositions.includes(cleanPreferred as any) ? cleanPreferred : undefined;

    if (!cleanName) return;
    if (!isValidWhatsapp(cleanWhatsapp)) return;

    if (cleanName) {
      onAddPlayer(cleanName, cleanWhatsapp, selectedStatus, preferred);
      setName("");
      setWhatsapp("");
      setPreferredPosition("");
      onOpenChange(false);
    }
  };

  const handleSelectRegistry = (id: string) => {
    const rp = players.find(p => p.id === id);
    if (!rp) return;
    setName(rp.name);
    setWhatsapp(rp.whatsapp || "");
    setPreferredPosition(rp.preferred_position || "");
  };

  const handleRegistryCreate = async () => {
    const cleanName = sanitizeString(name, 80);
    const cleanWhatsapp = sanitizeString(whatsapp, 20);
    const cleanPreferred = preferredPosition ? sanitizeString(preferredPosition, 40) : undefined;
    const preferred = cleanPreferred && allowedPositions.includes(cleanPreferred as any) ? cleanPreferred : undefined;
    if (!cleanName) return;
    if (!isValidWhatsapp(cleanWhatsapp)) return;
    await addRegistryPlayer(cleanName, cleanWhatsapp, preferred);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Presença</DialogTitle>
          <DialogDescription>
            Selecione seu nome do cadastro ou preencha os campos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar jogador cadastrado</Label>
            <Input
              id="search"
              placeholder="Digite para filtrar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScrollArea className="h-40 border rounded-md">
              <div className="p-2 space-y-1">
                {filteredPlayers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectRegistry(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent ${name === p.name ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      {p.preferred_position && (
                        <span className="text-xs text-muted-foreground">{p.preferred_position}</span>
                      )}
                    </div>
                    {p.whatsapp && (
                      <span className="text-xs text-muted-foreground">{p.whatsapp}</span>
                    )}
                  </button>
                ))}
                {filteredPlayers.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2">Nenhum jogador encontrado</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Posição Preferida</Label>
            <Select value={preferredPosition || undefined} onValueChange={(v) => setPreferredPosition(v)}>
              <SelectTrigger id="position">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Zagueiro">Zagueiro</SelectItem>
                <SelectItem value="Meio-Campo">Meio-Campo</SelectItem>
                <SelectItem value="Atacante">Atacante</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={handleRegistryCreate} disabled={!name.trim()}>
            Cadastrar no Registro
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
