'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasContent, setHasContent] = useState(!!signature);

  // Inicializar canvas cuando se abre el modo pantalla completa
  useEffect(() => {
    if (!isFullScreen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.parentElement?.getBoundingClientRect() || { width: 800, height: 400 };
    
    // Configuración de alta resolución
    const scale = window.devicePixelRatio || 1;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;

    // Restaurar firma previa si existe
    if (signature) {
      const img = new Image();
      img.src = signature;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
    }
  }, [isFullScreen, signature]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasContent(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.closePath();
      setIsDrawing(false);
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
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
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
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-4 md:p-6 bg-slate-900 border-none">
          <DialogHeader className="text-white mb-2">
            <DialogTitle className="font-black uppercase tracking-tighter text-lg">{title}</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Dibuje su firma en el recuadro blanco de forma clara.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 bg-white rounded-3xl relative overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair"
            />
            {!hasContent && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-200 font-black text-xl uppercase tracking-[0.2em] opacity-50">
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
              className="flex-1 h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-lg"
              onClick={handleSave}
            >
              <Check size={24} className="mr-2" /> ACEPTAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
