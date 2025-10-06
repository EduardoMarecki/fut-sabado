import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const { signIn, signUp, signOut, session, profile, role, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Autenticação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {session ? (
            <div className="space-y-2">
              <div className="text-sm">Logado como: {profile?.name || session.user.email} ({role})</div>
              <Button onClick={() => signOut()}>Sair</Button>
            </div>
          ) : (
            <>
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => signIn(email, password)} disabled={loading}>Entrar</Button>
                <Button variant="secondary" onClick={() => signUp(email, password)} disabled={loading}>Cadastrar</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}