'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Pen, Trash2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!isDialogOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- High-resolution canvas setup ---
    const scale = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    ctx.scale(scale, scale);
    
    if (signature) {
        const img = new Image();
        img.src = signature;
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width / scale, canvas.height / scale);
    }

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    let lastPoint: { x: number, y: number } | null = null;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      lastPoint = getPos(e);
    };

    const end = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      setIsDrawing(false);
      lastPoint = null;
      ctx.beginPath();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || !lastPoint) return;
      e.preventDefault();
      const currentPoint = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
      lastPoint = currentPoint;
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchmove', draw, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchend', end);
      canvas.removeEventListener('touchmove', draw);
    };
  }, [isDialogOpen, signature]);

  const handleSave = () => {
    if (canvasRef.current) {
        // Only update if canvas is not blank
        if (!canvasRef.current.toDataURL().includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA+gAAAEsCAYAAADR74/OAAABiklEQVR4Xu3BMQEAAADCoPVPbQwfoAAAAAAAAAAAA')) {
            onSignatureEnd(canvasRef.current.toDataURL('image/png'));
        }
        setIsDialogOpen(false);
    }
  };
  
  const handleClearAndClose = () => {
    onSignatureEnd(null);
    setIsDialogOpen(false);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className="space-y-2 cursor-pointer group">
            <label className="text-sm font-bold text-slate-600">{title}</label>
            <div className={cn(
                "w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center transition-colors group-hover:border-primary",
                signature ? 'p-4' : ''
            )}>
                {signature ? (
                    <img src={signature} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                    <div className="text-center text-slate-400">
                        <Pen size={24} className="mx-auto mb-2" />
                        <span className="text-xs font-bold uppercase">Tocar para firmar</span>
                    </div>
                )}
            </div>
        </div>
      </DialogTrigger>
      <DialogContent 
        className="p-0 m-0 w-screen h-screen max-w-none md:h-[80vh] md:w-[90vw] md:max-w-4xl rounded-none md:rounded-2xl flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-row items-center justify-between p-4 border-b bg-slate-50 rounded-t-2xl">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={handleClearAndClose}><Trash2 size={16}/> Borrar firma</Button>
            <Button size="sm" onClick={handleSave}><Check size={16} /> Guardar y Cerrar</Button>
          </div>
        </DialogHeader>
        <div className="flex-grow bg-slate-100 p-2 md:p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-full bg-white rounded-lg shadow-inner cursor-crosshair touch-none overscroll-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
