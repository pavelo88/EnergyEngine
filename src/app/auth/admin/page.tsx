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
      const checkUserRole = async () => {
        if (user && user.email) {
          const userDocRef = doc(firestore, 'usuarios', user.email);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().roles?.includes('admin')) {
            router.push('/admin');
          }
        }
      };
      checkUserRole();
    }
  }, [user, isUserLoading, router, firestore]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("El correo y la contraseña no pueden estar vacíos.");
      setLoading(false);
      return;
    }
    
    if (!auth || !firestore) {
      setError("Servicios de Firebase no disponibles.");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login successful, useEffect will handle routing
    } catch (authError: any) {
      if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found') {
        try {
          const q = query(
            collection(firestore, 'usuarios'),
            where('email', '==', email),
            where('dni', '==', password)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
              // Creation successful, useEffect will handle routing
            } catch (creationError: any) {
              if (creationError.code === 'auth/email-already-in-use') {
                 setError('Este correo ya está registrado, pero la contraseña es incorrecta. Si ya estableciste una clave personal, úsala.');
              } else if (creationError.code === 'auth/weak-password') {
                setError('La contraseña (DNI) es demasiado débil. Debe tener al menos 6 caracteres.');
              } else {
                setError('Error al registrar la cuenta. Por favor, intenta de nuevo.');
                console.error("Creation Error:", creationError);
              }
            }
          } else {
            setError('Credenciales incorrectas. Verifica tu correo y contraseña/DNI.');
          }
        } catch (dbError) {
          console.error("Firestore query error:", dbError);
          setError('Error al consultar la base de datos.');
        }
      } else if (authError.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
      } else {
        console.error("Authentication error:", authError);
        setError('Ha ocurrido un error inesperado durante el inicio de sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md bg-white/5 backdrop-blur-lg border-white/10 text-white shadow-2xl rounded-2xl">
          <CardHeader className="text-center space-y-4 pt-8">
            <div className="mx-auto mb-2 flex justify-center">
              <Logo />
            </div>
            <CardTitle className="text-2xl font-black tracking-tighter text-white">Módulo Administrativo</CardTitle>
            <CardDescription className="text-white/60">Introduce tus credenciales de administrador.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/60 text-xs uppercase font-bold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@energyengine.es"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:bg-white/10 focus:ring-primary h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/60 text-xs uppercase font-bold">Contraseña o DNI</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:bg-white/10 focus:ring-primary h-12"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-500/50 bg-red-900/40 p-3 text-sm font-medium text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full font-bold uppercase rounded-lg h-12 text-sm bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </Button>
              <div className="pt-2 text-center text-xs">
                <Link href="/auth/inspection" className="underline text-white/50 hover:text-primary">
                  Ir al Módulo de Inspectores
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
