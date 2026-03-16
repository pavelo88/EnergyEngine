'use client';

import React from 'react';
import { Download, ShieldCheck, PenTool, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallPwaCardProps {
  onInstall: () => void;
  onConfigure: () => void;
  hasSignature: boolean;
  hasPin: boolean;
  isOnline: boolean;
}

export default function InstallPwaCard({ onInstall, onConfigure, hasSignature, hasPin, isOnline }: InstallPwaCardProps) {
  const isReady = hasSignature && hasPin;

  return (
    <div className="w-full bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl overflow-hidden relative group">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[80px] -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors" />
      
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <Zap size={12} className="text-primary animate-pulse" />
            <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">Módulo Offline Habilitado</span>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Instalar App de Inspección
            </h3>
            <p className="text-slate-400 text-sm font-medium max-w-md">
              Descarga la intranet técnica en tu dispositivo para realizar informes sin necesidad de internet.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2">
                <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                hasPin ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                )}>
                {hasPin ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                <span className="text-[9px] font-black uppercase tracking-widest">{hasPin ? 'PIN CONFIGURADO' : 'PIN PENDIENTE'}</span>
                </div>
                {!hasPin && (
                    <button onClick={onConfigure} className="text-[9px] font-black text-primary underline underline-offset-4 hover:brightness-125">IR A CONFIGURAR</button>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                hasSignature ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                )}>
                {hasSignature ? <CheckCircle2 size={14} /> : <PenTool size={14} />}
                <span className="text-[9px] font-black uppercase tracking-widest">{hasSignature ? 'FIRMA GUARDADA' : 'FIRMA PENDIENTE'}</span>
                </div>
                {!hasSignature && (
                    <button onClick={onConfigure} className="text-[9px] font-black text-primary underline underline-offset-4 hover:brightness-125">IR A CONFIGURAR</button>
                )}
            </div>
          </div>
        </div>

        <button
          onClick={onInstall}
          disabled={!isOnline}
          className={cn(
            "h-16 px-8 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95",
            isOnline 
              ? "bg-primary text-white hover:bg-primary/90 shadow-primary/20" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
          )}
        >
          <Download size={20} />
          {isReady ? 'INSTALAR AHORA' : 'INSTALAR Y CONFIGURAR'}
        </button>
      </div>
      
      {!isOnline && (
        <p className="mt-4 text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={12} /> Requiere conexión para la descarga inicial
        </p>
      )}
    </div>
  );
}
