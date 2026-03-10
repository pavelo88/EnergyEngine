'use client';

import React, { useRef, useState, useEffect } from 'react';
import { User, PenTool, Trash2, Save, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

export default function ProfileTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const auth = useAuth();

  // Cargar firma previa si existe
  useEffect(() => {
    const stored = localStorage.getItem('energy_engine_signature');
    if (stored) setSavedSignature(stored);
  }, []);

  // --- LÓGICA DE DIBUJO (MOUSE Y TOUCH) ---
  const startDrawing = (e: any) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
    setIsDrawing(false);
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar coordenadas para Mouse o Touch de forma segura para TypeScript
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a'; // Slate-900

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSignature(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    const base64 = canvasRef.current.toDataURL('image/png');
    localStorage.setItem('energy_engine_signature', base64);
    setSavedSignature(base64);
    alert("Firma guardada correctamente en el dispositivo.");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TARJETA DE USUARIO */}
      <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
          <User size={32} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspector RTS Conectado</p>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {auth.currentUser?.displayName?.toUpperCase() || auth.currentUser?.email?.split('@')[0].toUpperCase() || 'TÉCNICO ENERGY'}
          </h2>
          <p className="text-sm font-medium text-slate-500">{auth.currentUser?.email}</p>
        </div>
      </section>

      {/* SECCIÓN DE FIRMA BIOMÉTRICA */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
            <PenTool size={18} className="text-primary" /> Firma del Inspector
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
            width={600}
            height={300}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onTouchStart={startDrawing}
            onTouchEnd={stopDrawing}
            onTouchMove={draw}
            className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-crosshair touch-none"
          />
          {!hasSignature && !savedSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-bold uppercase tracking-widest">
              Dibuje su firma aquí
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
            <Save size={16} className="text-primary" /> GUARDAR FIRMA
          </button>
        </div>

        {savedSignature && (
          <div className="pt-4 border-t border-slate-50 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Vista previa guardada:</p>
            <img src={savedSignature} alt="Firma Guardada" className="h-16 mx-auto opacity-70 grayscale" />
          </div>
        )}
      </section>

      {/* BOTÓN DE CIERRE DE SESIÓN */}
      <button 
        onClick={() => signOut(auth)}
        className="w-full p-6 flex items-center justify-center gap-3 text-red-500 font-black text-xs uppercase tracking-widest bg-red-50 rounded-[2rem] border border-red-100 hover:bg-red-100 transition-colors"
      >
        <LogOut size={18} /> Finalizar Jornada / Salir
      </button>
    </div>
  );
}
