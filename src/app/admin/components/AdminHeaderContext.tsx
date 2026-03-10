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

  // Usamos refs para evitar actualizaciones innecesarias que causen bucles
  const lastTitle = useRef('');
  const lastAction = useRef<ReactNode | null>(null);

  useEffect(() => {
    if (lastTitle.current !== newTitle) {
      context.setTitle(newTitle);
      lastTitle.current = newTitle;
    }
    
    // Solo actualizamos la acción si es estrictamente diferente
    // Nota: El componente que llama debe usar useMemo para el action
    if (lastAction.current !== newAction) {
      context.setAction(newAction);
      lastAction.current = newAction;
    }
  }, [newTitle, newAction, context]);

  return context;
}

export function useAdminHeaderRaw() {
    const context = useContext(AdminHeaderContext);
    if (!context) throw new Error('useAdminHeaderRaw must be used within AdminHeaderProvider');
    return context;
}
