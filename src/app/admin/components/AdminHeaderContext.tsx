'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useRef } from 'react';

interface AdminHeaderContextType {
  title: string;
  setTitle: (title: string) => void;
  action: ReactNode | null;
  setAction: (action: ReactNode | null) => void;
}

const AdminHeaderContext = createContext<AdminHeaderContextType | undefined>(undefined);

export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('Administración');
  const [action, setAction] = useState<ReactNode | null>(null);

  // Memoizamos el valor del contexto para que las funciones setTitle/setAction sean estables
  // y no disparen re-renders innecesarios en los componentes que consumen el contexto.
  const value = useMemo(() => ({
    title,
    setTitle,
    action,
    setAction
  }), [title, action]);

  return (
    <AdminHeaderContext.Provider value={value}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader(newTitle: string, newAction: ReactNode | null = null) {
  const context = useContext(AdminHeaderContext);
  if (!context) throw new Error('useAdminHeader must be used within AdminHeaderProvider');

  const { setTitle, setAction, title, action } = context;

  // Usamos efectos separados para Título y Acción para mayor control
  useEffect(() => {
    if (newTitle !== title) {
      setTitle(newTitle);
    }
  }, [newTitle, title, setTitle]);

  useEffect(() => {
    // Solo actualizamos si la referencia de la acción es distinta
    // Es CRITICO que el componente que llama use useMemo para el action
    if (newAction !== action) {
      setAction(newAction);
    }
  }, [newAction, action, setAction]);

  return context;
}

export function useAdminHeaderRaw() {
    const context = useContext(AdminHeaderContext);
    if (!context) throw new Error('useAdminHeaderRaw must be used within AdminHeaderProvider');
    return context;
}
