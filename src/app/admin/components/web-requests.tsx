'use client';

import { useAdminHeader } from './AdminHeaderContext';
import { Mail } from 'lucide-react';

export default function WebRequests() {
  useAdminHeader('Solicitudes Web');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-16 rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-6 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200 border border-slate-50">
          <Mail size={40} />
        </div>
        <div className="max-w-md mx-auto">
          <p className="text-slate-900 font-black uppercase text-sm tracking-[0.2em] mb-2">Módulo en Desarrollo</p>
          <p className="text-slate-400 text-xs font-bold leading-relaxed px-4">
            La infraestructura de datos ya está capturando solicitudes en tiempo real desde la landing page. La interfaz de gestión tipo "Excel" será activada en la Etapa 3.
          </p>
        </div>
      </div>
    </div>
  );
}
