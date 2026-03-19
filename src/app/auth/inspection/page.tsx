'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Eye, EyeOff, Lock, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { db as dbLocal } from '@/lib/db-local';
import {
  normalizeInspectionEmail,
  setInspectionMode,
  setStoredOfflineEmail,
} from '@/lib/inspection-mode';

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
  const [isOnline, setIsOnline] = useState(true);
  const [checkingOffline, setCheckingOffline] = useState(true);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // 1. Detectar conexión y email guardado
  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);

    const loadSavedEmail = async () => {
      try {
        // Buscar si hay una sesión guardada en IndexedDB
        const allSecurity = await dbLocal.table('seguridad').toArray();
        if (allSecurity.length > 0) {
          const firstValid = allSecurity
            .map((row: any) => normalizeInspectionEmail(String(row.email || '')))
            .find((mail: string) => isValidEmail(mail));
          if (firstValid) setEmail(firstValid);
        }
      } catch (e) {
        // tabla vacía o error ignorar
      } finally {
        setCheckingOffline(false);
      }
    };

    loadSavedEmail();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Marcar modo offline cuando no hay internet
  useEffect(() => {
    if (!checkingOffline && !isOnline) {
      setInspectionMode('offline');
    }
  }, [isOnline, checkingOffline]);

  // 3. Si ya hay usuario autenticado en Firebase redirigir (Protección pasiva)
  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      const checkRole = async () => {
        try {
          const cleanEmail = user.email!.toLowerCase();
          const userDocRef = doc(firestore, 'usuarios', cleanEmail);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            const hasAccessArray = userData.roles && Array.isArray(userData.roles) &&
              (userData.roles.includes('inspector') || userData.roles.includes('admin'));

            const hasAccessString = userData.role &&
              (userData.role === 'inspector' || userData.role === 'admin');

            if (hasAccessArray || hasAccessString) {
              router.push('/inspection');
            } else {
              const authInstance = (await import('firebase/auth')).getAuth();
              await authInstance.signOut();
              setError("No tienes permisos de inspector (Rol insuficiente).");
            }
          } else {
            const authInstance = (await import('firebase/auth')).getAuth();
            await authInstance.signOut();
            setError("Usuario no encontrado en la base de datos.");
          }
        } catch (error) {
          console.error("Error al verificar rol:", error);
        }
      };
      checkRole();
    }
  }, [user, isUserLoading, router, firestore]);

  const handleOfflineAccess = async () => {
    const cleanEmail = normalizeInspectionEmail(email);
    if (!isValidEmail(cleanEmail)) {
      setError('Para modo offline, ingresa un correo valido previamente registrado.');
      return;
    }

    const security = await dbLocal.table('seguridad').get(cleanEmail);
    if (!security) {
      setError('Ese correo no tiene acceso offline en este dispositivo. Entra online una vez primero.');
      return;
    }

    setStoredOfflineEmail(cleanEmail);
    setInspectionMode('offline');
    router.replace('/inspection');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      await handleOfflineAccess();
      return;
    }

    setLoading(true);
    setError(null);
    if (!auth) { setError('Firebase no disponible.'); setLoading(false); return; }

    const cleanEmail = normalizeInspectionEmail(email);
    if (!isValidEmail(cleanEmail)) {
      setError('El formato del correo no es válido.');
      setLoading(false);
      return;
    }

    // --- FUNCIÓN INTERNA DE ÉXITO (Para no repetir código) ---
    const processSuccessfulLogin = async () => {
      if (!firestore) return;
      const userDocRef = doc(firestore, 'usuarios', cleanEmail);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const hasAccessArray = userData.roles && Array.isArray(userData.roles) &&
          (userData.roles.includes('inspector') || userData.roles.includes('admin'));
        const hasAccessString = userData.role &&
          (userData.role === 'inspector' || userData.role === 'admin');

        if (!hasAccessArray && !hasAccessString) {
          await auth.signOut();
          setError("No tienes permisos de inspector (Rol insuficiente).");
          setLoading(false);
          return;
        }

        const sessionId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('energy_engine_session_id', sessionId);

        void setDoc(
          userDocRef,
          { activeSessionId: sessionId, activeSessionAt: serverTimestamp(), activeSessionDevice: 'inspection-web' },
          { merge: true }
        ).catch((e) => console.warn('No se pudo registrar sesión activa:', e));

        try {
          const existing = await dbLocal.table('seguridad').get(cleanEmail);
          await dbLocal.table('seguridad').put({
            email: cleanEmail,
            createdAt: existing ? existing.createdAt : new Date(),
            pinHash: userData.pin || userData.dni || null
          });
        } catch { /* ignorar */ }

        setStoredOfflineEmail(cleanEmail);
        setInspectionMode('online');
        setLoading(false);
        router.replace('/inspection');
      } else {
        await auth.signOut();
        setError("Usuario no encontrado en la base de datos.");
        setLoading(false);
      }
    };
    // ---------------------------------------------------------

    try {
      // 1. Intentamos el login normal
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      await processSuccessfulLogin();

    } catch (err: any) {
      const code = err.code || '';

      // 2. Si el usuario es nuevo (o hay error de credenciales), intentamos el AUTO-REGISTRO
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        try {
          // A. Nos ponemos el traje de anónimo para que Firestore nos deje leer
          await signInAnonymously(auth);

          let matchedByPin = false;
          if (firestore) {
            const userDocRef = doc(firestore, 'usuarios', cleanEmail);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              // Validamos que lo que escribió coincida con su DNI o PIN en Firestore
              if (userData.dni === password || userData.pin === password) {
                matchedByPin = true;
              }
            }
          }

          // B. Nos quitamos el traje de anónimo
          await auth.signOut();

          if (matchedByPin) {
            // C. Creamos la cuenta oficial y procesamos el éxito
            await createUserWithEmailAndPassword(auth, cleanEmail, password);
            await processSuccessfulLogin();
          } else {
            setError('Credenciales incorrectas. Verifica tu correo y contraseña o PIN.');
            setLoading(false);
          }

        } catch (autoErr: any) {
          await auth.signOut();
          console.error("Error en auto-registro:", autoErr);
          setError('Error al verificar credenciales en la base de datos.');
          setLoading(false);
        }

      } else if (code === 'auth/invalid-email') {
        setError('Firebase detecta el correo como inválido. Escríbelo manualmente y sin autocompletar.');
        setLoading(false);
      } else if (code === 'auth/network-request-failed') {
        router.replace('/inspection');
      } else {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
        setLoading(false);
      }
    }
  };

  // Loading inicial
  if (checkingOffline || isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10 bg-transparent">
      <Card className="w-full max-w-sm rounded-2xl shadow-2xl glass-crystallized">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-2 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">¡Bienvenido de nuevo!</CardTitle>
          <CardDescription>Portal de Inspección Técnica.</CardDescription>
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
              <Label htmlFor="password">Contraseña o PIN</Label>
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
                <Checkbox id="remember-me" />
                <Label htmlFor="remember-me" className="text-muted-foreground font-medium">Recordarme</Label>
              </div>
              <Link href="/auth/forgot-password" className="underline text-muted-foreground hover:text-primary">
                Olvidaste tu contraseña?
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

            <Button
              type="button"
              variant="outline"
              onClick={handleOfflineAccess}
              disabled={loading}
              className="w-full font-bold border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100"
            >
              <Lock size={16} className="mr-2" />
              Entrar offline con PIN
            </Button>

            <div className="pt-2 text-center text-sm">
              <Link href="/auth/admin" className="underline text-muted-foreground hover:text-primary">
                Ir al Panel de Administración
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest pt-4">
              <Lock size={10} />
              Sin internet, usa tu PIN
              <WifiOff size={10} />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}