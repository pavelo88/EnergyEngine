'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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

  useEffect(() => {
    context.setTitle(newTitle);
    context.setAction(newAction);
    
    // Al desmontar el componente, limpiamos la acción
    return () => {
      context.setAction(null);
    };
  }, [newTitle, newAction, context.setTitle, context.setAction]);

  return context;
}

export function useAdminHeaderRaw() {
    const context = useContext(AdminHeaderContext);
    if (!context) throw new Error('useAdminHeaderRaw must be used within AdminHeaderProvider');
    return context;
}
