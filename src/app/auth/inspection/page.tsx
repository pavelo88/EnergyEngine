'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  updatePassword,
  signOut
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
import {
  normalizeInspectionEmail,
  setInspectionMode,
  setStoredOfflineEmail
} from '@/lib/inspection-mode';

// 1. SEGURIDAD: Función Hash para el modo Offline
const generateHash = async (text: string) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 2. SEGURIDAD: Validación de roles BLINDADA (Soporta Arrays y Objetos)
const checkIsAuthorizedInspector = (userData: any) => {
  if (!userData) return false;

  let rolesArray: any[] = [];

  // Extraer roles sin importar el formato (soporta lo que vimos en tu captura)
  if (Array.isArray(userData.roles)) {
    rolesArray = userData.roles;
  } else if (userData.roles && typeof userData.roles === 'object') {
    rolesArray = Object.values(userData.roles);
  } else if (typeof userData.roles === 'string') {
    rolesArray = userData.roles.split(',');
  }

  // También revisamos si existe el campo singular 'role'
  if (userData.role) rolesArray.push(userData.role);

  return rolesArray.some((r: any) => {
    const val = typeof r === 'string' ? r : (r?.value || r?.id || '');
    return String(val).toLowerCase().trim() === 'inspector';
  });
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

  // Cargar último email guardado para conveniencia
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

  // Protección pasiva y redirección
  useEffect(() => {
    if (loading || isUserLoading || showPasswordModal) return;
    if (!user || !user.email) return;

    let isMounted = true;
    const verifyAndRedirect = async () => {
      try {
        const cleanEmail = user.email!.trim().toLowerCase();
        const userDocRef = doc(firestore!, 'usuarios', cleanEmail);
        const userDocSnap = await getDocFromServer(userDocRef);

        if (userDocSnap.exists() && isMounted) {
          const userData = userDocSnap.data();

          if (!checkIsAuthorizedInspector(userData)) {
            if (auth) await signOut(auth);
            setError("No tienes permisos de inspector.");
            return;
          }

          if (userData.forcePasswordChange) {
            setPendingUserEmail(cleanEmail);
            setShowPasswordModal(true);
            return;
          }

          router.replace('/inspection');
        }
      } catch (error) {
        console.error("Error en verificación pasiva:", error);
      }
    };

    if (navigator.onLine) verifyAndRedirect();
    return () => { isMounted = false; };
  }, [user, isUserLoading, router, firestore, showPasswordModal, auth, loading]);


  // --- ACTUALIZACIÓN DE CLAVE (NATIVA + ACTUALIZACIÓN DEXIE) ---
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) { setPasswordError('Mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError('Las claves no coinciden.'); return; }

    setIsUpdatingPassword(true);

    try {
      if (auth!.currentUser) {
        await updatePassword(auth!.currentUser, newPassword);
      }

      const userDocRef = doc(firestore!, 'usuarios', pendingUserEmail);
      await updateDoc(userDocRef, { forcePasswordChange: false, updatedAt: serverTimestamp() });

      // IMPORTANTE: Actualizar el Hash local para que la nueva clave funcione Offline
      const hashedNewPassword = await generateHash(newPassword);
      await dbLocal.table('seguridad').put({
        email: pendingUserEmail,
        createdAt: new Date(),
        pinHash: hashedNewPassword
      });

      setStoredOfflineEmail(pendingUserEmail);
      setInspectionMode('online');
      setShowPasswordModal(false);
      router.replace('/inspection');
    } catch (err: any) {
      setPasswordError(err.message || 'Error al actualizar contraseña.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  // --- LOGIN PRINCIPAL ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // A. FLUJO OFFLINE
    if (!navigator.onLine) {
      try {
        const security = await dbLocal.table('seguridad').get(cleanEmail);
        if (!security) { setError('Inicia sesión con internet primero.'); return; }

        const inputHash = await generateHash(password);
        if (security.pinHash === inputHash) {
          setStoredOfflineEmail(cleanEmail);
          setInspectionMode('offline');
          router.replace('/inspection');
        } else {
          setError('Contraseña incorrecta (Modo Offline).');
        }
      } catch (err) { setError('Error en datos locales.'); }
      return;
    }

    // B. FLUJO ONLINE
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth!, cleanEmail, password);

      const userDocRef = doc(firestore!, 'usuarios', cleanEmail);
      const userDocSnap = await getDocFromServer(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        if (!checkIsAuthorizedInspector(userData)) {
          await signOut(auth!);
          // Mensaje con debug para ver qué está leyendo si falla
          setError("Acceso denegado. Roles: " + JSON.stringify(userData.roles));
          setLoading(false);
          return;
        }

        if (userData.forcePasswordChange) {
          setPendingUserEmail(cleanEmail);
          setShowPasswordModal(true);
          setLoading(false);
          return;
        }

        // ÉXITO: Guardamos Hash local para futuras sesiones offline
        const currentHash = await generateHash(password);
        await dbLocal.table('seguridad').put({
          email: cleanEmail,
          createdAt: new Date(),
          pinHash: currentHash
        });

        setStoredOfflineEmail(cleanEmail);
        setInspectionMode('online');
        router.replace('/inspection');
      }
    } catch (err: any) {
      setError('Credenciales incorrectas o sin permiso.');
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || (user && !showPasswordModal)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
      </div>
    );
  }

  // --- RENDER MODAL ---
  if (showPasswordModal) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent relative z-10 p-4">
        <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl bg-white/90 backdrop-blur-xl border border-white/50 p-2">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-black text-slate-900">Nueva clave</CardTitle>
            <CardDescription className="text-slate-600 text-xs">Para: {pendingUserEmail}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest px-1">Nueva Contraseña</Label>
                <div className="relative">
                  <Input type={showNewPassword ? 'text' : 'password'} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl h-12 pr-10" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 text-slate-400">{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest px-1">Confirmar</Label>
                <div className="relative">
                  <Input type={showConfirmPassword ? 'text' : 'password'} required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="rounded-xl h-12 pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 text-slate-400">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              {passwordError && <div className="text-[10px] font-bold text-red-600 p-2 bg-red-50 rounded-lg">{passwordError}</div>}
              <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest text-xs rounded-xl bg-slate-900 text-white" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? <Loader2 className="animate-spin" /> : 'Guardar y Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- RENDER LOGIN ---
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10 bg-transparent">
      <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl bg-white/95 backdrop-blur-xl border border-white p-4 animate-in fade-in zoom-in duration-500">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto mb-2 flex justify-center"><Logo /></div>
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase font-headline">Portal Inspector</CardTitle>
          <CardDescription className="text-slate-500 font-medium text-xs">Inspección Técnica Operativa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-800 font-black uppercase text-[10px] tracking-widest px-1">Email</Label>
              <Input type="email" placeholder="inspector@energyengine.es" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-100/50 border-slate-200 text-slate-900 rounded-xl h-12 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800 font-black uppercase text-[10px] tracking-widest px-1">Contraseña o PIN</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-100/50 border-slate-200 text-slate-900 rounded-xl h-12 pr-10 font-medium" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] px-1 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox id="remember-me" className="border-slate-300 rounded-[4px] data-[state=checked]:bg-slate-900" />
                <Label htmlFor="remember-me" className="text-slate-600 font-bold uppercase tracking-widest cursor-pointer">Recordarme</Label>
              </div>
              <Link href="/auth/forgot-password" size="sm" className="text-slate-600 font-bold uppercase tracking-widest hover:text-slate-900 transition-colors">¿Olvidaste tu clave?</Link>
            </div>

            {error && (<div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] font-bold text-red-600 animate-in fade-in zoom-in duration-300"><AlertCircle className="h-4 w-4 shrink-0" /><p>{error}</p></div>)}

            <Button type="submit" className="w-full h-14 font-black uppercase tracking-widest text-xs rounded-xl bg-slate-900 text-white shadow-xl active:scale-[0.98] transition-all" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Iniciar Sesión'}
            </Button>

            <div className="pt-2 text-center">
              <Link href="/auth/admin" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors">Ir al Panel de Administración</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}