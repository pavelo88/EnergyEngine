'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminLoginPage() {
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
        if (user && user.email && firestore && auth) {
          try {
            // 1. Forzamos minúsculas para que coincida con el ID de Firestore
            const normalizedEmail = user.email.toLowerCase();
            const userDocRef = doc(firestore, 'usuarios', normalizedEmail);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();

              // 2. Verificamos los permisos (soporta tanto un Array "roles" como un String "role")
              const hasAdminArray = userData.roles && Array.isArray(userData.roles) && userData.roles.includes('admin');
              const hasAdminString = userData.role && userData.role === 'admin';

              if (hasAdminArray || hasAdminString) {
                router.push('/admin');
              } else {
                await auth.signOut();
                setError("No tienes permisos de administrador (Rol insuficiente).");
              }
            } else {
              await auth.signOut();
              setError("Usuario no encontrado en la base de datos.");
            }
          } catch (e) {
            console.error("Error checking admin role:", e);
            await auth.signOut();
            setError("Ocurrió un error al verificar tus permisos.");
          }
        }
      };
      checkUserRole();
    }
  }, [user, isUserLoading, router, firestore, auth]);

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
      // 1. Try to sign in normally
      await signInWithEmailAndPassword(auth, email, password);
      // On success, the useEffect hook will redirect to /admin
    } catch (authError: any) {
      // 2. If sign-in fails (e.g., user not found in Auth), try DNI/first-login flow
      if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found') {
        try {
          // Check Firestore for a user matching email and DNI (password)
          const q = query(
            collection(firestore, 'usuarios'),
            where('email', '==', email),
            where('dni', '==', password)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // User found in DB, attempt to create them in Auth, which also signs them in
            await createUserWithEmailAndPassword(auth, email, password);
            // On success, the useEffect will handle redirection.
          } else {
            // No user found with those credentials in DB either
            setError('Credenciales incorrectas. Verifica tu correo y contraseña/DNI.');
          }
        } catch (creationError: any) {
          // Handle specific errors during the creation attempt
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
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10 bg-transparent">
      <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl glass-crystallized border-white/10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-2 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-black text-white tracking-tighter uppercase italic font-headline">¡Bienvenido de nuevo!</CardTitle>
          <CardDescription className="text-slate-400 font-medium">Panel de administración local.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 font-bold uppercase text-[10px] tracking-widest px-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@energyengine.es"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-bold uppercase text-[10px] tracking-widest px-1">Contraseña o DNI</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-white/5 border-white/10 text-white rounded-xl h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <Checkbox id="remember-me-admin" className="border-white/20 data-[state=checked]:bg-primary" />
                <Label htmlFor="remember-me-admin" className="text-slate-400 font-bold uppercase tracking-tighter cursor-pointer">Recordarme</Label>
              </div>
              <Link href="/auth/forgot-password" title="Olvidaste tu contraseña" className="text-slate-400 font-bold uppercase tracking-tighter hover:text-primary transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-500 animate-in fade-in zoom-in duration-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest text-xs rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg active:scale-[0.98] transition-all" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
            <div className="pt-4 text-center">
              <Link href="/auth/inspection" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                Ir al Módulo de Inspectores
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
