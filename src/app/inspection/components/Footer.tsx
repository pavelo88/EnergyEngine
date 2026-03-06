'use client';

import React, { useState } from 'react';
import { Home, Compass, User, Power } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useScreenSize } from '@/hooks/use-screen-size';

export default function Footer() {
  const [activeButton, setActiveButton] = useState('center');
  const router = useRouter();
  const auth = useAuth();
  const screenSize = useScreenSize();

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const handleButtonClick = (button: string) => {
    setActiveButton(button);
  };

  const renderOvalNav = () => (
    <div className="w-full max-w-sm mx-auto bg-slate-800 rounded-full shadow-2xl shadow-slate-900/40 p-3 flex justify-around items-center ring-2 ring-white/10">
      <button onClick={() => handleButtonClick('left')} className={`p-4 rounded-full transition-all duration-300 ${activeButton === 'left' ? 'bg-slate-700' : 'text-slate-400 hover:bg-slate-700/50'}`}>
        <Compass size={24} />
      </button>
      <button onClick={() => handleButtonClick('center')} className={`p-5 rounded-full transition-all duration-300 transform ${activeButton === 'center' ? 'bg-primary text-slate-900 -translate-y-2 shadow-lg shadow-primary/30' : 'text-slate-400 hover:bg-slate-700/50'}`}>
        <Home size={28} />
      </button>
      <button onClick={() => handleButtonClick('right')} className={`p-4 rounded-full transition-all duration-300 ${activeButton === 'right' ? 'bg-slate-700' : 'text-slate-400 hover:bg-slate-700/50'}`}>
        <User size={24} />
      </button>
    </div>
  );

  // --- RENDERIZADO INTELIGENTE ---

  // Para móvil y tablet: solo el óvalo, fijo en la parte inferior.
  if (screenSize !== 'desktop') {
    return (
      <footer className="fixed bottom-0 left-0 w-full px-6 pb-4 text-white z-50">
        {renderOvalNav()}
      </footer>
    );
  }

  // Para escritorio: una barra del color del fondo con el óvalo dentro.
  return (
    <footer className="fixed bottom-0 left-0 w-full py-4 bg-slate-100 border-t border-slate-200 z-50">
      <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
        {/* Contenedor para el avatar y el logout a la izquierda */}
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-primary font-bold text-lg border-2 border-white shadow-md">N</div>
            <button onClick={handleSignOut} className="flex items-center gap-2 text-slate-500 font-semibold hover:text-red-500 transition-colors">
                <Power size={16} />
                <span>Cerrar Sesión</span>
            </button>
        </div>

        {/* El óvalo de navegación va en el centro */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            {renderOvalNav()}
        </div>

        {/* Placeholder a la derecha para mantener el balance */}
        <div className="w-48"></div>
      </div>
    </footer>
  );
}
