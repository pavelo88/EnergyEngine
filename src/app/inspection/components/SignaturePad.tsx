'use client';

import React, { useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface SignaturePadProps {
  title: string;
  onSignatureEnd: (signature: string | null) => void;
}

export default function SignaturePad({ title, onSignatureEnd }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawing = false;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      drawing = true;
      draw(e);
    };

    const end = () => {
      if (drawing) {
        drawing = false;
        ctx.beginPath();
        onSignatureEnd(canvas.toDataURL('image/png'));
      }
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
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
  }, [onSignatureEnd]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      onSignatureEnd(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-600">{title}</label>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-crosshair touch-none"
      />
      <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-red-500 font-bold hover:underline">
        <Trash2 size={12} /> Limpiar
      </button>
    </div>
  );
}
