
'use client';

import { useState } from 'react';
import { Mail, Search, Info } from 'lucide-react';

export default function WebRequests() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Solicitudes Web</h1>
          <p className="mt-1 text-slate-600">Gestiona los requerimientos técnicos recibidos desde la página principal.</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-100 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
          <Mail size={32} />
        </div>
        <div>
          <p className="text-slate-900 font-black uppercase text-sm">Módulo en Desarrollo</p>
          <p className="text-slate-400 text-xs font-bold leading-relaxed px-4 mt-1">
            La infraestructura de datos ya está capturando solicitudes en tiempo real. La interfaz de gestión tipo "Excel" será implementada en la Etapa 3.
          </p>
        </div>
      </div>
    </div>
  );
}
