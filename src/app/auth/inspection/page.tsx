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
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';


export default function InspectionLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      const checkUserRole = async () => {
        if (user && user.email && firestore) {
          const userDocRef = doc(firestore, 'usuarios', user.email);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().roles?.includes('inspector')) {
            router.push('/inspection');
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
            await createUserWithEmailAndPassword(auth, email, password);
          } else {
            setError('Credenciales incorrectas. Verifica tu correo y contraseña/DNI.');
          }
        } catch (creationError: any) {
          if (creationError.code === 'auth/email-already-in-use') {
             setError('Este correo ya está registrado, pero la contraseña es incorrecta. Si ya estableciste una clave personal, úsala.');
          } else if (creationError.code === 'auth/weak-password') {
            setError('La contraseña (DNI) es demasiado débil. Debe tener al menos 6 caracteres.');
          } else if (creationError.code === 'auth/invalid-email') {
            setError('El formato del correo electrónico no es válido.');
          } else {
            console.error("Firestore query or Auth creation error:", creationError);
            setError('Error al consultar la base de datos o crear el usuario.');
          }
        }
      } else if (authError.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
      } else if (authError.code === 'auth/wrong-password') {
        setError('La contraseña es incorrecta. Por favor, inténtalo de nuevo.');
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
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-sm rounded-2xl shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto mb-2 flex justify-center">
              <Logo />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">¡Bienvenido de nuevo!</CardTitle>
            <CardDescription>Acceso al portal de inspección.</CardDescription>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña o DNI</Label>
                 <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-primary"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <Checkbox id="remember-me-inspector" />
                        <Label htmlFor="remember-me-inspector" className="text-muted-foreground font-medium">Recordarme</Label>
                    </div>
                    <Link href="/auth/forgot-password" className="underline text-muted-foreground hover:text-primary">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full font-bold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </Button>
              <div className="pt-2 text-center text-sm">
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
