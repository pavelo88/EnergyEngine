'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/admin');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!auth || !firestore) {
      setError("Servicios de Firebase no disponibles.");
      setLoading(false);
      return;
    }

    try {
      // 1. Standard sign-in attempt (for users who already set a password)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      if (loggedInUser.email) {
        const userDocRef = doc(firestore, 'usuarios', loggedInUser.email);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().roles?.includes('admin')) {
          router.push('/admin');
          return; // Success
        } else {
          await auth.signOut();
          setError('No tienes permisos de administrador.');
        }
      }
    } catch (authError: any) {
      // 2. If standard sign-in fails, check if it's a first-time (DNI) login
      if (authError.code === 'auth/invalid-credential') {
        try {
          const q = query(
            collection(firestore, 'usuarios'),
            where('email', '==', email),
            where('dni', '==', password) // Use password field for DNI
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // DNI/Email match found in Firestore, it's a first-time login.
            try {
              // Create the user in Firebase Auth using DNI as temp password.
              // This automatically signs the user in.
              await createUserWithEmailAndPassword(auth, email, password);

              // The layout will now handle role checks and password change redirection.
              router.push('/admin');
              return; // Success
            } catch (creationError: any) {
              if (creationError.code === 'auth/email-already-in-use') {
                 // This is a key edge case: user exists in Auth, but the DNI password failed.
                 // This means they already set a custom password.
                 setError('Credenciales incorrectas. Si ya estableciste una contraseña, úsala. De lo contrario, contacta a un administrador.');
              } else {
                 setError('Error al crear el usuario. Inténtalo de nuevo.');
              }
            }
          } else {
            // No match found for DNI/Email combo
            setError('Credenciales incorrectas. Por favor, inténtelo de nuevo.');
          }
        } catch (dbError) {
          console.error("Firestore query error:", dbError);
          setError('Error al consultar la base de datos.');
        }
      } else {
        // Handle other auth errors (network, etc.)
        console.error("Authentication error:", authError);
        setError('Ha ocurrido un error inesperado durante el inicio de sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle className="text-2xl font-black tracking-tighter">Módulo Administrativo</CardTitle>
          <CardDescription>Introduce tus credenciales de administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@energyengine.es"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña o DNI</Label>
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
              <Link href="/auth/inspection" className="underline text-muted-foreground hover:text-primary">
                Ir al Módulo de Inspectores
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
