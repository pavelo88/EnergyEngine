'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updatePassword,
  signOut,
  deleteUser
} from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDocFromServer, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { db as dbLocal } from '@/lib/db-local';
import { normalizeInspectionEmail, setInspectionMode, setStoredOfflineEmail } from '@/lib/inspection-mode';

const generateHash = async (text: string) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const checkIsAuthorized = (userData: any) => {
  if (!userData) return false;
  let authorized = false;
  if (userData.roles) {
    const rolesArray = Array.isArray(userData.roles) ? userData.roles : Object.values(userData.roles);
    authorized = rolesArray.some((r: any) => {
      const val = typeof r === 'string' ? r : (r?.value || r?.id || '');
      return String(val).toLowerCase().trim() === 'inspector';
    });
  }
  if (!authorized && userData.role) {
    if (String(userData.role).toLowerCase().trim() === 'inspector') authorized = true;
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

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState('');

  const processingAuthRef = useRef(false);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const allSecurity = await dbLocal.table('seguridad').toArray();
        if (allSecurity.length > 0) {
          const firstValid = allSecurity
            .map((row: any) => normalizeInspectionEmail(String(row.email || '')))
            .find((mail: string) => isValidEmail(mail));
          if (firstValid) setEmail(firstValid);
        }
      } catch (e) { }
    };
    loadSavedEmail();
  }, []);

  // Protección pasiva: Si ya está logueado y es inspector, redirigir
  useEffect(() => {
    if (loading || isUserLoading || showPasswordModal || processingAuthRef.current) return;
    if (!user || !user.email || user.isAnonymous) return;

    let isMounted = true;
    const verifyAndRedirect = async () => {
      try {
        const cleanEmail = user.email!.trim().toLowerCase();
        const userDocRef = doc(firestore!, 'usuarios', cleanEmail);
        let userDocSnap = await getDocFromServer(userDocRef);
        let userData = userDocSnap.data();

        if (userDocSnap.exists() && userData && isMounted) {
          if (userData.forcePasswordChange) {
            setPendingUserEmail(cleanEmail);
            setShowPasswordModal(true);
            return;
          }
          if (checkIsAuthorized(userData)) {
            router.replace('/inspection');
          } else {
            await signOut(auth!);
            setError("No tienes permisos de inspector.");
          }
        }
      } catch (error) {
        console.error("Error en verificación:", error);
      }
    };

    if (navigator.onLine) verifyAndRedirect();
    return () => { isMounted = false; };
  }, [user, isUserLoading, router, firestore, showPasswordModal, auth, loading]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setPasswordError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError('Las contraseñas no coinciden.'); return; }

    setIsUpdatingPassword(true);
    setPasswordError(null);

    try {
      const currentUser = auth!.currentUser;
      const cleanEmail = pendingUserEmail.trim().toLowerCase();

      if (currentUser?.isAnonymous) {
        // ESCENARIO DNI: Borrar anónimo y crear real
        await deleteUser(currentUser);
        await createUserWithEmailAndPassword(auth!, cleanEmail, newPassword);
      } else if (currentUser) {
        // ESCENARIO RE-AUTENTICADO: Solo actualizar password
        await updatePassword(currentUser, newPassword);
      }

      // Actualizar Firestore
      const userDocRef = doc(firestore!, 'usuarios', cleanEmail);
      await updateDoc(userDocRef, {
        forcePasswordChange: false,
        updatedAt: serverTimestamp()
      });

      // Guardar hash local para offline
      const hashedNewPassword = await generateHash(newPassword);
      await dbLocal.table('seguridad').put({
        email: cleanEmail,
        createdAt: new Date(),
        pinHash: hashedNewPassword
      });

      setShowPasswordModal(false);
      router.replace('/inspection');
    } catch (err: any) {
      console.error("Error en update password:", err);
      setPasswordError(err.message === 'auth/requires-recent-login'
        ? "Por seguridad, vuelve a iniciar sesión antes de cambiar la clave."
        : "Error al establecer la nueva contraseña.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) { setError("Email inválido."); return; }

    setError(null);
    setLoading(true);
    processingAuthRef.current = true;

    // 1. FLUJO OFFLINE
    if (!navigator.onLine) {
      try {
        const security = await dbLocal.table('seguridad').get(cleanEmail);
        const inputHash = await generateHash(password);
        if (security && security.pinHash === inputHash) {
          setStoredOfflineEmail(cleanEmail);
          setInspectionMode('offline');
          router.replace('/inspection');
          return;
        }
        setError('Credenciales offline incorrectas.');
      } catch (err) {
        setError('Error al acceder a datos locales.');
      } finally {
        setLoading(false);
        processingAuthRef.current = false;
      }
      return;
    }

    // 2. FLUJO ONLINE
    try {
      // INTENTO A: Usuario con clave real
      try {
        await signInWithEmailAndPassword(auth!, cleanEmail, password);

        const userDocRef = doc(firestore!, 'usuarios', cleanEmail);
        const userDocSnap = await getDocFromServer(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (!checkIsAuthorized(userData)) {
            await signOut(auth!);
            setError("Acceso denegado: No eres inspector.");
            setLoading(false);
            processingAuthRef.current = false;
            return;
          }

          if (userData.forcePasswordChange) {
            setPendingUserEmail(cleanEmail);
            setShowPasswordModal(true);
            setLoading(false);
            processingAuthRef.current = false;
            return;
          }

          setStoredOfflineEmail(cleanEmail);
          setInspectionMode('online');
          router.replace('/inspection');
          return;
        }
      } catch (authErr: any) {
        // Si no es error de "usuario no encontrado" o "clave mal", arrojar para ir al Puente Anónimo
        if (authErr.code !== 'auth/user-not-found' && authErr.code !== 'auth/wrong-password' && authErr.code !== 'auth/invalid-credential') {
          throw authErr;
        }
      }

      // INTENTO B: Puente Anónimo para validar DNI (Usuario Nuevo)
      await signInAnonymously(auth!);
      const userDocRef = doc(firestore!, 'usuarios', cleanEmail);
      const userDocSnap = await getDocFromServer(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const passMatch = userData.dni === password;
        const authMatch = checkIsAuthorized(userData);

        if (userData.forcePasswordChange && passMatch && authMatch) {
          setPendingUserEmail(cleanEmail);
          setShowPasswordModal(true);
          setLoading(false);
          processingAuthRef.current = false;
          return;
        }
      }

      await signOut(auth!);
      setError("Credenciales incorrectas.");
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
      processingAuthRef.current = false;
    }
  };

  if (isUserLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  if (showPasswordModal) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-50/50 backdrop-blur-sm">
        <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl border-none p-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black tracking-tight">Crea tu clave</CardTitle>
            <CardDescription className="font-medium text-slate-500">Acceso definitivo para {pendingUserEmail}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nueva Contraseña</Label>
                <div className="relative">
                  <Input type={showNewPassword ? 'text' : 'password'} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-none focus-visible:ring-primary/20" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-3 text-slate-400">{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar</Label>
                <div className="relative">
                  <Input type={showConfirmPassword ? 'text' : 'password'} required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-none focus-visible:ring-primary/20" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3 text-slate-400">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              {passwordError && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2"><AlertCircle size={14} /> {passwordError}</div>}
              <Button type="submit" disabled={isUpdatingPassword} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                {isUpdatingPassword ? <Loader2 className="animate-spin" /> : "Registrar y Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-transparent relative">
      <Card className="w-full max-w-sm rounded-[3rem] shadow-2xl bg-white/70 backdrop-blur-2xl border border-white/50 p-4">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-2"><Logo /></div>
          <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Portal Inspector</CardTitle>
          <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Inspección Técnica Operativa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl h-14 bg-white/50 border-slate-200 focus-visible:ring-primary/20 text-base" placeholder="nombre@energyengine.es" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña o DNI</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-2xl h-14 bg-white/50 border-slate-200 focus-visible:ring-primary/20 text-base" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Checkbox id="rem" className="border-slate-300" />
                <Label htmlFor="rem" className="text-[10px] font-black uppercase text-slate-500 cursor-pointer">Recordarme</Label>
              </div>
              <Link href="/auth/forgot-password" title="Olvide mi clave" className="text-[10px] font-black uppercase text-primary hover:underline">¿Olvidaste tu clave?</Link>
            </div>
            {error && <div className="p-4 bg-red-50 text-red-700 text-xs font-black rounded-2xl border border-red-100 flex items-center gap-3 animate-in fade-in zoom-in duration-300"><AlertCircle size={18} className="shrink-0" /> {error}</div>}
            <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-[0.98] transition-all">
              {loading ? <Loader2 className="animate-spin" /> : "Iniciar Sesión"}
            </Button>
            <div className="text-center pt-2">
              <Link href="/auth/admin" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Panel de Administración</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}