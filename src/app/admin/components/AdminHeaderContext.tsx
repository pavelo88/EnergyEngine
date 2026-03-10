'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';

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

  return (
    <AdminHeaderContext.Provider value={{ title, setTitle, action, setAction }}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader(newTitle: string, newAction: ReactNode | null = null) {
  const context = useContext(AdminHeaderContext);
  if (!context) throw new Error('useAdminHeader must be used within AdminHeaderProvider');

  // Usamos un efecto para sincronizar el encabezado con la sección activa
  useEffect(() => {
    // Solo actualizamos si el título es diferente para evitar ciclos
    if (newTitle !== context.title) {
      context.setTitle(newTitle);
    }

    // Solo actualizamos la acción si la referencia ha cambiado
    // Es CRITICO que el componente que llama use useMemo para el action
    if (newAction !== context.action) {
      context.setAction(newAction);
    }
  }, [newTitle, newAction, context]);

  return context;
}

export function useAdminHeaderRaw() {
    const context = useContext(AdminHeaderContext);
    if (!context) throw new Error('useAdminHeaderRaw must be used within AdminHeaderProvider');
    return context;
}
