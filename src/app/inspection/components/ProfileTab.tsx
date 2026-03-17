
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { User, PenTool, Trash2, Save, CheckCircle2, LogOut, WifiOff, FileText } from 'lucide-react';
import { useAuth, useFirestore as useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ProfileTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [jobCount, setJobCount] = useState(0);

  const auth = useAuth();
  const db = useFirebase();
  const isOnline = useOnlineStatus();

  // Cargar firma previa y estadísticas si existe
  useEffect(() => {
    const stored = localStorage.getItem('energy_engine_signature');
    if (stored) setSavedSignature(stored);

    if (auth.currentUser?.email && db) {
      const q = query(collection(db, "informes"), where("inspectorId", "==", auth.currentUser.email));
      getDocs(q).then(snap => setJobCount(snap.size)).catch(console.error);
    }
  }, [auth.currentUser, db]);

  // --- CONFIGURACIÓN DE ALTA RESOLUCIÓN PARA EL CANVAS ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * scale) {
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      ctx.scale(scale, scale);

      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const stopDrawing = (e?: any) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();

    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setHasSignature(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      setHasSignature(false);
    }
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    if (!hasSignature) {
      alert("Por favor, dibuja una firma antes de guardar.");
      return;
    }
    const base64 = canvasRef.current.toDataURL('image/png');
    localStorage.setItem('energy_engine_signature', base64);
    setSavedSignature(base64);
    alert("Firma guardada correctamente en el dispositivo.");
  };

  const handleLogout = async () => {
    if (!isOnline) {
      alert("AVISO CRÍTICO: No puedes cerrar sesión mientras estás sin conexión. Si sales ahora, no podrás volver a entrar hasta recuperar el internet.");
      return;
    }
    if (confirm("�Est�s seguro de que deseas cerrar sesi�n? Aseg�rate de haber guardado todos tus trabajos.")) {
      localStorage.removeItem('energy_engine_session_id');
      await signOut(auth);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico RTS Registrado</p>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {auth.currentUser?.displayName?.toUpperCase() || auth.currentUser?.email?.split('@')[0].toUpperCase() || 'T�CNICO ENERGY'}
            </h2>
            <p className="text-sm font-medium text-slate-500">{auth.currentUser?.email}</p>
          </div>
        </section>

        <section className="bg-slate-900 p-6 rounded-[2rem] shadow-lg flex items-center gap-4 text-white">
          <div className="w-16 h-16 bg-white/10 text-primary rounded-2xl flex items-center justify-center">
            <FileText size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Trabajos Completados</p>
            <h2 className="text-4xl font-black tracking-tight leading-none">{jobCount}</h2>
            <p className="text-[9px] font-bold text-primary uppercase mt-1">Informes Sincronizados</p>
          </div>
        </section>
      </div>

      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
            <PenTool size={18} className="text-primary" /> Firma Digital
          </h3>
          {savedSignature && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <CheckCircle2 size={12} /> CONFIGURADA
            </span>
          )}
        </div>

        <div className="relative group">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onMouseMove={draw}
            onTouchStart={startDrawing}
            onTouchEnd={stopDrawing}
            onTouchMove={draw}
            className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-crosshair touch-none"
          />
          {!hasSignature && !savedSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-bold uppercase tracking-widest">
              Firme aquí para reportes
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={clearCanvas}
            className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl font-bold text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all text-xs"
          >
            <Trash2 size={16} /> LIMPIAR
          </button>
          <button
            onClick={saveSignature}
            className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl font-black text-white bg-slate-900 shadow-lg active:scale-95 transition-all text-xs"
          >
            <Save size={16} className="text-primary" /> GUARDAR
          </button>
        </div>
      </section>

      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Energy Engine Security Protocol</p>
        <p className="text-[9px] font-bold text-slate-300 uppercase">Dispositivo Autorizado por {auth.currentUser?.email}</p>
      </div>
    </div>
  );
}
