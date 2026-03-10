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

  // Usamos refs para rastrear el estado real enviado al contexto
  const lastTitleSet = useRef<string>('');
  const lastActionSet = useRef<ReactNode | null>(null);

  useEffect(() => {
    // Solo actualizamos si el título es diferente
    if (newTitle !== lastTitleSet.current) {
      context.setTitle(newTitle);
      lastTitleSet.current = newTitle;
    }

    // Solo actualizamos la acción si la referencia ha cambiado
    // Es CRITICO que el llamador use useMemo para el newAction
    if (newAction !== lastActionSet.current) {
      context.setAction(newAction);
      lastActionSet.current = newAction;
    }
  }, [newTitle, newAction, context]);

  return context;
}

export function useAdminHeaderRaw() {
    const context = useContext(AdminHeaderContext);
    if (!context) throw new Error('useAdminHeaderRaw must be used within AdminHeaderProvider');
    return context;
}
