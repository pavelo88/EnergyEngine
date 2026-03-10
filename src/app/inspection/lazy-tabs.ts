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

// --- FORMULARIOS DE INSPECCIÓN ---
export const HojaTrabajoFormLazy = React.lazy(() =>
  import('./components/forms/HojaTrabajoForm').then(module => ({ default: module.default }))
);

// CORRECCIÓN 1: Ahora apunta correctamente a InformeTecnicoForm
export const InformeTecnicoFormLazy = React.lazy(() =>
  import('./components/forms/InformeTecnicoForm').then(module => ({ default: module.default }))
);

export const InformeRevisionFormLazy = React.lazy(() =>
  import('./components/forms/InformeRevisionForm').then(module => ({ default: module.default }))
);

export const InformeSimplificadoFormLazy = React.lazy(() =>
  import('./components/forms/InformeSimplificadoForm').then(module => ({ default: module.default }))
);

// CORRECCIÓN 2: Se agregó la Revisión Básica que faltaba en el mapeo
export const RevisionBasicaFormLazy = React.lazy(() =>
  import('./components/forms/RevisionBasicaForm').then(module => ({ default: module.default }))
);