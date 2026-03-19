'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, updatePassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
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

  // --- ESTADOS DEL LOGIN ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPreparingSecurity, setIsPreparingSecurity] = useState(false); // Para el spinner de transición

  // --- ESTADOS DEL MODAL DE CAMBIAR CLAVE ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState('');

  // 1. Verificación pasiva: si recarga la página estando logueado
  useEffect(() => {
    if (isUserLoading || !user || !user.email || showPasswordModal) return;

    const checkUserRole = async () => {
      if (!firestore || !auth) return;

      try {
        const candidates = await fetchAdminCandidatesByEmail(firestore, user.email!);
        if (candidates.length === 0) {
          await auth.signOut();
          setError('Usuario no encontrado en la base de datos.');
          return;
        }

        const validAdmin = candidates.find((userData) => hasAdminRole(userData));
        if (validAdmin) {
          if (validAdmin.forcePasswordChange) {
            setPendingUserEmail(user.email!);
            setShowPasswordModal(true);
            return;
          }
          router.replace('/admin');
          return;
        }

        await auth.signOut();
        setError('No tienes permisos de administrador.');
      } catch (e) {
        console.error('Error verificando rol:', e);
        await auth.signOut();
        setError('Ocurrió un error al verificar tus permisos.');
      }
    };

    void checkUserRole();
  }, [user, isUserLoading, router, firestore, auth, showPasswordModal]);


  // 2. Ejecutar el cambio de clave en el Popup
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

      // Marcamos en Firestore que ya cambió su clave
      const userDocRef = doc(firestore, 'usuarios', pendingUserEmail);
      await updateDoc(userDocRef, { forcePasswordChange: false });

      setShowPasswordModal(false);
      router.replace('/admin');
    } catch (err: any) {
      console.error("Error actualizando clave:", err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Por seguridad, cierra sesión y vuelve a entrar con tu DNI antes de cambiar la clave.');
      } else {
        setPasswordError('Hubo un error al actualizar la contraseña.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  // 3. Proceso principal de Login / Auto-registro
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = normalizeAdminEmail(email);

    if (!normalizedEmail || !password) {
      setError('El correo y la contraseña no pueden estar vacíos.');
      setLoading(false);
      return;
    }

    if (!auth || !firestore) {
      setError('Servicios de Firebase no disponibles.');
      setLoading(false);
      return;
    }

    const processSuccessfulLogin = async () => {
      try {
        const candidates = await fetchAdminCandidatesByEmail(firestore, normalizedEmail);
        const validAdmin = candidates.find((userData) => hasAdminRole(userData));

        if (validAdmin) {
          if (validAdmin.forcePasswordChange) {
            // Activamos el spinner de transición durante 1 segundo antes de mostrar el popup
            setIsPreparingSecurity(true);
            setTimeout(() => {
              setIsPreparingSecurity(false);
              setPendingUserEmail(normalizedEmail);
              setShowPasswordModal(true);
              setLoading(false);
            }, 1000);
          } else {
            router.replace('/admin');
          }
        } else {
          await auth.signOut();
          setError('No tienes permisos de administrador (Rol insuficiente).');
          setLoading(false);
        }
      } catch (e) {
        console.error("Error validando admin tras login", e);
        await auth.signOut();
        setError('Error validando tus permisos post-login.');
        setLoading(false);
      }
    }

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await processSuccessfulLogin();
    } catch (authError: any) {
      const code = authError?.code;

      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/invalid-login-credentials') {
        try {
          await signInAnonymously(auth);

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

          const anonUser = auth.currentUser;
          if (anonUser) await anonUser.delete();
          else await auth.signOut();

          if (matchedByDni) {
            await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            await processSuccessfulLogin();
          } else {
            setError('Credenciales incorrectas. Verifica tu correo y contraseña/DNI.');
            setLoading(false);
          }
        } catch (creationError: any) {
          await auth.signOut();
          if (creationError.code === 'auth/email-already-in-use') setError('Este correo ya está registrado, pero la contraseña es incorrecta.');
          else if (creationError.code === 'auth/weak-password') setError('La contraseña (DNI) es demasiado débil. Mínimo 6 caracteres.');
          else if (creationError.code === 'auth/invalid-email') setError('El formato del correo electrónico no es válido.');
          else setError('Error al consultar la base de datos o crear el usuario.');
          setLoading(false);
        }
      } else if (code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
        setLoading(false);
      } else if (code === 'auth/wrong-password') {
        setError('La contraseña es incorrecta. Por favor, inténtalo de nuevo.');
        setLoading(false);
      } else {
        setError('Ha ocurrido un error inesperado durante el inicio de sesión.');
        setLoading(false);
      }
    }
  };


  if (isUserLoading || (user && !showPasswordModal && !isPreparingSecurity)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
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
              Por seguridad, debes cambiar la contraseña temporal asignada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPasswordAdmin" className="text-slate-700 font-bold uppercase text-xs tracking-widest px-1">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPasswordAdmin"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="bg-white/60 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 pr-10 focus-visible:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPasswordAdmin" className="text-slate-700 font-bold uppercase text-xs tracking-widest px-1">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPasswordAdmin"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="bg-white/60 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 pr-10 focus-visible:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900"
                  >
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
            {/* Si tu Logo es blanco, quizás necesites invertir su color en el CSS global o usar otro componente */}
            <Logo />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase font-headline">Panel de Admin</CardTitle>
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/60 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl h-12 pr-10 focus-visible:ring-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <Checkbox id="remember-me-admin" className="border-slate-300 data-[state=checked]:bg-slate-900" />
                <Label htmlFor="remember-me-admin" className="text-slate-700 font-bold uppercase tracking-tighter cursor-pointer">Recordarme</Label>
              </div>
              <Link href="/auth/forgot-password" title="Olvidaste tu contraseña" className="text-slate-600 font-bold uppercase tracking-tighter hover:text-slate-900 transition-colors">
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
                Ir al módulo de inspectores
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}