'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';

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

/**
 * Hook básico para acceder al contexto sin lógica adicional
 */
export function useAdminHeaderRaw() {
  const context = useContext(AdminHeaderContext);
  if (!context) throw new Error('useAdminHeaderRaw must be used within AdminHeaderProvider');
  return context;
}

/**
 * Hook declarativo para actualizar el Header desde cualquier página
 */
export function useAdminHeader(newTitle: string, newAction: ReactNode | null = null) {
  const { setTitle, setAction, title, action } = useAdminHeaderRaw();

  // 1. Sincronizar el título solo si es diferente al actual
  useEffect(() => {
    if (newTitle !== title) {
      setTitle(newTitle);
    }
  }, [newTitle, title, setTitle]);

  // 2. Sincronizar la acción solo si la referencia ha cambiado
  useEffect(() => {
    if (newAction !== action) {
      setAction(newAction);
    }
  }, [newAction, action, setAction]);

  /**
   * NOTA IMPORTANTE: Se ha eliminado la limpieza (setAction(null)) 
   * de este hook porque en Next.js, al navegar rápidamente, 
   * el desmontaje de una página chocaba con el montaje de la siguiente,
   * provocando el error de profundidad máxima de actualización.
   */
}