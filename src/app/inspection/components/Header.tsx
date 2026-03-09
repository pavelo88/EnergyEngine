'use client';

import React from 'react';
import { ChevronLeft, Download } from 'lucide-react';
import TABS from '../constants';
import { Logo } from '@/components/icons';

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
    <header className="px-6 py-4 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 flex justify-between items-center sticky top-0 z-40 shadow-sm">
      
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button onClick={onBack} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all">
            <ChevronLeft size={20} />
          </button>
        )}
        <span className="font-headline text-slate-800 italic tracking-tighter text-xl">energy engine</span>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${isOnline ? 'bg-emerald-50 border-emerald-500/30 text-emerald-600' : 'bg-red-50 border-red-500/30 text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
        {canInstall && (
            <button onClick={onInstall} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all" title="Instalar aplicación">
                <Download size={14} />
            </button>
        )}
      </div>
    </header>
  );
}
