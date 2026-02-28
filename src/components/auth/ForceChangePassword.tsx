'use client';

import { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

interface ForceChangePasswordProps {
  onPasswordChanged: () => void;
}

export default function ForceChangePassword({ onPasswordChanged }: ForceChangePasswordProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    if (!user || !user.email || !firestore) {
      setError('Error de autenticación o de conexión a la base de datos. Por favor, inicia sesión de nuevo.');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(user, newPassword);

      // After successfully updating in Auth, update the flag in Firestore.
      const userDocRef = doc(firestore, 'usuarios', user.email);
      await updateDoc(userDocRef, {
        forcePasswordChange: false,
      });
      
      alert('¡Contraseña actualizada con éxito!');
      onPasswordChanged(); // Notify layout to re-render content

    } catch (error: any) {
      console.error("Error updating password: ", error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Esta operación es sensible y requiere un inicio de sesión reciente. Por favor, vuelve a iniciar sesión.');
      } else {
        setError('No se pudo actualizar la contraseña. Contacta a soporte.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck size={32}/>
        </div>
        <h1 className="text-3xl font-bold text-slate-800">Crea tu Contraseña</h1>
        <p className="text-slate-500">
          Por seguridad, establece una nueva contraseña para tu cuenta.
        </p>
        <form onSubmit={handleSetPassword} className="w-full space-y-4 pt-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              required 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva Contraseña" 
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" 
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              required 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar Nueva Contraseña" 
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" 
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Establecer y Continuar
          </button>
        </form>
      </div>
    </div>
  );
}
