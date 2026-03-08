import { ClipboardList, Activity, Receipt, User } from 'lucide-react';

// 1. Objeto para acceso rápido (Evita el error de 'undefined')
export const TABS = {
  MENU: 'menu',
  TASKS: 'home',
  NEW_INSPECTION: 'new',
  EXPENSES: 'expenses',
  PROFILE: 'profile'
};

// 2. Lista para renderizar menús
export const TAB_LIST = [
  { 
    id: TABS.TASKS, 
    label: 'Tareas', 
    icon: ClipboardList, 
    color: 'bg-blue-600', 
    text: 'text-blue-500', 
    desc: 'PENDIENTES' 
  },
  { 
    id: TABS.NEW_INSPECTION, 
    label: 'Inspección', 
    icon: Activity, 
    color: 'bg-primary', 
    text: 'text-primary', 
    desc: 'NUEVA' 
  },
  { 
    id: TABS.EXPENSES, 
    label: 'Gastos', 
    icon: Receipt, 
    color: 'bg-yellow-500', 
    text: 'text-yellow-500', 
    desc: 'CONTROL DIARIO' 
  },
  { 
    id: TABS.PROFILE, 
    label: 'Perfil', 
    icon: User, 
    color: 'bg-slate-800', 
    text: 'text-slate-400', 
    desc: 'IDENTIDAD' 
  },
];

export default TABS;
