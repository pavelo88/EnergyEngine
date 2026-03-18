import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, AlertCircle, CornerDownLeft, RefreshCcw } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Input } from "@/components/ui/input";
import { db as dbLocal } from '@/lib/db-local';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

interface PinGateProps {
  userEmail: string;
  onVerified: () => void;
}

export default function PinGate({ userEmail, onVerified }: PinGateProps) {
  const auth = useAuth();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();
  const [mode, setMode] = useState<'setup' | 'verify'>('verify');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkPin = async () => {
      const security = await dbLocal.table('seguridad').get(userEmail);
      if (!security || !security.pinHash) {
        setMode('setup');
      } else {
        setMode('verify');
      }
      setLoading(false);
    };
    checkPin();
  }, [userEmail]);

  const handleAction = async () => {
    if (pin.length !== 4) {
      setError('EL PIN DEBE TENER 4 DÍGITOS');
      return;
    }

    const pinHash = btoa(pin);

    if (mode === 'setup') {
      // 1. Guardar Local
      await dbLocal.table('seguridad').put({
        email: userEmail,
        pinHash: pinHash,
        createdAt: new Date()
      });

      // 2. Guardar en Nube (si hay internet)
      if (isOnline && firestore) {
        try {
          // Intentamos actualizar el documento del usuario con su nuevo PIN
          await updateDoc(doc(firestore, 'usuarios', userEmail), {
            pinHash: pinHash,
            pinUpdatedAt: new Date()
          });
        } catch (e) {
          // Si el documento no existe (raro), lo creamos
          try {
            await setDoc(doc(firestore, 'usuarios', userEmail), {
              email: userEmail,
              pinHash: pinHash,
              createdAt: new Date()
            }, { merge: true });
          } catch (e2) {
            console.error("Error al sincronizar PIN con la nube:", e2);
          }
        }
      }

      toast({ 
        variant: 'glass',
        title: 'SEGURIDAD CONFIGURADA ✓', 
        description: 'Tu PIN ha sido guardado y sincronizado.' 
      });
      onVerified();
    } else {
      const security = await dbLocal.table('seguridad').get(userEmail);
      if (security && security.pinHash === pinHash) {
        onVerified();
      } else {
        setError('PIN INCORRECTO');
        setPin('');
      }
    }
  };

  const handleResetPin = async () => {
    if (!isOnline) {
      toast({ 
        variant: "destructive", 
        title: "SIN CONEXIÓN", 
        description: "Debes estar online para restablecer tu PIN mediante re-autenticación." 
      });
      return;
    }
    
    if (confirm("Para cambiar el PIN o si lo has olvidado, debes cerrar sesión y volver a entrar con tu contraseña de correo.Continuar?")) {
      localStorage.removeItem('energy_engine_session_id');
      await signOut(auth);
      window.location.reload();
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md glass-carbon rounded-[3rem] p-10 shadow-2xl flex flex-col items-center text-center space-y-8 border-white/10">
        <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          {mode === 'setup' ? <ShieldCheck size={40} /> : <Lock size={40} />}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
            {mode === 'setup' ? 'Configurar PIN' : 'Acceso Restringido'}
          </h2>
          <p className="text-slate-400 font-medium text-sm">
            {mode === 'setup' 
              ? 'Introduce un código de 4 dígitos para proteger tus registros en este dispositivo.' 
              : 'Introduce tu código de seguridad para continuar.'}
          </p>
          <div className="mt-4 inline-flex items-center justify-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 w-full max-w-[250px] mx-auto">
            <span className="text-xs font-bold text-slate-300 truncate">{userEmail}</span>
          </div>
        </div>

        <div className="w-full space-y-6">
          <div className="relative">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              autoFocus
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 4) {
                  setPin(val);
                  setError('');
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAction()}
              placeholder="••••"
              className="text-center text-5xl h-24 tracking-[1.5rem] rounded-[2rem] border-2 border-white/10 focus:border-primary bg-black/40 font-black text-white placeholder:text-white/10"
            />
            {error && (
              <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center gap-1 text-red-500 text-xs font-black uppercase">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
             {[1,2,3,4,5,6,7,8,9, 'C', 0, 'OK'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'C') setPin('');
                    else if (key === 'OK') handleAction();
                    else if (pin.length < 4) setPin(pin + key);
                  }}
                  className={`h-16 rounded-2xl flex items-center justify-center font-black text-xl transition-all active:scale-90 shadow-sm
                    ${key === 'OK' ? 'bg-primary text-white col-span-1 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'}
                    ${key === 'C' ? 'text-red-400' : ''}`}
                >
                  {key === 'OK' ? <CornerDownLeft size={24} /> : key}
                </button>
             ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {mode === 'verify' ? (
              <button 
                onClick={handleResetPin}
                className="w-full py-2 text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCcw size={14} /> Olvidé mi PIN / Re-autenticar online
              </button>
            ) : (
                <button 
                  onClick={() => {
                      // Solo si el usuario quiere cancelar el setup de instalación
                      window.location.reload(); 
                  }}
                  className="w-full py-2 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                  Cancelar / Volver
                </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest pt-2">
          energy engine security protocol v1.0
        </p>
      </div>
    </div>
  );
}
