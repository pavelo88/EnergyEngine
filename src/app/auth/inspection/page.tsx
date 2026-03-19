'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, updatePassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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

// 1. SEGURIDAD: Función Hash para el Pingate Local
const generateHash = async (text: string) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 2. SEGURIDAD: Validación de roles a prueba de errores de tipeo
const checkIsAuthorized = (userData: any) => {
  let authorized = false;
  if (userData.roles && Array.isArray(userData.roles)) {
    authorized = userData.roles.some((r: any) => {
      const val = typeof r === 'string' ? r : (r?.value || r?.id || '');
      const norm = String(val).toLowerCase().trim();
      return norm === 'inspector' || norm === 'admin';
    });
  }
  if (!authorized && userData.role) {
    const norm = String(userData.role).toLowerCase().trim();
    if (norm === 'inspector' || norm === 'admin') authorized = true;
  }
  return authorized;
};

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
  const [isPreparingSecurity, setIsPreparingSecurity] = useState(false);

  // --- ESTADOS DEL MODAL DE CAMBIO DE CLAVE ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState('');

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // Detectar conexión y email guardado
  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);

    const loadSavedEmail = async () => {
      try {
        const allSecurity = await dbLocal.table('seguridad').toArray();
        if (allSecurity.length > 0) {
          const firstValid = allSecurity
            .map((row: any) => normalizeInspectionEmail(String(row.email || '')))
            .find((mail: string) => isValidEmail(mail));
          if (firstValid) setEmail(firstValid);
        }
      } catch (e) {
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

  useEffect(() => {
    if (!checkingOffline && !isOnline) {
      setInspectionMode('offline');
    }
  }, [isOnline, checkingOffline]);

  // Protección pasiva (Si recarga la página)
  useEffect(() => {
    if (!isUserLoading && user && firestore && user.email && !showPasswordModal && !isPreparingSecurity) {
      const checkRole = async () => {
        try {
          const cleanEmail = user.email!.trim().toLowerCase();
          const userDocRef = doc(firestore, 'usuarios', cleanEmail);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            if (userData.forcePasswordChange) {
              setPendingUserEmail(cleanEmail);
              setShowPasswordModal(true);
              return;
            }

            if (checkIsAuthorized(userData)) {
              router.push('/inspection');
            } else {
              if (auth) await auth.signOut();
              setError("No tienes permisos de inspector.");
            }
          } else {
            if (auth) await auth.signOut();
            setError("Usuario no encontrado en la base de datos.");
          }
        } catch (error) {
          console.error("Error al verificar rol:", error);
        }
      };
      checkRole();
    }
  }, [user, isUserLoading, router, firestore, showPasswordModal, isPreparingSecurity, auth]);

  // --- EL PINGATE OFFLINE CORREGIDO Y SEGURO ---
  const handleOfflineAccess = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail) || !password) {
      setError('Para entrar offline, ingresa tu correo y contraseña válida.');
      return;
    }

    const security = await dbLocal.table('seguridad').get(cleanEmail);
    if (!security) {
      setError('Este correo no está autorizado en este dispositivo. Entra con internet la primera vez.');
      return;
    }

    // Validamos que la contraseña ingresada coincida con el Hash guardado
    const inputHash = await generateHash(password);
    if (security.pinHash !== inputHash) {
      setError('Contraseña incorrecta para el modo offline.');
      return;
    }

    setStoredOfflineEmail(cleanEmail);
    setInspectionMode('offline');
    router.replace('/inspection');
  };
  // ---------------------------------------------

  // Actualizar Clave en Nube y Local Hash
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    if (!auth?.currentUser || !firestore) {
      setPasswordError('Error de conexión. Inténtalo de nuevo.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await updatePassword(auth.currentUser, newPassword);

      const userDocRef = doc(firestore, 'usuarios', pendingUserEmail);
      await updateDoc(userDocRef, { forcePasswordChange: false });

      const hashedNewPassword = await generateHash(newPassword);
      try {
        const existing = await dbLocal.table('seguridad').get(pendingUserEmail);
        await dbLocal.table('seguridad').put({
          email: pendingUserEmail,
          createdAt: existing ? existing.createdAt : new Date(),
          pinHash: hashedNewPassword
        });
      } catch (localErr) {
        console.warn('No se pudo guardar la nueva clave offline:', localErr);
      }

      setShowPasswordModal(false);
      router.replace('/inspection');

    } catch (err: any) {
      console.error("Error actualizando contraseña:", err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Por seguridad, cierra sesión y vuelve a entrar con tu DNI antes de cambiar la clave.');
      } else {
        setPasswordError('Hubo un error al actualizar la contraseña.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Login Principal (Nube)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      await handleOfflineAccess();
      return;
    }

    setLoading(true);
    setError(null);
    if (!auth) { setError('Firebase no disponible.'); setLoading(false); return; }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('El formato del correo no es válido.');
      setLoading(false);
      return;
    }

    const processSuccessfulLogin = async () => {
      if (!firestore) return;
      const userDocRef = doc(firestore, 'usuarios', cleanEmail);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // Usamos la función blindada
        if (!checkIsAuthorized(userData)) {
          await auth.signOut();
          setError("No tienes permisos de inspector.");
          setLoading(false);
          return;
        }

        const sessionId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('energy_engine_session_id', sessionId);

        void setDoc(userDocRef, { activeSessionId: sessionId, activeSessionAt: serverTimestamp(), activeSessionDevice: 'inspection-web' }, { merge: true }).catch(e => console.warn(e));

        setStoredOfflineEmail(cleanEmail);
        setInspectionMode('online');

        if (userData.forcePasswordChange) {
          setIsPreparingSecurity(true);
          setTimeout(() => {
            setIsPreparingSecurity(false);
            setPendingUserEmail(cleanEmail);
            setShowPasswordModal(true);
            setLoading(false);
          }, 1000);
        } else {
          const currentPasswordHash = await generateHash(password);
          try {
            const existing = await dbLocal.table('seguridad').get(cleanEmail);
            await dbLocal.table('seguridad').put({
              email: cleanEmail,
              createdAt: existing ? existing.createdAt : new Date(),
              pinHash: currentPasswordHash
            });
          } catch (e) { /* ignorar */ }

          router.replace('/inspection');
        }
      } else {
        await auth.signOut();
        setError("Usuario no encontrado en la base de datos.");
        setLoading(false);
      }
    };

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      await processSuccessfulLogin();
    } catch (err: any) {
      const code = err.code || '';

      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        try {
          await signInAnonymously(auth);
          let matchedByPin = false;
          if (firestore) {
            const userDocRef = doc(firestore, 'usuarios', cleanEmail);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              if (userData.dni === password || userData.pin === password) matchedByPin = true;
            }
          }

          const anonUser = auth.currentUser;
          if (anonUser) await anonUser.delete();
          else await auth.signOut();

          if (matchedByPin) {
            await createUserWithEmailAndPassword(auth, cleanEmail, password);
            await processSuccessfulLogin();
          } else {
            setError('Credenciales incorrectas. Verifica tu correo y contraseña o PIN.');
            setLoading(false);
          }
        } catch (autoErr: any) {
          await auth.signOut();
          setError('Error al verificar credenciales en la base de datos.');
          setLoading(false);
        }
      } else if (code === 'auth/invalid-email') {
        setError('Firebase detecta el correo como inválido.');
        setLoading(false);
      } else {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
        setLoading(false);
      }
    }
  };

  if (checkingOffline || isUserLoading || (user && !showPasswordModal && !isPreparingSecurity)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
          <p className="text-slate-700 text-xs font-black uppercase tracking-widest">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // --- RENDERIZADO DEL MODAL (CRISTAL BLANCO) ---
  if (showPasswordModal) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent relative z-10 p-4">
        <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl bg-white/80 backdrop-blur-xl border border-white/50 p-2">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Actualiza tu clave</CardTitle>
            <CardDescription className="text-slate-600 font-medium text-sm">
              Por seguridad, debes cambiar el PIN/DNI temporal asignado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-700 font-bold uppercase text-xs tracking-widest px-1">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="bg-white/60 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 pr-10 focus-visible:ring-slate-400"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900">
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-bold uppercase text-xs tracking-widest px-1">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="bg-white/60 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 pr-10 focus-visible:ring-slate-400"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{passwordError}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-[0.98] transition-all" disabled={isUpdatingPassword}>
                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdatingPassword ? 'Actualizando...' : 'Guardar y Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- RENDERIZADO DEL LOGIN (CRISTAL BLANCO) ---
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10 bg-transparent">
      <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl bg-white/80 backdrop-blur-xl border border-white/50 p-2">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-2 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase font-headline">Portal Inspector</CardTitle>
          <CardDescription className="text-slate-600 font-medium text-sm">Inspección Técnica Operativa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-bold uppercase text-xs tracking-widest px-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="inspector@energyengine.es"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/60 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 focus-visible:ring-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-bold uppercase text-xs tracking-widest px-1">Contraseña o DNI</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/60 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 pr-10 focus-visible:ring-slate-400"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <Checkbox id="remember-me" className="border-slate-300 data-[state=checked]:bg-slate-900" />
                <Label htmlFor="remember-me" className="text-slate-700 font-bold uppercase tracking-tighter cursor-pointer">Recordarme</Label>
              </div>
              <Link href="/auth/forgot-password" className="text-slate-600 font-bold uppercase tracking-tighter hover:text-slate-900 transition-colors">
                ¿Olvidaste tu clave?
              </Link>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 animate-in fade-in zoom-in duration-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-[0.98] transition-all" disabled={loading || isPreparingSecurity}>
              {(loading || isPreparingSecurity) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPreparingSecurity ? 'Preparando seguridad...' : loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleOfflineAccess}
              disabled={loading || isPreparingSecurity}
              className="w-full h-12 font-bold uppercase tracking-widest text-xs rounded-xl border-slate-300 bg-transparent text-slate-700 hover:bg-white/50 shadow-sm active:scale-[0.98] transition-all"
            >
              <Lock size={16} className="mr-2" />
              Entrar offline (Sin Wi-Fi)
            </Button>

            <div className="pt-4 text-center">
              <Link href="/auth/admin" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors">
                Ir al Panel de Administración
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}