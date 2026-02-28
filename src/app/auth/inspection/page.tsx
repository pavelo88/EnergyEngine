'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function InspectionLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Si el usuario ya está logueado, intentar redirigirlo si tiene el rol correcto
    if (!isUserLoading && user && user.email) {
      const checkRoleAndRedirect = async () => {
        const userDocRef = doc(db, 'usuarios', user.email!);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().roles?.includes('inspector')) {
          router.push('/inspection');
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      if (loggedInUser && loggedInUser.email) {
        // 2. Autorización: Verificar rol en Firestore
        const userDocRef = doc(db, 'usuarios', loggedInUser.email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().roles?.includes('inspector')) {
          // 3. Redirección Exitosa
          router.push('/inspection');
        } else {
          // Rol no encontrado o incorrecto
          setError('No tienes permisos de inspector.');
          await auth.signOut(); // Desloguear por seguridad
        }
      } else {
        throw new Error('No se pudo obtener la información del usuario.');
      }
    } catch (err: any) {
      // Manejo de errores de autenticación
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales incorrectas. Por favor, inténtelo de nuevo.');
      } else {
        setError('Ha ocurrido un error inesperado.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Evita mostrar el login si el usuario ya está autenticado y en proceso de redirección
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm shadow-2xl rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-black tracking-tighter">Módulo de Inspectores</CardTitle>
          <CardDescription>Introduce tus credenciales de inspector.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="inspector@energyengine.es"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/50 bg-red-50 p-3 text-sm font-medium text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full font-bold uppercase rounded-lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
             <div className="mt-4 text-center text-xs">
              <Link href="/auth/admin" className="underline text-muted-foreground hover:text-primary">
                Ir al Módulo de Administración
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
