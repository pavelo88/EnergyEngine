'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Pen, Trash2, Check, X } from 'lucide-react';
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasContent, setHasContent] = useState(!!signature);
  const isInitialized = useRef(false);

  // Inicializar canvas cuando se abre el modo pantalla completa
  useEffect(() => {
    if (!isFullScreen || !canvasRef.current) {
      isInitialized.current = false;
      return;
    }

    if (isInitialized.current) return;

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

    // Si ya hay una firma previa, dibujarla en el lienzo nuevo
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

    const start = (e: any) => {
      e.preventDefault();
      setIsDrawing(true);
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e: any) => {
      if (!setIsDrawing) return; // Note: simplified check to avoid complex state tracking during draw
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasContent(true);
    };

    const stop = () => {
      setIsDrawing(false);
      ctx.closePath();
    };

    // Usar listeners directos para mayor control
    canvas.onmousedown = start;
    canvas.onmousemove = (e) => { if (canvas.dataset.drawing === 'true') move(e); };
    canvas.onmouseup = stop;
    canvas.onmouseleave = stop;

    canvas.ontouchstart = start;
    canvas.ontouchmove = (e) => { move(e); };
    canvas.ontouchend = stop;

    // Track drawing state on the DOM element to avoid stale closures
    const obs = new MutationObserver(() => {});
    obs.observe(canvas, { attributes: true });

    isInitialized.current = true;

    return () => {
      canvas.onmousedown = null;
      canvas.onmousemove = null;
      canvas.onmouseup = null;
      canvas.onmouseleave = null;
      canvas.ontouchstart = null;
      canvas.ontouchmove = null;
      canvas.ontouchend = null;
    };
  }, [isFullScreen, signature]);

  // Sincronizar el estado de "isDrawing" con un atributo de datos para que el listener de mousemove lo vea
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.dataset.drawing = isDrawing ? 'true' : 'false';
    }
  }, [isDrawing]);

  const handleSave = () => {
    if (canvasRef.current && hasContent) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSignatureEnd(dataUrl);
    }
    setIsFullScreen(false);
  };

  const handleClear = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasContent(false);
        onSignatureEnd(null);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{title}</label>
      
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

      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4 md:p-10 bg-slate-900/95 backdrop-blur-md border-none">
          <DialogHeader className="text-white mb-4">
            <DialogTitle className="font-black uppercase tracking-tighter text-lg">{title}</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Dibuje su firma en el recuadro blanco y presione "Aceptar" para guardarla.
            </DialogDescription>
          </DialogHeader>

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

          <div className="flex gap-4 mt-6">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
