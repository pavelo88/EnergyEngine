'use client';

import React from 'react';
import { ChevronLeft, Download, Check } from 'lucide-react';
import TABS from '../constants';
import { cn } from '@/lib/utils';

interface HeaderProps {
  activeTab: string;
  isOnline: boolean;
  onBack: () => void;
  isSubNavActive: boolean;
  onInstall: () => void;
  canInstall: boolean;
  isStandalone?: boolean;
}

export default function Header({ activeTab, isOnline, onBack, isSubNavActive, onInstall, canInstall, isStandalone }: HeaderProps) {
  // El usuario solicitó que el botón de la flechita (atrás) esté siempre visible.
  const showBackButton = true;

  return (
    <header className="fixed top-0 left-0 w-full px-6 bg-slate-950 flex justify-between items-center z-50 h-20 border-b border-white/10 shadow-2xl">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button 
            onClick={onBack} 
            className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95 shadow-md"
            aria-label="Volver"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        <div className="flex flex-col leading-none">
          <div className="font-headline italic tracking-tighter text-3xl font-black">
            <span className="text-white">energy</span>
            <span className="text-primary ml-1">engine</span>
          </div>
          <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mt-1">INTRANET TÉCNICA</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black border transition-all duration-500 shadow-inner",
            isOnline 
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" 
                : "border-red-500/30 text-red-400 bg-red-500/10"
        )}>
            <div className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
            )} />
            <span className="hidden sm:inline">{isOnline ? 'CONECTADO' : 'SIN RED'}</span>
            <span className="sm:hidden">{isOnline ? 'ON' : 'OFF'}</span>
        </div>
        {isStandalone ? (
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-lg" title="App Descargada">
            <Check size={20} />
          </div>
        ) : (
          <button 
            onClick={onInstall} 
            className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/30 hover:bg-primary/30 transition-all active:scale-95 shadow-lg" 
            title="Instalar App (PWA)"
          >
            <Download size={20} />
          </button>
        )}
      </div>
    </header>
  );
}