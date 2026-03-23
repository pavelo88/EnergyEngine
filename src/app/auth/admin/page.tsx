'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, updatePassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Eye, EyeOff, Lock, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { db as dbLocal } from '@/lib/db-local';

// 1. SEGURIDAD: Función Hash
const generateHash = async (text: string) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 2. SEGURIDAD: Validación de roles (Solo Admin para este panel)
const checkIsAuthorized = (userData: any) => {
  if (!userData) return false;

  console.log("Datos del usuario traídos de Firebase (Admin):", userData);
  let authorized = false;

  if (userData.roles) {
    const rolesArray = Array.isArray(userData.roles)
      ? userData.roles
      : Object.values(userData.roles);

    authorized = rolesArray.some((r: any) => {
      const val = typeof r === 'string' ? r : (r?.value || r?.id || '');
      const norm = String(val).toLowerCase().trim();
      return norm === 'admin' || norm === 'superadmin'; // Exclusivo de Admin
    });
  }

  if (!authorized && userData.role) {
    const norm = String(userData.role).toLowerCase().trim();
    if (norm === 'admin' || norm === 'superadmin') authorized = true;
  }

  return authorized;
};

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

  // Protección pasiva y redirección segura (Con filtro anti-caché)
  useEffect(() => {
    if (loading || isUserLoading || isPreparingSecurity || showPasswordModal) return;
    if (!user || !user.email) return;

    let isMounted = true;

    const verifyAndRedirect = async () => {
      try {
        const cleanEmail = user.email!.trim().toLowerCase();
        const userDocRef = doc(firestore, 'usuarios', cleanEmail);

        // 1. Leemos primero normal
        let userDocSnap = await getDoc(userDocRef);
        let userData = userDocSnap.data();

        // 2. EL CAZAFANTASMAS 👻
        if (userDocSnap.exists() && (!userData || !userData.roles)) {
          console.warn("Documento fantasma detectado en caché. Dando 1.5s a Firebase...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          userDocSnap = await getDocFromServer(userDocRef);
          userData = userDocSnap.data();
        }

        if (userDocSnap.exists() && userData && isMounted) {
          if (userData?.forcePasswordChange) {
            setPendingUserEmail(cleanEmail);
            setShowPasswordModal(true);
            return;
          }

          if (checkIsAuthorized(userData)) {
            router.replace('/admin');
          } else {
            if (auth) await auth.signOut();
            setError("No tienes permisos de Administrador.");
          }
        }
      } catch (error) {
        console.error("Error al verificar rol en protección pasiva:", error);
      }
    };

    if (navigator.onLine) {
      verifyAndRedirect();
    }

    return () => { isMounted = false; };
  }, [user, isUserLoading, router, firestore, showPasswordModal, isPreparingSecurity, auth, loading]);


  // Actualizar Clave en Nube
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
    if (!auth || !firestore) {
      setPasswordError('Error de conexión. Inténtalo de nuevo.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      if (auth.currentUser) {
        // Si ya existe en Firebase Auth, solo actualizamos
        await updatePassword(auth.currentUser, newPassword);
      } else {
        // SI ES LA PRIMERA VEZ: Lo creamos en Firebase Auth
        await createUserWithEmailAndPassword(auth, pendingUserEmail, newPassword);
      }

      const userDocRef = doc(firestore, 'usuarios', pendingUserEmail);
      // Borramos también el tempPassword por seguridad
      await updateDoc(userDocRef, { forcePasswordChange: false, tempPassword: null });

      const hashedNewPassword = await generateHash(newPassword);
      try {
        const existing = await dbLocal.table('seguridad').get(pendingUserEmail);
        await dbLocal.table('seguridad').put({
          email: pendingUserEmail,
          createdAt: existing ? existing.createdAt : new Date(),
          pinHash: hashedNewPassword
        });
      } catch (localErr) {
        console.warn('No se guardó local:', localErr);
      }

      setShowPasswordModal(false);
      router.replace('/admin'); // <-- Redirige a /admin

    } catch (err: any) {
      console.error("Error actualizando contraseña:", err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Por seguridad, cierra sesión y vuelve a entrar antes de cambiar la clave.');
      } else {
        setPasswordError('Hubo un error al actualizar la contraseña: ' + err.message);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Login Principal (Nube)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    if (!auth) { setError('Firebase no disponible.'); setLoading(false); return; }

    const cleanEmail = email.trim().toLowerCase();

    const processSuccessfulLogin = async () => {
      if (!firestore) return;
      const userDocRef = doc(firestore, 'usuarios', cleanEmail);

      // 1. Lectura normal
      let userDocSnap = await getDoc(userDocRef);
      let userData = userDocSnap.data();

      // 2. EL CAZAFANTASMAS 👻 
      if (userDocSnap.exists() && (!userData || !userData.roles)) {
        console.warn("Documento fantasma detectado durante el login. Dando 1.5s...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        userDocSnap = await getDocFromServer(userDocRef);
        userData = userDocSnap.data();
      }

      if (userDocSnap.exists() && userData) {
        if (!checkIsAuthorized(userData)) {
          await auth.signOut();
          setError("No tienes permisos de Administrador.");
          setLoading(false);
          return;
        }

        const sessionId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('energy_engine_session_id', sessionId);

        void setDoc(userDocRef, { activeSessionId: sessionId, activeSessionAt: serverTimestamp(), activeSessionDevice: 'admin-web' }, { merge: true }).catch(e => console.warn(e));

        if (userData?.forcePasswordChange) {
          setIsPreparingSecurity(true);
          setTimeout(() => {
            setIsPreparingSecurity(false);
            setPendingUserEmail(cleanEmail);
            setShowPasswordModal(true);
            setLoading(false);
          }, 1000);
        } else {
          router.replace('/admin');
        }
      } else {
        await auth.signOut();
        setError("Usuario no encontrado en la base de datos.");
        setLoading(false);
      }
    };

    try {
      // 1. INTENTO NORMAL: Iniciar sesión en Firebase Auth
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      await processSuccessfulLogin();
    } catch (err: any) {
      // 2. SI FALLA: Verificamos si es la Primera Vez (solo existe en Firestore)
      try {
        if (firestore) {
          const userDocRef = doc(firestore, 'usuarios', cleanEmail);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // Si requiere cambio y la clave ingresada es la temporal
            if (userData.forcePasswordChange && userData.tempPassword === password) {
              if (!checkIsAuthorized(userData)) {
                setError("No tienes permisos de Administrador.");
                setLoading(false);
                return;
              }

              setPendingUserEmail(cleanEmail);
              setShowPasswordModal(true); // Abrimos el modal
              setLoading(false);
              return; // Detenemos aquí
            }
          }
        }
      } catch (e) {
        console.error("Error validando primera vez", e);
      }

      // Si no es la primera vez y falló el login
      setError('Credenciales incorrectas o error de inicio de sesión.');
      setLoading(false);
    }
  };

  if (isUserLoading || (user && !showPasswordModal && !isPreparingSecurity)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
          <p className="text-slate-700 text-xs font-black uppercase tracking-widest">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // --- RENDERIZADO DEL MODAL ---
  if (showPasswordModal) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent relative z-10 p-4">
        <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl bg-white/80 backdrop-blur-xl border border-white/50 p-2">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Actualiza tu clave</CardTitle>
            <CardDescription className="text-slate-600 font-medium text-sm">
              Por seguridad, debes cambiar la contraseña temporal asignada.
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

              <div className="flex flex-col space-y-3 pt-2">
                <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-[0.98] transition-all" disabled={isUpdatingPassword}>
                  {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUpdatingPassword ? 'Actualizando...' : 'Guardar y Entrar'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    if (auth) await auth.signOut();
                    setShowPasswordModal(false);
                    setPendingUserEmail('');
                    setPassword('');
                  }}
                  disabled={isUpdatingPassword}
                  className="w-full h-10 font-bold uppercase tracking-widest text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar y Cerrar Sesión
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- RENDERIZADO DEL LOGIN ---
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10 bg-transparent">
      <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl bg-white/80 backdrop-blur-xl border border-white/50 p-2">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-2 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase font-headline">Panel de Administración</CardTitle>
          <CardDescription className="text-slate-600 font-medium text-sm">Ingresa tus credenciales locales.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-bold uppercase text-xs tracking-widest px-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@energyengine.es"
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

            <div className="pt-4 text-center">
              <Link href="/auth/inspection" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors">
                Ir al Portal Inspector
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}