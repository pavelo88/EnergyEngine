
import React from 'react';

// --- TABS DEL MENÚ PRINCIPAL ---
export const TasksTabLazy = React.lazy(() => 
  import('./components/TasksTab').then(module => ({ default: module.default }))
);
export const RegistroJornadaForm = React.lazy(() => 
  import('./components/RegistroJornadaForm').then(module => ({ default: module.default }))
);
export const ProfileTabLazy = React.lazy(() => 
  import('./components/ProfileTab').then(module => ({ default: module.default }))
);

// --- FORMULARIOS DE INSPECCIÓN (NUEVOS) ---
export const AlbaranFormLazy = React.lazy(() =>
  import('./components/forms/AlbaranForm').then(module => ({ default: module.default }))
);
export const InformeTecnicoFormLazy = React.lazy(() =>
  import('./components/forms/InformeTrabajoForm').then(module => ({ default: module.default }))
);
export const HojaRevisionFormLazy = React.lazy(() =>
  import('./components/forms/HojaRevisionForm').then(module => ({ default: module.default }))
);
export const RevisionBasicaFormLazy = React.lazy(() =>
  import('./components/forms/RevisionBasicaForm').then(module => ({ default: module.default }))
);
