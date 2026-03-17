'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Eye, EyeOff, WifiOff, Lock } from 'lucide-react';
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
        // tabla vacía o error  ignorar
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

  // 3. Si ya hay usuario autenticado en Firebase  redirigir
  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      const checkRole = async () => {
        try {
          // CORRECCIÓN: Usamos toLowerCase() para la búsqueda en Firestore
          const cleanEmail = user.email!.toLowerCase();
          const userDoc = await getDoc(doc(firestore, 'usuarios', cleanEmail));

          if (userDoc.exists() && userDoc.data().roles?.includes('inspector')) {
            router.push('/inspection');
          }
        } catch {
          router.push('/inspection');
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

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      const sessionId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('energy_engine_session_id', sessionId);

      if (firestore) {
        // CORRECCIÓN: Obtener el userData para guardar el pinHash localmente
        const userDocRef = doc(firestore, 'usuarios', cleanEmail);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : null;

        void setDoc(
          userDocRef,
          {
            activeSessionId: sessionId,
            activeSessionAt: serverTimestamp(),
            activeSessionDevice: 'inspection-web',
          },
          { merge: true }
        ).catch((e) => console.warn('No se pudo registrar sesión activa:', e));

        // Guardar email y pin en IndexedDB para uso offline futuro
        try {
          const existing = await dbLocal.table('seguridad').get(cleanEmail);

          // Actualizamos siempre para garantizar que el pin más reciente esté guardado
          await dbLocal.table('seguridad').put({
            email: cleanEmail,
            createdAt: existing ? existing.createdAt : new Date(),
            pinHash: userData?.pin || null // Guardamos el PIN en local
          });

        } catch { /* ignorar */ }
      }

      setStoredOfflineEmail(cleanEmail);
      setInspectionMode('online');
      setLoading(false);
      router.replace('/inspection');
      return;
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
        setLoading(false);
      } else if (code === 'auth/invalid-email') {
        console.error('Firebase invalid-email', {
          rawEmail: email,
          cleanEmail,
          cleanEmailCodes: [...cleanEmail].map(c => c.charCodeAt(0)),
        });
        setError('Firebase detecta el correo como inválido. Escríbelo manualmente y sin autocompletar.');
        setLoading(false);
      } else if (code === 'auth/network-request-failed') {
        // Redirigimos directamente al PinGate en vez de dar error
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
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-white/40 text-xs font-black uppercase tracking-widest">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + nombre */}
        <div className="flex flex-col items-center gap-3">
          <Logo />
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tighter italic">Portal de Inspección Técnica</h1>
          </div>
        </div>

        {/* Card login */}
        <div className="bg-white rounded-[2rem] p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter">Iniciar Sesión</h2>
            <p className="text-sm text-slate-400">Introduce tus credenciales de acceso</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="inspector@energyengine.es"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-900 h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-900 h-12 pr-10"
                  placeholder="Admin123"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 hover:bg-primary/90"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={handleOfflineAccess}
              disabled={loading}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock size={14} />
              Entrar offline con PIN
            </button>
          </form>
        </div>

        {/* Modo offline hint */}
        <div className="flex items-center justify-center gap-2 text-white/30 text-[10px] font-black uppercase tracking-widest">
          <Lock size={10} />
          Sin internet, usa tu PIN de acceso offline
          <WifiOff size={10} />
        </div>
      </div>
    </div>
  );
}