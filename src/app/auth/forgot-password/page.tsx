'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("El correo no puede estar vacío.");
      setLoading(false);
      return;
    }
    
    if (!auth) {
      setError("Servicio de autenticación no disponible.");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Se ha enviado un enlace para restablecer tu contraseña a tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).");
    } catch (authError: any) {
      console.error("Password reset error:", authError);
      if (authError.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
      } else if (authError.code === 'auth/user-not-found') {
        setError('No se encontró ningún usuario con este correo electrónico.');
      } else {
        setError('Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-sm rounded-2xl shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto mb-2 flex justify-center">
              <Logo />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Restablecer Contraseña</CardTitle>
            <CardDescription>Introduce tu email y te enviaremos un enlace para recuperarla.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <p>{success}</p>
                </div>
              )}

              <Button type="submit" className="w-full font-bold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Enviando...' : 'Enviar Enlace'}
              </Button>
              <div className="pt-2 text-center text-sm">
                <Link href="/auth/admin" className="underline text-muted-foreground hover:text-primary flex items-center justify-center gap-2">
                    <ArrowLeft size={16}/>
                    Volver a Inicio de Sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
