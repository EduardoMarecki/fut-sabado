import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayers } from '@/hooks/usePlayers';
import { sanitizeString, isValidWhatsapp } from '@/lib/validation';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export const RegistryPlayersTab = () => {
  const { players, addRegistryPlayer, updateRegistryPlayer, deleteRegistryPlayer } = usePlayers();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', whatsapp: '', preferred: '' });
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', whatsapp: '', preferred: '' });
  const allowedPositions = ['Zagueiro', 'Meio-Campo', 'Atacante'] as const;

  const filtered = useMemo(() => {
    const q = sanitizeString(search, 80).toLowerCase();
    return players.filter(p => !q || p.name.toLowerCase().includes(q));
  }, [players, search]);

  const startEdit = (id: string) => {
    const p = players.find(x => x.id === id);
    if (!p) return;
    setEditingId(id);
    setForm({
      name: p.name,
      whatsapp: p.whatsapp || '',
      preferred: p.preferred_position && allowedPositions.includes(p.preferred_position as any) ? p.preferred_position : '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', whatsapp: '', preferred: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const cleanName = sanitizeString(form.name, 80);
    const cleanWhatsapp = sanitizeString(form.whatsapp, 20);
    const cleanPreferred = sanitizeString(form.preferred, 40);
    if (!cleanName) return;
    if (!isValidWhatsapp(cleanWhatsapp)) return;
    const preferred = allowedPositions.includes(cleanPreferred as any) ? cleanPreferred : null;
    await updateRegistryPlayer(editingId, cleanName, cleanWhatsapp || null, preferred);
    cancelEdit();
  };

  const removePlayer = async (id: string) => {
    await deleteRegistryPlayer(id);
    if (editingId === id) cancelEdit();
  };

  const startCreate = () => {
    setCreating(true);
    setNewForm({ name: '', whatsapp: '', preferred: '' });
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewForm({ name: '', whatsapp: '', preferred: '' });
  };

  const saveCreate = async () => {
    const cleanName = sanitizeString(newForm.name, 80);
    const cleanWhatsapp = sanitizeString(newForm.whatsapp, 20);
    const cleanPreferred = sanitizeString(newForm.preferred, 40);
    if (!cleanName) return;
    if (!isValidWhatsapp(cleanWhatsapp)) return;
    const preferred = allowedPositions.includes(cleanPreferred as any) ? cleanPreferred : undefined;
    await addRegistryPlayer(cleanName, cleanWhatsapp, preferred);
    cancelCreate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button size="sm" className="ml-auto" onClick={startCreate}>Novo Jogador</Button>
      </div>
      {creating && (
        <Card className="border-border">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label>Nome</Label>
                  <Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={newForm.whatsapp} onChange={(e) => setNewForm({ ...newForm, whatsapp: e.target.value })} />
                </div>
                <div>
                  <Label>Posição</Label>
                  <Select value={newForm.preferred || undefined} onValueChange={(v) => setNewForm({ ...newForm, preferred: v })}>
                    <SelectTrigger>
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
              <div className="flex gap-2">
                <Button size="sm" onClick={saveCreate}>Salvar</Button>
                <Button size="sm" variant="outline" onClick={cancelCreate}>Cancelar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <ScrollArea className="h-[420px] border rounded-md">
        <div className="p-3 space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="border-border">
              <CardContent className="p-3">
                {editingId === p.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <Label>Nome</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>WhatsApp</Label>
                        <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                      </div>
                      <div>
                        <Label>Posição</Label>
                        <Select value={form.preferred || undefined} onValueChange={(v) => setForm({ ...form, preferred: v })}>
                          <SelectTrigger>
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
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {p.preferred_position && (
                        <div className="text-xs text-muted-foreground">{p.preferred_position}</div>
                      )}
                      {p.whatsapp && (
                        <div className="text-xs text-muted-foreground">{p.whatsapp}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(p.id)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => removePlayer(p.id)}>Excluir</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum jogador encontrado</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};