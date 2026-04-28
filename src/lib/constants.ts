export const OT_STATUS = {
  REGISTRADA: 'Registrada',
  EN_PROCESO: 'En Proceso',
  COMPLETADA: 'Completada',
  // Otros estados legacy o de uso misceláneo:
  ASIGNADO: 'Asignado',
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  ABIERTA: 'Abierta'
} as const;

// Lista de estados en los que una OT se considera "Activa" o "Abierta" (puede recibir horas, gastos o informes)
export const ACTIVE_OT_STATUSES = [
  OT_STATUS.ASIGNADO,
  OT_STATUS.PENDIENTE,
  OT_STATUS.EN_PROGRESO,
  OT_STATUS.EN_PROCESO,
  OT_STATUS.ABIERTA,
  OT_STATUS.REGISTRADA
];

// Lista de estados estándar de la app (para dropdowns y filtros)
export const STANDARD_OT_STATUSES = [
  OT_STATUS.REGISTRADA,
  OT_STATUS.EN_PROCESO,
  OT_STATUS.COMPLETADA
];
