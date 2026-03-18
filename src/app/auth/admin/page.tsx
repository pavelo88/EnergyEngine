'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchAdminCandidatesByEmail, hasAdminRole, normalizeAdminEmail } from '@/lib/admin-access';

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
    if (isUserLoading || !user) return;

    const checkUserRole = async () => {
      if (!user.email || !firestore || !auth) return;

      try {
        const candidates = await fetchAdminCandidatesByEmail(firestore, user.email);

        if (candidates.length === 0) {
          await auth.signOut();
          setError('Usuario no encontrado en la base de datos.');
          return;
        }

        if (candidates.some((userData) => hasAdminRole(userData))) {
          router.replace('/admin');
          return;
        }

        await auth.signOut();
        setError('No tienes permisos de administrador (Rol insuficiente).');
      } catch (e) {
        console.error('Error checking admin role:', e);
        await auth.signOut();
        setError('Ocurrio un error al verificar tus permisos.');
      }
    };

    void checkUserRole();
  }, [user, isUserLoading, router, firestore, auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = normalizeAdminEmail(email);

    if (!normalizedEmail || !password) {
      setError('El correo y la contrasena no pueden estar vacios.');
      setLoading(false);
      return;
    }

    if (!auth || !firestore) {
      setError('Servicios de Firebase no disponibles.');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      // El useEffect redirige segun rol.
    } catch (authError: any) {
      const code = authError?.code;

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-login-credentials'
      ) {
        try {
          const emailCandidates = Array.from(new Set([email.trim(), normalizedEmail])).filter(Boolean);
          let matchedByDni = false;

          for (const emailCandidate of emailCandidates) {
            const q = query(
              collection(firestore, 'usuarios'),
              where('email', '==', emailCandidate),
              where('dni', '==', password)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              matchedByDni = true;
              break;
            }
          }

          if (matchedByDni) {
            await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          } else {
            setError('Credenciales incorrectas. Verifica tu correo y contrasena/DNI.');
          }
        } catch (creationError: any) {
          if (creationError.code === 'auth/email-already-in-use') {
            setError('Este correo ya esta registrado, pero la contrasena es incorrecta. Si ya estableciste una clave personal, usala.');
          } else if (creationError.code === 'auth/weak-password') {
            setError('La contrasena (DNI) es demasiado debil. Debe tener al menos 6 caracteres.');
          } else if (creationError.code === 'auth/invalid-email') {
            setError('El formato del correo electronico no es valido.');
          } else {
            console.error('Firestore query or Auth creation error:', creationError);
            setError('Error al consultar la base de datos o crear el usuario.');
          }
        }
      } else if (code === 'auth/invalid-email') {
        setError('El formato del correo electronico no es valido.');
      } else if (code === 'auth/wrong-password') {
        setError('La contrasena es incorrecta. Por favor, intentalo de nuevo.');
      } else {
        console.error('Authentication error:', authError);
        setError('Ha ocurrido un error inesperado durante el inicio de sesion.');
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
          <CardTitle className="text-2xl font-black text-white tracking-tighter uppercase italic font-headline">Bienvenido de nuevo</CardTitle>
          <CardDescription className="text-slate-400 font-medium">Panel de administracion local.</CardDescription>
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
              <Label htmlFor="password" className="text-slate-300 font-bold uppercase text-[10px] tracking-widest px-1">Contrasena o DNI</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
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
              <Link href="/auth/forgot-password" title="Olvidaste tu contrasena" className="text-slate-400 font-bold uppercase tracking-tighter hover:text-primary transition-colors">
                Olvidaste tu contrasena?
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
              {loading ? 'Verificando...' : 'Iniciar sesion'}
            </Button>

            <div className="pt-4 text-center">
              <Link href="/auth/inspection" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                Ir al modulo de inspectores
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
