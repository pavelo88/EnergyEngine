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
  isStandalone?: boolean;
}

export default function InstallPwaCard({ onInstall, onConfigure, hasSignature, hasPin, isOnline, isStandalone }: InstallPwaCardProps) {
  const isReady = hasSignature && hasPin;

  return (
    <div className="relative group overflow-hidden">
      <div className="glass-card p-10 rounded-[3rem] border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10 transition-all duration-500 hover:border-primary/40">
        <div className="space-y-6 text-center md:text-left">
          <div className="space-y-3">
            <h3 className="text-3xl md:text-4xl font-headline font-black text-slate-950 dark:text-white tracking-tighter uppercase leading-none">
              {isStandalone ? 'App de Inspección Lista' : 'Instalar Terminal Técnica'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-md leading-relaxed">
              {isStandalone 
                ? 'Ya estás utilizando la intranet técnica en su versión nativa. Tus datos se sincronizan automáticamente en tiempo real.' 
                : 'Descarga el terminal de ingeniería en tu dispositivo para realizar informes complejos sin necesidad de conexión.'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="flex items-center gap-2">
                <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all shadow-sm",
                hasPin ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                )}>
                {hasPin ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{hasPin ? 'PIN ACTIVO' : 'PIN PENDIENTE'}</span>
                </div>
                {!hasPin && (
                    <button onClick={onConfigure} className="text-[10px] font-bold text-primary underline underline-offset-4 hover:brightness-125 uppercase tracking-widest">Configurar</button>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all shadow-sm",
                hasSignature ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                )}>
                {hasSignature ? <CheckCircle2 size={16} /> : <PenTool size={16} />}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{hasSignature ? 'FIRMA OK' : 'FIRMA PENDIENTE'}</span>
                </div>
                {!hasSignature && (
                    <button onClick={onConfigure} className="text-[10px] font-bold text-primary underline underline-offset-4 hover:brightness-125 uppercase tracking-widest">Registrar</button>
                )}
            </div>
          </div>
        </div>

        <button
          onClick={isStandalone ? undefined : onInstall}
          disabled={(!isOnline && !isStandalone) || (!hasPin && !isStandalone)}
          className={cn(
            "h-20 px-10 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 group/btn",
            isStandalone
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 cursor-default"
              : !hasPin
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-black/5 dark:border-white/5"
                : isOnline 
                  ? "bg-primary text-white hover:bg-primary/90 shadow-primary/30 hover:-translate-y-1" 
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-black/5 dark:border-white/5"
          )}
        >
          {isStandalone ? <CheckCircle2 size={24} /> : <Download size={24} className="group-hover/btn:translate-y-1 transition-transform" />}
          {isStandalone 
            ? 'APP LISTA ✓' 
            : !hasPin 
              ? 'PIN REQUERIDO' 
              : isReady ? 'INSTALAR AHORA' : 'CONFIGURAR'}
        </button>
      </div>
      
      {/* Decorative background elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
      
      {!isOnline && (
        <p className="mt-6 text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-[0.3em] flex items-center gap-2 px-2">
          <AlertCircle size={12} /> Requiere conexión para la descarga inicial
        </p>
      )}
    </div>
  );
}
