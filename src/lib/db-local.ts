import Dexie, { type Table } from 'dexie';

/**
 * @fileOverview Arquitectura de base de datos local (IndexedDB) para Energy Engine.
 * Utiliza Dexie.js para gestionar el almacenamiento persistente en el dispositivo del técnico,
 * permitiendo el funcionamiento offline-first y la sincronización posterior con Firebase.
 */

// --- INTERFACES DE DATOS LOCALES ---

export interface HojaTrabajoLocal {
  id?: number;           // Clave primaria autoincremental local
  firebaseId?: string;   // ID del documento en Firestore (una vez sincronizado)
  synced: boolean;       // Estado de sincronización
  data: any;             // El objeto completo del informe (Hoja, Revisión o Técnico)
  createdAt: Date;       // Fecha de creación local para ordenamiento
}

export interface RegistroJornadaLocal {
  id?: number;
  firebaseId?: string;
  synced: boolean;
  data: any;             // Datos de la jornada + firma del técnico
  createdAt: Date;
}

export interface GastoLocal {
  id?: number;
  firebaseId?: string;
  synced: boolean;
  data: any;             // Datos del gasto + referencia a la imagen/ticket
  createdAt: Date;
}

// --- CLASE DE BASE DE DATOS ---

export class LocalDB extends Dexie {
  // Definición de las tablas (stores)
  hojas_trabajo!: Table<HojaTrabajoLocal>;
  registros_jornada!: Table<RegistroJornadaLocal>;
  gastos!: Table<GastoLocal>;

  constructor() {
    // Nombre de la base de datos en el almacenamiento del navegador
    super('EnergyEngineDB');

    /**
     * Definición de esquemas e índices.
     * Indices:
     * - ++id: Clave primaria autoincremental.
     * - firebaseId: Para buscar registros vinculados a la nube.
     * - synced: Crucial para el motor de sincronización (filtra pendientes).
     * - createdAt: Para ordenar el historial cronológicamente en el dispositivo.
     */
    this.version(1).stores({
      hojas_trabajo: '++id, firebaseId, synced, createdAt',
      registros_jornada: '++id, firebaseId, synced, createdAt',
      gastos: '++id, firebaseId, synced, createdAt'
    });
  }
}

// Exportamos una única instancia singleton para toda la aplicación
export const db = new LocalDB();
