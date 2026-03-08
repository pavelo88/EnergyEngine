
import React from 'react';

// --- TABS DEL MENÚ PRINCIPAL ---
export const TasksTabLazy = React.lazy(() => 
  import('./components/HistoryTab').then(module => ({ default: module.default }))
);
export const RegistroJornadaForm = React.lazy(() => 
  import('./components/RegistroJornadaForm').then(module => ({ default: module.default }))
);
export const ProfileTabLazy = React.lazy(() => 
  import('./components/ProfileTab').then(module => ({ default: module.default }))
);

// --- FORMULARIOS DE INSPECCIÓN (NUEVOS) ---
export const HojaTrabajoFormLazy = React.lazy(() =>
  import('./components/forms/HojaTrabajoForm').then(module => ({ default: module.default }))
);
export const InformeTecnicoFormLazy = React.lazy(() =>
  import('./components/forms/InformeTrabajoForm').then(module => ({ default: module.default }))
);
export const InformeRevisionFormLazy = React.lazy(() =>
  import('./components/forms/InformeRevisionForm').then(module => ({ default: module.default }))
);
export const InformeSimplificadoFormLazy = React.lazy(() =>
  import('./components/forms/InformeSimplificadoForm').then(module => ({ default: module.default }))
);
