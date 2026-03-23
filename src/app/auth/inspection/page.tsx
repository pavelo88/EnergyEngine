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
// Usando tus hooks y utilidades reales del proyecto
import { useAuth, useUser, useFirestore } from '@/firebase';
import { db as dbLocal } from '@/lib/db-local';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

// --- UTILIDADES CON TIPADO ESTRICTO ---

const generateHash = async (text: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * VALIDACIÓN ESTRICTA DE ROLES
 * Bloquea cualquier acceso que no sea admin o superadmin.
 */
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

// --- COMPONENTE PRINCIPAL ---

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

  // Estados de Modal (Nueva Clave)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState('');

  const processingAuthRef = useRef(false);

  // Carga de email recordado desde Dexie local
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const security = await dbLocal.table('seguridad').toArray();
        if (security.length > 0) {
          const lastEmail = security[security.length - 1].email;
          if (lastEmail) setEmail(lastEmail);
        }
      } catch (e) { }
    };
    loadSavedEmail();
  }, []);

  // Redirección automática si ya es admin real
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

      // Transición limpia de Anónimo a Real
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
      setError("¡Clave actualizada! Por seguridad, inicia sesión con tu nueva contraseña.");

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
    setError(null);
    setLoading(true);
    processingAuthRef.current = true;

    try {
      // 1. INTENTO DE ACCESO CON IDENTIDAD REAL
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
            setError("Acceso denegado: No tienes el rol de administrador.");
            return;
          }
        }
      } catch (authErr: any) {
        const isCredentialError = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(authErr.code);
        if (!isCredentialError) {
          setError("Error de autenticación con el servidor.");
          return;
        }
      }

      // 2. PUENTE ANÓNIMO (DNI) - SOLO PARA ADMINS
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
          return;
        }
      }

      await signOut(auth);
      setError("Credenciales incorrectas o acceso no autorizado.");
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
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-900" size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-slate-200 relative overflow-hidden">

      {/* Modal Nueva Clave */}
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl z-[100]">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Nueva Clave Admin</h2>
              <p className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{pendingUserEmail}</p>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Clave Nueva</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-2xl h-12 bg-slate-50 border border-slate-200 px-4 text-slate-900 font-bold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-3 text-slate-400">
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Confirmar Clave</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="rounded-2xl h-12 bg-slate-50 border border-slate-200 px-4 text-slate-900 font-bold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3 text-slate-400">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {passwordError && <p className="text-red-700 text-[10px] font-black uppercase bg-red-50 p-2 rounded-xl text-center">{passwordError}</p>}
              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center"
              >
                {isUpdatingPassword ? <Loader2 className="animate-spin" /> : "Registrar y Salir"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Login Principal */}
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl p-10 space-y-8 border-4 border-white relative z-10">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] mx-auto flex items-center justify-center text-white shadow-2xl">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Admin Portal</h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Gestión de Ingeniería</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Email Corporativo</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl h-14 border-2 border-slate-100 bg-white px-5 text-slate-900 font-bold focus:border-slate-900 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900 ml-1">Contraseña o DNI</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl h-14 border-2 border-slate-100 bg-white px-5 text-slate-900 font-bold focus:border-slate-900 outline-none transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-4 text-slate-400">
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Checkbox id="rem" className="w-4 h-4 rounded border-slate-300" />
              <Label htmlFor="rem" className="text-[10px] font-black uppercase text-slate-700 cursor-pointer">Recordarme</Label>
            </div>
            <a href="#" className="text-[10px] font-black uppercase text-slate-900 hover:underline">¿Ayuda?</a>
          </div>

          {error && (
            <div className={`p-4 rounded-2xl border-2 text-[10px] font-black flex items-center gap-3 animate-in fade-in duration-300 ${error.includes('actualizada') ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
              <AlertCircle size={20} className="shrink-0" /> {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Validar y Entrar"}
          </Button>
        </form>

        <div className="text-center pt-2">
          <Link href="/auth/inspection" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">Portal Inspector</Link>
        </div>
      </div>
    </div>
  );
}