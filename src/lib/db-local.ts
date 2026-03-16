import Dexie, { type Table } from 'dexie';

/**
 * @fileOverview Arquitectura de base de datos local (IndexedDB) para Energy Engine.
 * Utiliza Dexie.js para gestionar el almacenamiento persistente en el dispositivo del técnico,
 * permitiendo el funcionamiento offline-first y la sincronización posterior con Firebase.
 */

// --- INTERFACES DE DATOS LOCALES ---

export interface HojaTrabajoLocal {
  id?: number;           // Clave primaria autoincremental local
  firebaseId?: string;   // ID del documento en Firestore (ej: 2026-AG-001)
  synced: boolean;       // Estado de sincronización
  data: any;             // El objeto completo del informe
  createdAt: Date;       // Fecha de creación local
}

export interface RegistroJornadaLocal {
  id?: number;
  firebaseId?: string;
  synced: boolean;
  data: any;
  createdAt: Date;
}

export interface GastoLocal {
  id?: number;
  firebaseId?: string;
  synced: boolean;
  data: any;
  createdAt: Date;
}

export interface GastoReportLocal {
  id?: number;
  firebaseId?: string;
  synced: boolean;
  data: any;
  createdAt: Date;
}

export interface LocalConfig {
  key: string;           // Ej: 'contador_hoja-trabajo', 'pin_hash', 'user_id'
  value: any;            // El valor del contador o el hash
}

export interface ClienteCache {
  id: string;            // ID de Firestore
  nombre: string;        // Nombre comercial
  direccion?: string;
}

// --- CLASE DE BASE DE DATOS ---

export class LocalDB extends Dexie {
  hojas_trabajo!: Table<HojaTrabajoLocal>;
  registros_jornada!: Table<RegistroJornadaLocal>;
  gastos!: Table<GastoLocal>;
  gastos_report!: Table<GastoReportLocal>;
  configuracion!: Table<LocalConfig>;
  clientes_cache!: Table<ClienteCache>;
  seguridad!: Table<any>;

  constructor() {
    super('EnergyEngineDB');

    this.version(4).stores({
      hojas_trabajo: '++id, firebaseId, synced, createdAt',
      registros_jornada: '++id, firebaseId, synced, createdAt',
      gastos: '++id, firebaseId, synced, createdAt, [data.stopId]', 
      gastos_report: '++id, firebaseId, synced, createdAt',
      configuracion: 'key',
      clientes_cache: 'id, nombre',
      seguridad: 'email'
    });
  }

  /**
   * Obtiene y aumenta el contador para un tipo de documento, reiniciándose cada año
   */
  async getNextSequence(type: string): Promise<number> {
    const year = new Date().getFullYear();
    const key = `contador_${type}_${year}`;
    const config = await this.configuracion.get(key);
    const nextValue = (config?.value || 0) + 1;
    await this.configuracion.put({ key, value: nextValue });
    return nextValue;
  }
}

export const db = new LocalDB();
