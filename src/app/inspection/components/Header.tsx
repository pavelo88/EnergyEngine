'use client';

import React from 'react';
import { ChevronLeft, Download } from 'lucide-react';
import TABS from '../constants';

interface HeaderProps {
  activeTab: string;
  isOnline: boolean;
  onBack: () => void;
  isSubNavActive: boolean;
  onInstall: () => void;
  canInstall: boolean;
}

export default function Header({ activeTab, isOnline, onBack, isSubNavActive, onInstall, canInstall }: HeaderProps) {
  const showBackButton = activeTab !== TABS.MENU || isSubNavActive;

  return (
    <header className="fixed top-0 left-0 w-full px-6 bg-slate-900 border-b border-white/5 flex justify-between items-center z-50 shadow-2xl h-16">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button 
            onClick={onBack} 
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex flex-col leading-none">
          <span className="font-headline text-white italic tracking-tighter text-xl font-black">energy engine</span>
          <span className="text-[8px] font-black text-white/40 tracking-[0.2em] uppercase -mt-0.5">INTRANET TÉCNICA</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black border transition-all duration-500 ${isOnline ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-red-500/30 text-red-400 bg-red-500/5'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
            {isOnline ? 'CONECTADO' : 'SIN RED'}
        </div>
        {canInstall && (
            <button 
              onClick={onInstall} 
              className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-all" 
            >
                <Download size={14} />
            </button>
        )}
      </div>
    </header>
  );
}
