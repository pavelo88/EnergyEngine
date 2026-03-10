import Dexie, { type Table } from 'dexie';

// Define la estructura de los datos que guardaremos en cada tabla.
// Esto nos da autocompletado y seguridad de tipos.
export interface HojaTrabajoLocal {
  id?: number; // Clave primaria autoincremental
  firebaseId?: string; // El ID que tendrá en Firebase una vez sincronizado
  synced: boolean; // Flag para el motor de sincronización
  data: any; // Aquí irá el objeto completo del formulario
  createdAt: Date;
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


// Creamos nuestra clase de base de datos que extiende de Dexie
export class LocalDB extends Dexie {
  // Las '!' indican a TypeScript que estas propiedades serán inicializadas en el constructor.
  hojas_trabajo!: Table<HojaTrabajoLocal>;
  registros_jornada!: Table<RegistroJornadaLocal>;
  gastos!: Table<GastoLocal>;

  constructor() {
    // El nombre 'EnergyEngineDB' es como se llamará el archivo de IndexedDB en el navegador.
    super('EnergyEngineDB');
    this.version(1).stores({
      // Definimos los 'índices' para búsquedas eficientes.
      // '++id' es la clave primaria autoincremental.
      // '*synced' nos permite buscar rápidamente todos los registros no sincronizados.
      hojas_trabajo: '++id, firebaseId, *synced',
      registros_jornada: '++id, firebaseId, *synced',
      gastos: '++id, firebaseId, *synced'
    });
  }
}

// Exportamos una única instancia de nuestra base de datos para usarla en toda la app.
export const db = new LocalDB();
