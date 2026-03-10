'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Pen, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface SignaturePadProps {
  title: string;
  onSignatureEnd: (signature: string | null) => void;
  signature: string | null;
}

export default function SignaturePad({ title, onSignatureEnd, signature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasContent, setHasContent] = useState(!!signature);

  // Inicialización del lienzo con suavizado extremo y fijación de fondo
  useEffect(() => {
    if (!isFullScreen) return;

    const initCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      
      ctx.scale(scale, scale);
      
      // Configuración para trazo suave y redondeado
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a'; // Slate-900
      ctx.lineWidth = 3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);

      contextRef.current = ctx;

      // Cargar firma previa si existe
      if (signature) {
        const img = new Image();
        img.src = signature;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
      }
    };

    // Pequeño delay para asegurar que el DOM del Dialog esté listo
    const timer = setTimeout(initCanvas, 100);
    return () => clearTimeout(timer);
  }, [isFullScreen, signature]);

  const getPos = (e: React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (!contextRef.current) return;
    const pos = getPos(e);
    contextRef.current.beginPath();
    contextRef.current.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || !contextRef.current) return;
    const pos = getPos(e);
    contextRef.current.lineTo(pos.x, pos.y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      contextRef.current?.closePath();
    }
  };

  const handleSave = () => {
    if (canvasRef.current && hasContent) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSignatureEnd(dataUrl);
    }
    setIsFullScreen(false);
  };

  const handleClear = () => {
    if (contextRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      contextRef.current.fillStyle = '#ffffff';
      contextRef.current.fillRect(0, 0, rect.width, rect.height);
      setHasContent(false);
      onSignatureEnd(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{title}</label>
      
      <div 
        onClick={() => setIsFullScreen(true)}
        className={cn(
          "w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden relative group",
          signature ? "bg-white border-solid border-primary/20 shadow-inner" : ""
        )}
        style={{ touchAction: 'none' }}
      >
        {signature ? (
          <img src={signature} alt="Firma guardada" className="max-h-full max-w-full object-contain p-4 transition-transform group-hover:scale-105" />
        ) : (
          <div className="text-center text-slate-400">
            <Pen size={24} className="mx-auto mb-2 opacity-20" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Click para firmar</span>
          </div>
        )}
      </div>

      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4 md:p-6 bg-slate-900 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <DialogHeader className="text-white mb-2">
            <DialogTitle className="font-black uppercase tracking-tighter text-lg">{title}</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Dibuje su firma con precisión. El trazo se guardará automáticamente al pulsar Aceptar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 bg-white rounded-[2rem] relative overflow-hidden touch-none border-4 border-slate-800 shadow-inner">
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="w-full h-full cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />
            {!hasContent && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-100 font-black text-3xl md:text-5xl uppercase tracking-[0.2em]">
                Firme aquí
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-4">
            <Button 
              variant="ghost" 
              className="flex-1 h-14 rounded-2xl bg-white/5 text-white hover:bg-white/10 font-bold"
              onClick={handleClear}
            >
              <Trash2 size={20} className="mr-2" /> LIMPIAR
            </Button>
            <Button 
              className="flex-1 h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-lg shadow-lg active:scale-95 transition-transform"
              onClick={handleSave}
            >
              <Check size={24} className="mr-2" /> ACEPTAR FIRMA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
