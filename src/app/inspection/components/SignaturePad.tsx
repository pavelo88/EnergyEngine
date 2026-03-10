'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Pen, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  title: string;
  onSignatureEnd: (signature: string | null) => void;
  signature: string | null;
}

export default function SignaturePad({ title, onSignatureEnd, signature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasContent, setHasContent] = useState(!!signature);

  // Inicializar canvas cuando se abre el modo pantalla completa
  useEffect(() => {
    if (!isFullScreen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuración de alta resolución
    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    ctx.scale(scale, scale);

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    // Si ya hay una firma, dibujarla para editar o visualizar
    if (signature) {
      const img = new Image();
      img.src = signature;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
    }

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      return { x: clientX - r.left, y: clientY - r.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasContent(true);
    };

    const stop = () => {
      setIsDrawing(false);
      ctx.closePath();
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', stop);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', stop);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', stop);
    };
  }, [isFullScreen, signature, isDrawing]);

  const handleSave = () => {
    if (canvasRef.current && hasContent) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSignatureEnd(dataUrl);
    }
    setIsFullScreen(false);
  };

  const handleClear = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasContent(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{title}</label>
      
      {/* Área de visualización previa */}
      <div 
        onClick={() => setIsFullScreen(true)}
        className={cn(
          "w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden",
          signature ? "bg-white border-solid border-primary/30" : ""
        )}
      >
        {signature ? (
          <img src={signature} alt="Firma" className="max-h-full max-w-full object-contain p-4" />
        ) : (
          <div className="text-center text-slate-400">
            <Pen size={24} className="mx-auto mb-2 opacity-20" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Tocar para firmar</span>
          </div>
        )}
      </div>

      {/* Interfaz de firma a pantalla completa */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col p-4 md:p-10 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl mx-auto flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center text-white">
              <h3 className="font-black uppercase tracking-tighter text-lg">{title}</h3>
              <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-grow bg-white rounded-[2rem] shadow-2xl relative overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
              />
              {!hasContent && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-200 font-black text-xl uppercase tracking-[0.2em] opacity-50">
                  Firme aquí
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button 
                variant="ghost" 
                className="flex-1 h-16 rounded-2xl bg-white/5 text-white hover:bg-white/10 font-bold"
                onClick={handleClear}
              >
                <Trash2 size={20} className="mr-2" /> LIMPIAR
              </Button>
              <Button 
                className="flex-1 h-16 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-lg shadow-xl shadow-primary/20"
                onClick={handleSave}
              >
                <Check size={24} className="mr-2" /> ACEPTAR FIRMA
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
