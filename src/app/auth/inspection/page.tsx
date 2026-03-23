'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updatePassword,
  signOut,
  deleteUser
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
// Usando tus rutas reales de proyecto
import { useAuth, useFirestore, useUser } from '@/firebase';
import { db as dbLocal } from '@/lib/db-local';
import { Loader2, AlertCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

// --- UTILIDADES CON TIPADO PARA EVITAR ERRORES DE TSC ---
const generateHash = async (text: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const checkIsAuthorized = (userData: any): boolean => {
  if (!userData) return false;
  const adminRoles = ['admin', 'superadmin'];
  let authorized = false;

  if (userData.roles) {
    const rolesArray = Array.isArray(userData.roles) ? userData.roles : Object.values(userData.roles);
    authorized = rolesArray.some((r: any) => {
      const val = typeof r === 'string' ? r : (r?.value || r?.id || '');
      return adminRoles.includes(String(val).toLowerCase().trim());
    });
  }

  if (!authorized && userData.role) {
    if (adminRoles.includes(String(userData.role).toLowerCase().trim())) authorized = true;
  }

  return authorized;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [pendingUserEmail, setPendingUserEmail] = useState<string>('');

  const processingAuthRef = useRef<boolean>(false);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // Carga de email recordado desde tu base de datos local (Dexie)
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const security = await dbLocal.table('seguridad').toArray();
        if (security.length > 0) {
          const lastEmail = security[security.length - 1].email;
          if (isValidEmail(lastEmail)) setEmail(lastEmail);
        }
      } catch (e) { }
    };
    loadSavedEmail();
  }, []);

  // Redirección automática si ya es un administrador logueado
  useEffect(() => {
    if (loading || isUserLoading || showPasswordModal || processingAuthRef.current) return;
    if (!user || !user.email || user.isAnonymous) return;

    const verify = async () => {
      try {
        if (!firestore) return;
        const cleanEmail = user.email!.trim().toLowerCase();
        const userDocRef = doc(firestore, 'usuarios', cleanEmail);
        const userDocSnap = await getDocFromServer(userDocRef);
        if (userDocSnap.exists() && checkIsAuthorized(userDocSnap.data())) {
          router.replace('/admin');
        }
      } catch (e) { }
    };
    verify();
  }, [user, isUserLoading, firestore, router, loading, showPasswordModal]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setPasswordError('Mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError('Las claves no coinciden.'); return; }

    setIsUpdatingPassword(true);
    setPasswordError(null);

    try {
      if (!auth || !firestore) return;
      const currentUser = auth.currentUser;
      const cleanEmail = pendingUserEmail.trim().toLowerCase();

      // Flujo de Registro Real
      if (currentUser?.isAnonymous) {
        await deleteUser(currentUser);
        await createUserWithEmailAndPassword(auth, cleanEmail, newPassword);
      } else if (currentUser) {
        await updatePassword(currentUser, newPassword);
      }

      const userDocRef = doc(firestore, 'usuarios', cleanEmail);
      await updateDoc(userDocRef, {
        forcePasswordChange: false,
        updatedAt: serverTimestamp()
      });

      const hashed = await generateHash(newPassword);
      await dbLocal.table('seguridad').put({
        email: cleanEmail,
        createdAt: new Date(),
        pinHash: hashed
      });

      // Cerramos sesión para que el usuario entre con su identidad real limpia
      await signOut(auth);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setError("¡Administrador registrado! Inicia sesión ahora con tu nueva contraseña.");

    } catch (err: any) {
      console.error(err);
      setPasswordError("Error al registrar la clave. Inténtalo de nuevo.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !auth || !firestore) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) { setError("Email inválido."); return; }

    setError(null);
    setLoading(true);
    processingAuthRef.current = true;

    try {
      // 1. INTENTO DE ACCESO REAL
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        const userDocRef = doc(firestore, 'usuarios', cleanEmail);
        const userDocSnap = await getDocFromServer(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (checkIsAuthorized(userData)) {
            router.replace('/admin');
            return;
          } else {
            await signOut(auth);
            setError("Acceso denegado: No tienes permisos administrativos.");
            setLoading(false);
            processingAuthRef.current = false;
            return;
          }
        }
      } catch (authErr: any) {
        const isCredentialError = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(authErr.code);
        if (!isCredentialError) throw authErr;
      }

      // 2. PUENTE ANÓNIMO (Validación por DNI)
      await signInAnonymously(auth);
      const userDocRef = doc(firestore, 'usuarios', cleanEmail);
      const userDocSnap = await getDocFromServer(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const passMatch = String(userData.dni) === password;
        const authMatch = checkIsAuthorized(userData);

        if (userData.forcePasswordChange && passMatch && authMatch) {
          setPendingUserEmail(cleanEmail);
          setShowPasswordModal(true);
          setLoading(false);
          processingAuthRef.current = false;
          return;
        }
      }

      await signOut(auth);
      setError("Credenciales incorrectas o usuario no registrado.");
    } catch (err: any) {
      console.error(err);
      setError("Error de comunicación con el servidor.");
    } finally {
      setLoading(false);
      processingAuthRef.current = false;
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-900" size={40} />
      </div>
    );
  }

  if (showPasswordModal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-md z-[100]">
        <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl p-4 bg-white border-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black text-slate-900 uppercase">Nueva Clave</CardTitle>
            <CardDescription className="font-bold text-slate-600">{pendingUserEmail}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Contraseña Nueva</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 text-slate-900"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-3 text-slate-400">
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Confirmar Clave</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 text-slate-900"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3 text-slate-400">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertCircle size={14} /> {passwordError}
                </div>
              )}
              <Button type="submit" disabled={isUpdatingPassword} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all">
                {isUpdatingPassword ? <Loader2 className="animate-spin" /> : "Registrar y Salir"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-slate-100">
      <Card className="w-full max-w-sm rounded-[3rem] shadow-2xl bg-white/80 backdrop-blur-2xl border border-white/50 p-4">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-2"><Logo /></div>
          <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Administración</CardTitle>
          <CardDescription className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Gestión de Alta Ingeniería</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Email Corporativo</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl h-14 bg-white border-slate-200 text-slate-900 text-base shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Contraseña o DNI</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-2xl h-14 bg-white border-slate-200 text-slate-900 text-base shadow-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Checkbox id="rem" className="border-slate-400" />
                <Label htmlFor="rem" className="text-[10px] font-black uppercase text-slate-700 cursor-pointer">Recordarme</Label>
              </div>
              <Link href="/auth/forgot-password" title="Olvide mi clave" className="text-[10px] font-black uppercase text-slate-900 hover:underline">
                ¿Olvidaste tu clave?
              </Link>
            </div>
            {error && (
              <div className={`p-4 text-xs font-black rounded-2xl border flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${error.includes('¡Clave') ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
                <AlertCircle size={18} className="shrink-0" /> {error}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all">
              {loading ? <Loader2 className="animate-spin" /> : "Validar y Entrar"}
            </Button>
            <div className="text-center pt-2">
              <Link href="/auth/inspection" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
                Portal de Inspección
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}